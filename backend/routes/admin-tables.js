import express from 'express';
import mariadb from 'mariadb';
import dotenv from 'dotenv';

dotenv.config();

// Database connection pool
const db = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

const router = express.Router();

// Middleware to ensure only admins can access these routes
const adminOnlyMiddleware = async (req, res, next) => {
  console.log('=== ADMIN MIDDLEWARE DEBUG ===');
  console.log('Request user object:', req.user);
  console.log('Role check:', req.user?.role);
  
  if (!req.user || req.user.role !== 'admin') {
    console.log('Access denied - not an admin');
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  console.log('Access granted - user is admin');
  next();
};

// Helper function to get table name based on entity
const getTableName = (entity) => {
  const tableMap = {
    'brand': 'brand',
    'color': 'color',
    'company': 'company',
    'continent': 'continent',
    'country': 'country',
    'currency': 'currency',
    'district': 'district',
    'locality': 'locality',
    'material': 'material',
    'model': 'model',
    'product': 'product',
    'productcategory': 'productcategory',
    'productsubcategory': 'productsubcategory',
    'shape': 'shape',
    'size': 'size',
    'state': 'state',
    'unit': 'unit'
  };
  return tableMap[entity.toLowerCase()];
};

// Helper function to get primary key field for each table
const getPrimaryKeyField = (entity) => {
  const primaryKeyMap = {
    'brand': 'BrandId',
    'color': 'ColorId',
    'company': 'CompanyId',
    'continent': 'ContinentId',
    'country': 'CountryId',
    'currency': 'CurrencyId',
    'district': 'DistrictId',
    'locality': 'LocalityId',
    'material': 'MaterialId',
    'model': 'ModelId',
    'product': 'ProductId',
    'productcategory': 'ProductCategoryId',
    'productsubcategory': 'ProductSubCategoryId',
    'shape': 'ShapeId',
    'size': 'SizeId',
    'state': 'StateId',
    'unit': 'UnitId'
  };
  return primaryKeyMap[entity.toLowerCase()];
};

// Helper function to get table fields for sorting
const getTableFields = (entity) => {
  const fieldMap = {
    'brand': ['BrandId', 'Brand'],
    'color': ['ColorId', 'Color'],
    'company': ['CompanyId', 'Company'],
    'continent': ['ContinentId', 'Continent'],
    'country': ['CountryId', 'Country'],
    'currency': ['CurrencyId', 'Currency'],
    'district': ['DistrictId', 'District'],
    'locality': ['LocalityId', 'Locality'],
    'material': ['MaterialId', 'Material'],
    'model': ['ModelId', 'Model'],
    'product': ['ProductId', 'Product'],
    'productcategory': ['ProductCategoryId', 'ProductCategory'],
    'productsubcategory': ['ProductSubCategoryId', 'ProductSubCategory'],
    'shape': ['ShapeId', 'Shape'],
    'size': ['SizeId', 'Size'],
    'state': ['StateId', 'State'],
    'unit': ['UnitId', 'Unit']
  };
  return fieldMap[entity.toLowerCase()];
};

// Get all records for a specific table with pagination
router.get('/:entity', adminOnlyMiddleware, async (req, res) => {
  try {
    console.log('=== ADMIN-TABLES DEBUG ===');
    console.log('Request received for entity:', req.params.entity);
    console.log('Query params:', req.query);
    console.log('Request headers:', req.headers);
    
    const entity = req.params.entity;
    const tableName = getTableName(entity);
    
    console.log('Resolved entity:', entity);
    console.log('Resolved table name:', tableName);
    
    if (!tableName) {
      console.log('Invalid entity type:', entity);
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    console.log(`Fetching from table ${tableName}, page: ${page}, limit: ${limit}, offset: ${offset}`);

    let conn;
    try {
      conn = await db.getConnection();
      
      // Count total records
      const countResult = await conn.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const totalCount = typeof countResult[0].count === 'bigint' ? Number(countResult[0].count) : countResult[0].count;
      
      console.log(`Total records in ${tableName}:`, totalCount);
      
      // Get paginated records
      const records = await conn.query(
        `SELECT * FROM ${tableName} ORDER BY ${getTableFields(entity)[0]} DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      console.log(`Successfully fetched ${records.length} records from ${tableName}`);

      // Convert BigInt values to numbers for JSON serialization
      const serializedRecords = records.map(record => {
        const serializedRecord = {};
        for (const [key, value] of Object.entries(record)) {
          serializedRecord[key] = typeof value === 'bigint' ? Number(value) : value;
        }
        return serializedRecord;
      });
      
      // Ensure all values used in calculations are numbers
      const pageNum = typeof page === 'number' ? page : parseInt(page);
      const limitNum = typeof limit === 'number' ? limit : parseInt(limit);
      const totalCountNum = typeof totalCount === 'number' ? totalCount : Number(totalCount);
      
      res.json({
        records: serializedRecords,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCountNum / limitNum),
          totalRecords: totalCountNum,
          hasNext: pageNum < Math.ceil(totalCountNum / limitNum),
          hasPrev: pageNum > 1
        }
      });
    } finally {
      if (conn) conn.release();
    }
  } catch (err) {
    console.error(`Error fetching ${req.params.entity}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific record by ID
router.get('/:entity/:id', adminOnlyMiddleware, async (req, res) => {
  try {
    const entity = req.params.entity;
    const id = req.params.id;
    const tableName = getTableName(entity);
    const primaryKey = getPrimaryKeyField(entity);
    
    if (!tableName || !primaryKey) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    let conn;
    try {
      conn = await db.getConnection();
      
      const record = await conn.query(
        `SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`,
        [id]
      );

      if (record.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }

      // Convert BigInt values to numbers for JSON serialization
      const serializedRecord = {};
      for (const [key, value] of Object.entries(record[0])) {
        serializedRecord[key] = typeof value === 'bigint' ? Number(value) : value;
      }
      res.json(serializedRecord);
    } finally {
      if (conn) conn.release();
    }
  } catch (err) {
    console.error(`Error fetching ${req.params.entity} by ID:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get reference data for dropdowns
router.get('/:entity/:id/references', adminOnlyMiddleware, async (req, res) => {
  try {
    const entity = req.params.entity;
    const tableName = getTableName(entity);
    
    if (!tableName) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    let conn;
    try {
      conn = await db.getConnection();
      
      // Define reference mappings
      const referenceQueries = {
        'product': [
          { table: 'productcategory', idField: 'ProductCategoryId', nameField: 'ProductCategory' },
          { table: 'productsubcategory', idField: 'ProductSubCategoryId', nameField: 'ProductSubCategory' },
          { table: 'model', idField: 'ModelId', nameField: 'Model' },
          { table: 'unit', idField: 'UnitId', nameField: 'Unit' },
          { table: 'currency', idField: 'CurrencyId', nameField: 'Currency' },
          { table: 'color', idField: 'ColorId', nameField: 'Color' },
          { table: 'size', idField: 'SizeId', nameField: 'Size' },
          { table: 'shape', idField: 'ShapeId', nameField: 'Shape' }
        ],
        'model': [
          { table: 'brand', idField: 'BrandId', nameField: 'Brand' },
          { table: 'material', idField: 'MaterialId', nameField: 'Material' }
        ],
        'brand': [
          { table: 'company', idField: 'CompanyId', nameField: 'Company' }
        ],
        'company': [
          { table: 'locality', idField: 'LocalityId', nameField: 'Locality' }
        ],
        'country': [
          { table: 'continent', idField: 'ContinentId', nameField: 'Continent' }
        ],
        'state': [
          { table: 'country', idField: 'CountryId', nameField: 'Country' }
        ],
        'district': [
          { table: 'state', idField: 'StateId', nameField: 'State' }
        ],
        'locality': [
          { table: 'district', idField: 'DistrictId', nameField: 'District' }
        ],
        'productsubcategory': [
          { table: 'productcategory', idField: 'ProductCategoryId', nameField: 'ProductCategory' }
        ]
      };

      const references = {};
      if (referenceQueries[entity]) {
        for (const ref of referenceQueries[entity]) {
          const refData = await conn.query(
            `SELECT ${ref.idField} as id, ${ref.nameField} as name FROM ${ref.table} WHERE IsDeleted != 'Y' ORDER BY ${ref.nameField}`
          );
          references[ref.table] = refData;
        }
      }

      res.json(references);
    } finally {
      if (conn) conn.release();
    }
  } catch (err) {
    console.error(`Error fetching references for ${req.params.entity}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new record
router.post('/:entity', adminOnlyMiddleware, async (req, res) => {
  try {
    const entity = req.params.entity;
    const tableName = getTableName(entity);
    const primaryKey = getPrimaryKeyField(entity);
    
    if (!tableName || !primaryKey) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const inputData = req.body;

    // Remove primary key if present in input
    const { [primaryKey]: _, ...data } = inputData;

    // Build query dynamically
    const fields = Object.keys(data);
    const values = Object.values(data);

    // Set default values for audit fields
    data.RecordCreationTimeStamp = new Date();
    data.LastUpdationTimeStamp = new Date();
    data.RecordCreationLogin = req.user.UserId || '';
    data.LastUpdationLogin = req.user.UserId || '';
    data.IsDeleted = '';

    // Update fields and values with audit fields
    const finalFields = Object.keys(data);
    const finalValues = Object.values(data);

    let conn;
    try {
      conn = await db.getConnection();
      
      const placeholders = finalValues.map(() => '?').join(',');
      const query = `INSERT INTO ${tableName} (${finalFields.join(', ')}) VALUES (${placeholders})`;
      
      const result = await conn.query(query, finalValues);

      // Fetch the created record
      const createdRecord = await conn.query(
        `SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`,
        [result.insertId]
      );

      // Convert BigInt values to numbers for JSON serialization
      const serializedRecord = {};
      for (const [key, value] of Object.entries(createdRecord[0])) {
        serializedRecord[key] = typeof value === 'bigint' ? Number(value) : value;
      }
      res.status(201).json(serializedRecord);
    } finally {
      if (conn) conn.release();
    }
  } catch (err) {
    console.error(`Error creating ${req.params.entity}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update an existing record
router.put('/:entity/:id', adminOnlyMiddleware, async (req, res) => {
  try {
    const entity = req.params.entity;
    const id = req.params.id;
    const tableName = getTableName(entity);
    const primaryKey = getPrimaryKeyField(entity);
    
    if (!tableName || !primaryKey) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const inputData = req.body;

    // Remove primary key if present in input
    const { [primaryKey]: _, ...data } = inputData;

    // Update audit fields
    data.LastUpdationTimeStamp = new Date();
    data.LastUpdationLogin = req.user.UserId || '';

    let conn;
    try {
      conn = await db.getConnection();
      
      const fields = Object.keys(data);
      const values = Object.values(data);
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const query = `UPDATE ${tableName} SET ${setClause} WHERE ${primaryKey} = ?`;
      
      await conn.query(query, [...values, id]);

      // Fetch the updated record
      const updatedRecord = await conn.query(
        `SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`,
        [id]
      );

      if (updatedRecord.length === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }

      // Convert BigInt values to numbers for JSON serialization
      const serializedRecord = {};
      for (const [key, value] of Object.entries(updatedRecord[0])) {
        serializedRecord[key] = typeof value === 'bigint' ? Number(value) : value;
      }
      res.json(serializedRecord);
    } finally {
      if (conn) conn.release();
    }
  } catch (err) {
    console.error(`Error updating ${req.params.entity}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Soft delete a record
router.delete('/:entity/:id', adminOnlyMiddleware, async (req, res) => {
  try {
    const entity = req.params.entity;
    const id = req.params.id;
    const tableName = getTableName(entity);
    const primaryKey = getPrimaryKeyField(entity);
    
    if (!tableName || !primaryKey) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    let conn;
    try {
      conn = await db.getConnection();
      
      // Check if table has IsDeleted field
      const tableInfo = await conn.query(`DESCRIBE ${tableName}`);
      const hasIsDeleted = tableInfo.some(col => col.Field === 'IsDeleted');
      
      if (hasIsDeleted) {
        // Perform soft delete
        await conn.query(
          `UPDATE ${tableName} SET IsDeleted = 'Y', LastUpdationTimeStamp = ?, LastUpdationLogin = ? WHERE ${primaryKey} = ?`,
          [new Date(), req.user.UserId || '', id]
        );
      } else {
        // Hard delete if no IsDeleted field
        await conn.query(
          `DELETE FROM ${tableName} WHERE ${primaryKey} = ?`,
          [id]
        );
      }

      res.json({ message: 'Record deleted successfully' });
    } finally {
      if (conn) conn.release();
    }
  } catch (err) {
    console.error(`Error deleting ${req.params.entity}:`, err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;