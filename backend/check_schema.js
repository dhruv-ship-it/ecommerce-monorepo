import mariadb from 'mariadb';
import dotenv from 'dotenv';
dotenv.config();

const db = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

async function checkSchema() {
  let conn;
  try {
    conn = await db.getConnection();
    
    console.log('=== PRODUCTCATEGORY TABLE STRUCTURE ===');
    const categoryCols = await conn.query('DESCRIBE productcategory');
    categoryCols.forEach(col => {
      console.log(`${col.Field}: ${col.Type}, ${col.Null}, ${col.Key}, ${col.Extra}`);
    });

    console.log('\n=== PRODUCTSUBCATEGORY TABLE STRUCTURE ===');
    const subcategoryCols = await conn.query('DESCRIBE productsubcategory');
    subcategoryCols.forEach(col => {
      console.log(`${col.Field}: ${col.Type}, ${col.Null}, ${col.Key}, ${col.Extra}`);
    });

    console.log('\n=== PRODUCT TABLE STRUCTURE (relevant fields) ===');
    const productCols = await conn.query('DESCRIBE product');
    const relevantProductCols = ['ProductCategory_Gen', 'ProductSubCategory'];
    for (const colName of relevantProductCols) {
      const col = productCols.find(c => c.Field === colName);
      if (col) {
        console.log(`${col.Field}: ${col.Type}, ${col.Null}, ${col.Key}, ${col.Extra}`);
      }
    }

    console.log('\n=== SAMPLE DATA FOR PROBLEMATIC RELATIONSHIPS ===');
    // Get some sample data to see the relationships
    const sampleProducts = await conn.query(`
      SELECT 
        ProductId,
        Product,
        ProductCategory_Gen,
        ProductSubCategory
      FROM product 
      LIMIT 5
    `);
    console.log('Sample products with category/subcategory IDs:');
    sampleProducts.forEach(p => {
      console.log(`  Product ${p.ProductId} (${p.Product}): Category=${p.ProductCategory_Gen}, SubCategory=${p.ProductSubCategory}`);
    });

    // Get corresponding categories
    const sampleCategories = await conn.query('SELECT * FROM productcategory LIMIT 5');
    console.log('\nSample categories:');
    sampleCategories.forEach(cat => {
      console.log(`  Cat ${cat.ProductCategoryId}: ${cat.ProductCategory}`);
    });

    // Get corresponding subcategories
    const sampleSubcategories = await conn.query('SELECT * FROM productsubcategory LIMIT 5');
    console.log('\nSample subcategories:');
    sampleSubcategories.forEach(subcat => {
      console.log(`  SubCat ${subcat.ProductSubCategoryId}: ${subcat.ProductSubCategory}`);
    });

    // Test the specific joins we're trying to make
    console.log('\n=== TESTING JOINS ===');
    const joinTest = await conn.query(`
      SELECT 
        p.ProductId,
        p.Product,
        p.ProductCategory_Gen,
        pc.ProductCategory,
        p.ProductSubCategory,
        psc.ProductSubCategory as SubCategoryName
      FROM product p
      LEFT JOIN productcategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      LEFT JOIN productsubcategory psc ON p.ProductSubCategory = psc.ProductSubCategoryId
      LIMIT 5
    `);
    console.log('Join test results:');
    joinTest.forEach(row => {
      console.log(`  Product: ${row.Product}, Category ID: ${row.ProductCategory_Gen}, Category Name: ${row.ProductCategory || 'NULL'}, SubCategory ID: ${row.ProductSubCategory}, SubCategory Name: ${row.SubCategoryName || 'NULL'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

checkSchema();