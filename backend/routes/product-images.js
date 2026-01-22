import express from 'express';
import { db } from '../index.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// Get the current filename and directory for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Get product ID from request
    const productId = req.params.productId || req.body.productId || req.query.productId;
    if (productId) {
      // First, get the product name from the database to create the correct folder structure
      const conn = await db.getConnection();
      try {
        const productResult = await conn.query('SELECT Product FROM Product WHERE ProductId = ?', [productId]);
        conn.release();
        
        if (productResult.length === 0) {
          return cb(new Error('Product not found'), null);
        }
        
        // Create a slug from the product name
        const productName = productResult[0].Product;
        const productSlug = productName.toLowerCase()
          .replace(/[^\w\s-]/g, '') // Remove special characters
          .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
          .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
        
        // Create directory structure: /static/images/products/{product-slug}/
        const uploadDir = path.join(__dirname, '..', 'static', 'images', 'products', productSlug);
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        console.error('Error getting product info:', error);
        conn.release();
        // Fallback to temp directory
        const tempDir = path.join(__dirname, '..', 'static', 'images', 'products', 'temp');
        await fs.mkdir(tempDir, { recursive: true });
        cb(null, tempDir);
      }
    } else {
      cb(null, path.join(__dirname, '..', 'static', 'images', 'products', 'temp'));
    }
  },
  filename: (req, file, cb) => {
    // Get image type from request
    const imageType = req.body.imageType || req.query.imageType || 'gallery';
    
    // Generate filename based on type
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (imageType === 'thumbnail') {
      cb(null, `thumb${ext}`);
    } else if (imageType === 'main') {
      cb(null, `main${ext}`);
    } else {
      // For gallery images, create gallery subdirectory and use index
      const galleryIndex = req.body.galleryIndex || req.query.galleryIndex || '1';
      // Create gallery subdirectory if it doesn't exist
      const galleryDir = path.join(path.dirname(file.destination), 'gallery');
      fs.mkdir(galleryDir, { recursive: true }).catch(console.error);
      cb(null, `gallery${path.sep}${galleryIndex}${ext}`);
    }
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload image for a specific product
router.post('/product/:productId', upload.single('image'), async (req, res) => {
  try {
    const productId = req.params.productId;
    const imageType = req.body.imageType || req.query.imageType || 'gallery';
    const imageOrder = req.body.imageOrder || req.query.imageOrder || 0;
    
    // Validate image type
    if (!['thumbnail', 'main', 'gallery'].includes(imageType)) {
      return res.status(400).json({ error: 'Invalid image type. Must be thumbnail, main, or gallery.' });
    }
    
    // Check if product exists
    const conn = await db.getConnection();
    const productCheck = await conn.query('SELECT ProductId, Product FROM Product WHERE ProductId = ?', [productId]);
    
    if (productCheck.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // If file was uploaded successfully
    if (!req.file) {
      conn.release();
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Get the product name to create the correct path
    const productName = productCheck[0].Product;
    const productSlug = productName.toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    
    // Get the relative path for database storage
    const imagePath = `/static/images/products/${productSlug}/${req.file.path.substring(req.file.path.lastIndexOf(path.sep) + 1)}`;
    
    // Insert image record into product_images table
    await conn.query(`
      INSERT INTO product_images (ProductId, ImageType, ImagePath, ImageOrder, IsActive, IsDeleted)
      VALUES (?, ?, ?, ?, 'Y', '')
    `, [productId, imageType, imagePath, imageOrder]);
    
    conn.release();
    
    res.json({ 
      message: 'Image uploaded successfully', 
      imageId: req.file.filename,
      imagePath: imagePath,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload multiple images for a specific product (gallery images)
router.post('/product/:productId/gallery', upload.array('images', 10), async (req, res) => {
  try {
    const productId = req.params.productId;
    
    // Check if product exists
    const conn = await db.getConnection();
    const productCheck = await conn.query('SELECT ProductId, Product FROM Product WHERE ProductId = ?', [productId]);
    
    if (productCheck.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get the product name to create the correct path
    const productName = productCheck[0].Product;
    const productSlug = productName.toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    
    // If files were uploaded successfully
    if (!req.files || req.files.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Insert each image record into product_images table
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      // Get the filename from the uploaded file path
      const filename = file.path.substring(file.path.lastIndexOf(path.sep) + 1);
      const imagePath = `/static/images/products/${productSlug}/${filename}`;
      
      await conn.query(`
        INSERT INTO product_images (ProductId, ImageType, ImagePath, ImageOrder, IsActive, IsDeleted)
        VALUES (?, 'gallery', ?, ?, 'Y', '')
      `, [productId, imagePath, i + 1]);
    }
    
    conn.release();
    
    res.json({ 
      message: `${req.files.length} images uploaded successfully`,
      images: req.files.map(file => {
        const filename = file.path.substring(file.path.lastIndexOf(path.sep) + 1);
        const productName = productCheck[0].Product;
        const productSlug = productName.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
        const imagePath = `/static/images/products/${productSlug}/${filename}`;
        
        return {
          imageId: file.filename,
          imagePath: imagePath,
          originalName: file.originalname,
          size: file.size
        };
      })
    });
  } catch (err) {
    console.error('Error uploading images:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all images for a specific product
router.get('/product/:productId', async (req, res) => {
  try {
    const productId = req.params.productId;
    
    const conn = await db.getConnection();
    
    // Get all images for the product
    const images = await conn.query(`
      SELECT ImageId, ImageType, ImagePath, ImageOrder, IsActive
      FROM product_images
      WHERE ProductId = ? AND IsDeleted != 'Y'
      ORDER BY ImageOrder
    `, [productId]);
    
    conn.release();
    
    res.json({ images });
  } catch (err) {
    console.error('Error fetching images:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update an image (change type, order, or activate/deactivate)
router.put('/product/:productId/image/:imageId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const imageId = req.params.imageId;
    const { imageType, imageOrder, isActive } = req.body;
    
    // Validate image type if provided
    if (imageType && !['thumbnail', 'main', 'gallery'].includes(imageType)) {
      return res.status(400).json({ error: 'Invalid image type. Must be thumbnail, main, or gallery.' });
    }
    
    const conn = await db.getConnection();
    
    // Check if image exists and belongs to the product
    const imageCheck = await conn.query(`
      SELECT ImageId, ImagePath
      FROM product_images
      WHERE ImageId = ? AND ProductId = ?
    `, [imageId, productId]);
    
    if (imageCheck.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Image not found for this product' });
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    
    if (imageType !== undefined) {
      updates.push('ImageType = ?');
      values.push(imageType);
    }
    
    if (imageOrder !== undefined) {
      updates.push('ImageOrder = ?');
      values.push(imageOrder);
    }
    
    if (isActive !== undefined) {
      updates.push('IsActive = ?');
      values.push(isActive);
    }
    
    if (updates.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(imageId, productId); // Add parameters for WHERE clause
    
    await conn.query(`
      UPDATE product_images
      SET ${updates.join(', ')}
      WHERE ImageId = ? AND ProductId = ?
    `, values);
    
    conn.release();
    
    res.json({ message: 'Image updated successfully' });
  } catch (err) {
    console.error('Error updating image:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete an image (soft delete by setting IsDeleted = 'Y')
router.delete('/product/:productId/image/:imageId', async (req, res) => {
  try {
    const productId = req.params.productId;
    const imageId = req.params.imageId;
    
    const conn = await db.getConnection();
    
    // Get the image to check if it exists and get the file path
    const imageResult = await conn.query(`
      SELECT ImagePath
      FROM product_images
      WHERE ImageId = ? AND ProductId = ?
    `, [imageId, productId]);
    
    if (imageResult.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Image not found for this product' });
    }
    
    const imagePath = imageResult[0].ImagePath;
    
    // Soft delete the image record
    await conn.query(`
      UPDATE product_images
      SET IsDeleted = 'Y'
      WHERE ImageId = ? AND ProductId = ?
    `, [imageId, productId]);
    
    conn.release();
    
    // Try to delete the physical file as well
    try {
      const absolutePath = path.join(__dirname, '..', imagePath);
      await fs.unlink(absolutePath);
    } catch (fileErr) {
      console.warn('Could not delete physical file:', fileErr.message);
      // Continue with the response even if file deletion fails
    }
    
    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Replace an existing image (delete old, upload new)
router.put('/product/:productId/image/:imageId/replace', upload.single('image'), async (req, res) => {
  try {
    const productId = req.params.productId;
    const imageId = req.params.imageId;
    
    // Check if new file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const conn = await db.getConnection();
    
    // Get the old image to delete the physical file
    const oldImageResult = await conn.query(`
      SELECT ImagePath
      FROM product_images
      WHERE ImageId = ? AND ProductId = ?
    `, [imageId, productId]);
    
    if (oldImageResult.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Image not found for this product' });
    }
    
    const oldImagePath = oldImageResult[0].ImagePath;
    
    // Get the product name to create the correct path
    const productCheck = await conn.query('SELECT Product FROM Product WHERE ProductId = ?', [productId]);
    if (productCheck.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const productName = productCheck[0].Product;
    const productSlug = productName.toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    
    // Get the new image path
    const filename = req.file.path.substring(req.file.path.lastIndexOf(path.sep) + 1);
    // Check if this is a gallery image and adjust path accordingly
    let newImagePath;
    if (filename.includes('gallery')) {
      // For gallery images, create the gallery subdirectory path
      newImagePath = `/static/images/products/${productSlug}/gallery/${filename.split(path.sep).pop()}`;
      
      // Update the image record with new path
      await conn.query(`
        UPDATE product_images
        SET ImagePath = ?, LastUpdationTimeStamp = NOW()
        WHERE ImageId = ? AND ProductId = ?
      `, [newImagePath, imageId, productId]);
    } else {
      newImagePath = `/static/images/products/${productSlug}/${filename}`;
      
      // Update the image record with new path
      await conn.query(`
        UPDATE product_images
        SET ImagePath = ?, LastUpdationTimeStamp = NOW()
        WHERE ImageId = ? AND ProductId = ?
      `, [newImagePath, imageId, productId]);
    }
    
    conn.release();
    
    // Try to delete the old physical file
    try {
      const absoluteOldPath = path.join(__dirname, '..', oldImagePath);
      await fs.unlink(absoluteOldPath);
    } catch (fileErr) {
      console.warn('Could not delete old physical file:', fileErr.message);
      // Continue with the response even if file deletion fails
    }
    
    res.json({ 
      message: 'Image replaced successfully',
      imagePath: newImagePath,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (err) {
    console.error('Error replacing image:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;