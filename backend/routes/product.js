import express from 'express';
import { db } from '../index.js';

const router = express.Router();

// List all products with images and categories
router.get('/', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // Get products with category and subcategory info (matching actual schema)
    const [products] = await conn.query(`
      SELECT 
        p.*,
        pc.ProductCategory,
        psc.ProductSubCategory,
        m.Model,
        c.Color,
        s.Size
      FROM Product p
      LEFT JOIN ProductCategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      LEFT JOIN ProductSubCategory psc ON p.ProductSubCategory = psc.ProductSubCategoryId
      LEFT JOIN Model m ON p.Model = m.ModelId
      LEFT JOIN Color c ON p.Color = c.ColorId
      LEFT JOIN Size s ON p.Size = s.SizeId
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

// Get product details by id with images
router.get('/:id', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // Get product with category and subcategory info (matching actual schema)
    const [products] = await conn.query(`
      SELECT 
        p.*,
        pc.ProductCategory,
        psc.ProductSubCategory,
        m.Model,
        c.Color,
        s.Size
      FROM Product p
      LEFT JOIN ProductCategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      LEFT JOIN ProductSubCategory psc ON p.ProductSubCategory = psc.ProductSubCategoryId
      LEFT JOIN Model m ON p.Model = m.ModelId
      LEFT JOIN Color c ON p.Color = c.ColorId
      LEFT JOIN Size s ON p.Size = s.SizeId
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
    
    conn.release();
    res.json({ product });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get products by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    const [products] = await conn.query(`
      SELECT 
        p.*,
        pc.ProductCategory,
        psc.ProductSubCategory,
        m.Model,
        c.Color,
        s.Size
      FROM Product p
      LEFT JOIN ProductCategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      LEFT JOIN ProductSubCategory psc ON p.ProductSubCategory = psc.ProductSubCategoryId
      LEFT JOIN Model m ON p.Model = m.ModelId
      LEFT JOIN Color c ON p.Color = c.ColorId
      LEFT JOIN Size s ON p.Size = s.SizeId
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
    const [subcategories] = await conn.query('SELECT * FROM ProductSubCategory WHERE ProductCategory = ?', [req.params.categoryId]);
    conn.release();
    res.json({ subcategories });
  } catch (err) {
    console.error('Error fetching subcategories:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 