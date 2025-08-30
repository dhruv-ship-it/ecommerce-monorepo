import express from 'express';
import { db } from '../index.js';

const router = express.Router();

// List all products with complete information
router.get('/', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // Get products with complete information
    const [products] = await conn.query(`
      SELECT 
        p.*,
        pc.ProductCategory,
        psc.ProductSubCategory,
        m.Model,
        b.Brand,
        c.Color,
        s.Size,
        mt.Material,
        sh.Shape,
        u.Unit,
        cur.Currency
      FROM Product p
      LEFT JOIN ProductCategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      LEFT JOIN ProductSubCategory psc ON p.ProductSubCategory = psc.ProductSubCategoryId
      LEFT JOIN Model m ON p.Model = m.ModelId
      LEFT JOIN Brand b ON m.Brand = b.BrandId
      LEFT JOIN Color c ON p.Color = c.ColorId
      LEFT JOIN Size s ON p.Size = s.SizeId
      LEFT JOIN Material mt ON p.Material = mt.MaterialId
      LEFT JOIN Shape sh ON p.Shape = sh.ShapeId
      LEFT JOIN Unit u ON p.Unit = u.UnitId
      LEFT JOIN Currency cur ON p.Currency = cur.CurrencyId
      WHERE p.IsDeleted = '' OR p.IsDeleted = 'N'
      ORDER BY p.ProductId DESC
    `);
    
    // Get images for each product
    for (let product of products) {
      const [images] = await conn.query(`
        SELECT ImageType, ImagePath, ImageOrder 
        FROM product_images 
        WHERE ProductId = ? AND IsActive = 'Y' 
        ORDER BY ImageOrder
      `, [product.ProductId]);
      
      product.images = images;
      
      // Find thumbnail and main image
      product.thumbnail = images.find(img => img.ImageType === 'thumbnail')?.ImagePath || '/placeholder.svg';
      product.mainImage = images.find(img => img.ImageType === 'main')?.ImagePath || '/placeholder.svg';
      product.galleryImages = images.filter(img => img.ImageType === 'gallery').map(img => img.ImagePath);
    }
    
    conn.release();
    res.json({ products });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get product details by id with complete information
router.get('/:id', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // Get product with complete information
    const [products] = await conn.query(`
      SELECT 
        p.*,
        pc.ProductCategory,
        psc.ProductSubCategory,
        m.Model,
        b.Brand,
        c.Color,
        s.Size,
        mt.Material,
        sh.Shape,
        u.Unit,
        cur.Currency
      FROM Product p
      LEFT JOIN ProductCategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      LEFT JOIN ProductSubCategory psc ON p.ProductSubCategory = psc.ProductSubCategoryId
      LEFT JOIN Model m ON p.Model = m.ModelId
      LEFT JOIN Brand b ON m.Brand = b.BrandId
      LEFT JOIN Color c ON p.Color = c.ColorId
      LEFT JOIN Size s ON p.Size = s.SizeId
      LEFT JOIN Material mt ON p.Material = mt.MaterialId
      LEFT JOIN Shape sh ON p.Shape = sh.ShapeId
      LEFT JOIN Unit u ON p.Unit = u.UnitId
      LEFT JOIN Currency cur ON p.Currency = cur.CurrencyId
      WHERE p.ProductId = ? AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
    `, [req.params.id]);
    
    if (!products || products.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = products[0];
    
    // Get all images for this product
    const [images] = await conn.query(`
      SELECT ImageType, ImagePath, ImageOrder 
      FROM product_images 
      WHERE ProductId = ? AND IsActive = 'Y' 
      ORDER BY ImageOrder
    `, [req.params.id]);
    
    product.images = images;
    product.thumbnail = images.find(img => img.ImageType === 'thumbnail')?.ImagePath || '/placeholder.svg';
    product.mainImage = images.find(img => img.ImageType === 'main')?.ImagePath || '/placeholder.svg';
    product.galleryImages = images.filter(img => img.ImageType === 'gallery').map(img => img.ImagePath);
    
    // Get all variants (other sizes and colors) of the same model
    const [variants] = await conn.query(`
      SELECT 
        p.*,
        c.Color,
        s.Size,
        mt.Material
      FROM Product p
      LEFT JOIN Color c ON p.Color = c.ColorId
      LEFT JOIN Size s ON p.Size = s.SizeId
      LEFT JOIN Material mt ON p.Material = mt.MaterialId
      WHERE p.Model = ? AND p.ProductId != ? AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
      ORDER BY p.ProductId
    `, [product.Model, req.params.id]);
    
    product.variants = variants;
    
    conn.release();
    res.json({ product });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get products by category with complete information
router.get('/category/:categoryId', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    const [products] = await conn.query(`
      SELECT 
        p.*,
        pc.ProductCategory,
        psc.ProductSubCategory,
        m.Model,
        b.Brand,
        c.Color,
        s.Size,
        mt.Material,
        sh.Shape,
        u.Unit,
        cur.Currency
      FROM Product p
      LEFT JOIN ProductCategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      LEFT JOIN ProductSubCategory psc ON p.ProductSubCategory = psc.ProductSubCategoryId
      LEFT JOIN Model m ON p.Model = m.ModelId
      LEFT JOIN Brand b ON m.Brand = b.BrandId
      LEFT JOIN Color c ON p.Color = c.ColorId
      LEFT JOIN Size s ON p.Size = s.SizeId
      LEFT JOIN Material mt ON p.Material = mt.MaterialId
      LEFT JOIN Shape sh ON p.Shape = sh.ShapeId
      LEFT JOIN Unit u ON p.Unit = u.UnitId
      LEFT JOIN Currency cur ON p.Currency = cur.CurrencyId
      WHERE p.ProductCategory_Gen = ? AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
      ORDER BY p.ProductId DESC
    `, [req.params.categoryId]);
    
    // Get images for each product
    for (let product of products) {
      const [images] = await conn.query(`
        SELECT ImageType, ImagePath, ImageOrder 
        FROM product_images 
        WHERE ProductId = ? AND IsActive = 'Y' 
        ORDER BY ImageOrder
      `, [product.ProductId]);
      
      product.images = images;
      product.thumbnail = images.find(img => img.ImageType === 'thumbnail')?.ImagePath || '/placeholder.svg';
      product.mainImage = images.find(img => img.ImageType === 'main')?.ImagePath || '/placeholder.svg';
    }
    
    conn.release();
    res.json({ products });
  } catch (err) {
    console.error('Error fetching products by category:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get product categories
router.get('/categories/all', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [categories] = await conn.query('SELECT * FROM ProductCategory WHERE IsDeleted = "" OR IsDeleted = "N"');
    conn.release();
    res.json({ categories });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get subcategories by category
router.get('/subcategories/:categoryId', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [subcategories] = await conn.query('SELECT * FROM ProductSubCategory WHERE ProductCategory = ? AND (IsDeleted = "" OR IsDeleted = "N")', [req.params.categoryId]);
    conn.release();
    res.json({ subcategories });
  } catch (err) {
    console.error('Error fetching subcategories:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all brands
router.get('/brands/all', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [brands] = await conn.query('SELECT * FROM Brand WHERE IsDeleted = "" OR IsDeleted = "N"');
    conn.release();
    res.json({ brands });
  } catch (err) {
    console.error('Error fetching brands:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all colors
router.get('/colors/all', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [colors] = await conn.query('SELECT * FROM Color WHERE IsDeleted = "" OR IsDeleted = "N" ORDER BY Color');
    conn.release();
    res.json({ colors });
  } catch (err) {
    console.error('Error fetching colors:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all sizes
router.get('/sizes/all', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [sizes] = await conn.query('SELECT * FROM Size WHERE IsDeleted = "" OR IsDeleted = "N" ORDER BY Size');
    conn.release();
    res.json({ sizes });
  } catch (err) {
    console.error('Error fetching sizes:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all materials
router.get('/materials/all', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [materials] = await conn.query('SELECT * FROM Material WHERE IsDeleted = "" OR IsDeleted = "N" ORDER BY Material');
    conn.release();
    res.json({ materials });
  } catch (err) {
    console.error('Error fetching materials:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get products by model with all variants (colors, sizes)
router.get('/model/:modelId', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // Get model info
    const [modelInfo] = await conn.query(`
      SELECT m.*, b.Brand, pc.ProductCategory, psc.ProductSubCategory
      FROM Model m
      LEFT JOIN Brand b ON m.Brand = b.BrandId
      LEFT JOIN Product p ON p.Model = m.ModelId
      LEFT JOIN ProductCategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      LEFT JOIN ProductSubCategory psc ON p.ProductSubCategory = psc.ProductSubCategoryId
      WHERE m.ModelId = ? AND (m.IsDeleted = "" OR m.IsDeleted = "N")
      LIMIT 1
    `, [req.params.modelId]);
    
    if (!modelInfo || modelInfo.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Model not found' });
    }
    
    // Get all products for this model
    const [products] = await conn.query(`
      SELECT 
        p.*,
        c.Color,
        s.Size,
        mt.Material,
        sh.Shape,
        u.Unit,
        cur.Currency
      FROM Product p
      LEFT JOIN Color c ON p.Color = c.ColorId
      LEFT JOIN Size s ON p.Size = s.SizeId
      LEFT JOIN Material mt ON p.Material = mt.MaterialId
      LEFT JOIN Shape sh ON p.Shape = sh.ShapeId
      LEFT JOIN Unit u ON p.Unit = u.UnitId
      LEFT JOIN Currency cur ON p.Currency = cur.CurrencyId
      WHERE p.Model = ? AND (p.IsDeleted = "" OR p.IsDeleted = "N")
      ORDER BY p.ProductId
    `, [req.params.modelId]);
    
    // Get images for each product
    for (let product of products) {
      const [images] = await conn.query(`
        SELECT ImageType, ImagePath, ImageOrder 
        FROM product_images 
        WHERE ProductId = ? AND IsActive = 'Y' 
        ORDER BY ImageOrder
      `, [product.ProductId]);
      
      product.images = images;
      product.thumbnail = images.find(img => img.ImageType === 'thumbnail')?.ImagePath || '/placeholder.svg';
      product.mainImage = images.find(img => img.ImageType === 'main')?.ImagePath || '/placeholder.svg';
    }
    
    conn.release();
    res.json({ 
      model: modelInfo[0], 
      products 
    });
  } catch (err) {
    console.error('Error fetching model products:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 