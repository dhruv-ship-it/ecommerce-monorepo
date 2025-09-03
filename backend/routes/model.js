import express from 'express';
import { db } from '../index.js';

const router = express.Router();

// List all models with aggregated information
router.get('/', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // Start with a very simple query to test
    const models = await conn.query(`
      SELECT 
        m.ModelId,
        m.Model,
        m.Brand,
        m.IsWaterResistant,
        m.IsFireProof,
        m.IsEcoFriendly,
        m.IsRecyclable,
        m.Warranty,
        m.Guarantee
      FROM Model m
      WHERE m.IsDeleted != 'Y'
      ORDER BY m.ModelId DESC
    `);
    
    console.log('Found models:', models.length);
    
    // Add basic defaults for each model
    for (let model of models) {
      // Try to get brand name
      try {
        const brand = await conn.query(`
          SELECT Brand FROM Brand WHERE BrandId = ?
        `, [model.Brand]);
        model.BrandName = brand[0]?.Brand || 'Unknown Brand';
      } catch (err) {
        console.log('Brand query error:', err.message);
        model.BrandName = 'Unknown Brand';
      }
      
      // Try to get material name
      try {
        const material = await conn.query(`
          SELECT Material FROM Material WHERE MaterialId = ?
        `, [model.Material]);
        model.MaterialName = material[0]?.Material || 'N/A';
      } catch (err) {
        console.log('Material query error:', err.message);
        model.MaterialName = 'N/A';
      }
      
      // Set defaults
      model.ProductCount = 0;
      model.MinPrice = 0;
      model.MaxPrice = 0;
      model.ProductCategoryId = null;
      model.ProductCategory = null;
      model.availableColors = [];
      model.availableSizes = [];
      model.availableColorIds = [];
      model.availableSizeIds = [];
      model.thumbnail = '/placeholder.svg';
      model.mainImage = '/placeholder.svg';
      
      // Ensure all numeric fields are properly converted from BigInt
      model.ModelId = Number(model.ModelId);
      model.Brand = Number(model.Brand);
      
      // Try to get basic product count and pricing from vendor products
      try {
        const productCount = await conn.query(`
          SELECT COUNT(*) as count FROM Product WHERE Model = ? AND (IsDeleted = '' OR IsDeleted = 'N')
        `, [model.ModelId]);
        // Convert BigInt to Number for JSON serialization
        model.ProductCount = Number(productCount[0]?.count) || 0;
        console.log(`Model ${model.ModelId} has ${model.ProductCount} products`);
        
        // Get comprehensive price range from both vendor products and base MRP
        if (model.ProductCount > 0) {
          const allPrices = [];
          
          // Get vendor prices where available
          const vendorPrices = await conn.query(`
            SELECT vp.MRP_SS
            FROM Product p
            LEFT JOIN VendorProduct vp ON p.ProductId = vp.Product
            WHERE p.Model = ? 
              AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
              AND (vp.IsDeleted != 'Y' AND vp.IsNotAvailable != 'Y')
              AND vp.MRP_SS > 0
          `, [model.ModelId]);
          
          // Add vendor prices to array
          vendorPrices.forEach(vp => {
            allPrices.push(Number(vp.MRP_SS));
          });
          
          // Get MRP for products that don't have vendor pricing or as fallback
          const productPrices = await conn.query(`
            SELECT p.MRP
            FROM Product p
            WHERE p.Model = ? 
              AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
              AND p.MRP > 0
          `, [model.ModelId]);
          
          // Add product MRP prices to array (these act as fallback or additional options)
          productPrices.forEach(pp => {
            allPrices.push(Number(pp.MRP));
          });
          
          // Calculate min/max from all available prices
          if (allPrices.length > 0) {
            model.MinPrice = Math.min(...allPrices);
            model.MaxPrice = Math.max(...allPrices);
          } else {
            model.MinPrice = 0;
            model.MaxPrice = 0;
          }
          
          console.log(`Model ${model.ModelId} price range: ₹${model.MinPrice} - ₹${model.MaxPrice} (${vendorPrices.length} vendor prices, ${productPrices.length} base prices)`);
        }
        
        // Get available colors for this model
        try {
          const colors = await conn.query(`
            SELECT DISTINCT c.ColorId, c.Color
            FROM Product p
            LEFT JOIN Color c ON p.Color = c.ColorId
            WHERE p.Model = ? AND (p.IsDeleted = '' OR p.IsDeleted = 'N') AND c.Color IS NOT NULL
            ORDER BY c.Color
          `, [model.ModelId]);
          
          console.log(`Model ${model.ModelId} colors found:`, colors);
          
          model.availableColors = colors.map(c => c.Color);
          model.availableColorIds = colors.map(c => Number(c.ColorId));
          
          console.log(`Model ${model.ModelId} processed colors:`, model.availableColors);
        } catch (err) {
          console.log('Colors query error:', err.message);
        }
        
        // Get available sizes for this model (including products with no size)
        try {
          const sizes = await conn.query(`
            SELECT DISTINCT 
              CASE WHEN p.Size = 0 THEN 0 ELSE s.SizeId END as SizeId,
              CASE WHEN p.Size = 0 THEN 'One Size' ELSE s.Size END as Size
            FROM Product p
            LEFT JOIN Size s ON p.Size = s.SizeId
            WHERE p.Model = ? AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
            ORDER BY SizeId
          `, [model.ModelId]);
          
          console.log(`Model ${model.ModelId} sizes found:`, sizes);
          
          model.availableSizes = sizes.map(s => s.Size);
          model.availableSizeIds = sizes.map(s => Number(s.SizeId));
          
          console.log(`Model ${model.ModelId} processed sizes:`, model.availableSizes);
        } catch (err) {
          console.log('Sizes query error:', err.message);
        }
        
        // Get the first available product's image for the model thumbnail
        try {
          const firstProduct = await conn.query(`
            SELECT p.ProductId
            FROM Product p
            WHERE p.Model = ? AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
            ORDER BY p.ProductId ASC
            LIMIT 1
          `, [model.ModelId]);
          
          if (firstProduct && firstProduct.length > 0) {
            const productId = firstProduct[0].ProductId;
            
            // Get images for this product
            const images = await conn.query(`
              SELECT ImageType, ImagePath, ImageOrder 
              FROM product_images 
              WHERE ProductId = ? AND IsActive = 'Y' 
              ORDER BY ImageOrder ASC
            `, [productId]);
            
            if (images && images.length > 0) {
              // Try to get main image first, otherwise use the first available image
              const mainImg = images.find(img => img.ImageType === 'main');
              const thumbnailImg = images.find(img => img.ImageType === 'thumbnail');
              
              if (mainImg) {
                model.mainImage = mainImg.ImagePath;
                model.thumbnail = mainImg.ImagePath;
              } else if (thumbnailImg) {
                model.mainImage = thumbnailImg.ImagePath;
                model.thumbnail = thumbnailImg.ImagePath;
              } else {
                // Use first available image
                model.mainImage = images[0].ImagePath;
                model.thumbnail = images[0].ImagePath;
              }
              
              console.log(`Model ${model.ModelId} using image: ${model.mainImage}`);
            } else {
              console.log(`Model ${model.ModelId} has no images available`);
            }
          } else {
            console.log(`Model ${model.ModelId} has no products`);
          }
        } catch (err) {
          console.log('Image query error:', err.message);
        }
      } catch (err) {
        console.log('Product count/pricing error:', err.message);
      }
    }
    
    conn.release();
    console.log('Returning models:', models.length);
    res.json({ models });
  } catch (err) {
    console.error('Error fetching models:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get models by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    console.log(`Fetching models for category ${req.params.categoryId}`);
    
    // First, check what products exist in this category
    const allProductsInCategory = await conn.query(`
      SELECT p.ProductId, p.Product, p.Model, pc.ProductCategory
      FROM Product p
      LEFT JOIN ProductCategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      WHERE p.ProductCategory_Gen = ? AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
    `, [req.params.categoryId]);
    
    console.log(`All products in category ${req.params.categoryId}:`);
    allProductsInCategory.forEach(p => {
      console.log(`  Product ${p.ProductId}: ${p.Product} (Model: ${p.Model})`);
    });
    
    // Now get models that have products in the specified category (exclude Model = 0)
    const modelIds = await conn.query(`
      SELECT DISTINCT p.Model as ModelId, p.ProductCategory_Gen, pc.ProductCategory
      FROM Product p
      LEFT JOIN ProductCategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      WHERE p.ProductCategory_Gen = ? AND p.Model > 0 AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
    `, [req.params.categoryId]);
    
    console.log(`Category ${req.params.categoryId} - Found ${modelIds.length} models with products (excluding Model=0):`);
    modelIds.forEach(m => {
      console.log(`  Model ${m.ModelId} in category ${m.ProductCategory_Gen} (${m.ProductCategory})`);
    });
    
    // Also check for products with Model = 0 in this category
    const orphanProducts = await conn.query(`
      SELECT COUNT(*) as count
      FROM Product p
      WHERE p.ProductCategory_Gen = ? AND p.Model = 0 AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
    `, [req.params.categoryId]);
    
    if (orphanProducts[0]?.count > 0) {
      console.log(`  WARNING: Found ${orphanProducts[0].count} products with Model=0 in category ${req.params.categoryId} - these need proper model assignment`);
    }
    
    if (!modelIds || modelIds.length === 0) {
      conn.release();
      return res.json({ models: [] });
    }
    
    // Get basic model information for these models
    const modelIdList = modelIds.map(m => Number(m.ModelId));
    const placeholders = modelIdList.map(() => '?').join(',');
    
    const models = await conn.query(`
      SELECT 
        m.ModelId,
        m.Model,
        m.Brand,
        m.IsWaterResistant,
        m.IsFireProof,
        m.IsEcoFriendly,
        m.IsRecyclable,
        m.Warranty,
        m.Guarantee
      FROM Model m
      WHERE m.ModelId IN (${placeholders}) AND m.IsDeleted != 'Y'
      ORDER BY m.ModelId DESC
    `, modelIdList);
    
    console.log(`Processing ${models.length} models for category`);
    
    // Process each model
    for (let model of models) {
      // Ensure all numeric fields are properly converted from BigInt
      model.ModelId = Number(model.ModelId);
      model.Brand = Number(model.Brand);
      
      // Try to get brand name
      try {
        const brand = await conn.query(`
          SELECT Brand FROM Brand WHERE BrandId = ?
        `, [model.Brand]);
        model.BrandName = brand[0]?.Brand || 'Unknown Brand';
      } catch (err) {
        console.log('Brand query error:', err.message);
        model.BrandName = 'Unknown Brand';
      }
      
      // Try to get material name
      try {
        const material = await conn.query(`
          SELECT Material FROM Material WHERE MaterialId = ?
        `, [model.Material]);
        model.MaterialName = material[0]?.Material || 'N/A';
      } catch (err) {
        console.log('Material query error:', err.message);
        model.MaterialName = 'N/A';
      }
      
      // Set defaults
      model.ProductCount = 0;
      model.MinPrice = 0;
      model.MaxPrice = 0;
      model.availableColors = [];
      model.availableSizes = [];
      model.availableColorIds = [];
      model.availableSizeIds = [];
      model.thumbnail = '/placeholder.svg';
      model.mainImage = '/placeholder.svg';
      
      // Get category info for this specific category
      try {
        const categoryInfo = await conn.query(`
          SELECT ProductCategoryId, ProductCategory
          FROM ProductCategory
          WHERE ProductCategoryId = ?
        `, [req.params.categoryId]);
        
        model.ProductCategoryId = Number(categoryInfo[0]?.ProductCategoryId) || null;
        model.ProductCategory = categoryInfo[0]?.ProductCategory || null;
      } catch (err) {
        console.log('Category query error:', err.message);
      }
      
      // Get product count and pricing for this category only (exclude Model = 0)
      try {
        const productCount = await conn.query(`
          SELECT COUNT(*) as count FROM Product 
          WHERE Model = ? AND ProductCategory_Gen = ? AND Model > 0 AND (IsDeleted = '' OR IsDeleted = 'N')
        `, [model.ModelId, req.params.categoryId]);
        
        model.ProductCount = Number(productCount[0]?.count) || 0;
        console.log(`Model ${model.ModelId} has ${model.ProductCount} products in category ${req.params.categoryId}`);
        
        // Get comprehensive price range for this category
        if (model.ProductCount > 0) {
          const allPrices = [];
          
          // Get vendor prices where available for this category
          const vendorPrices = await conn.query(`
            SELECT vp.MRP_SS
            FROM Product p
            LEFT JOIN VendorProduct vp ON p.ProductId = vp.Product
            WHERE p.Model = ? AND p.ProductCategory_Gen = ? AND p.Model > 0
              AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
              AND (vp.IsDeleted != 'Y' AND vp.IsNotAvailable != 'Y')
              AND vp.MRP_SS > 0
          `, [model.ModelId, req.params.categoryId]);
          
          // Add vendor prices to array
          vendorPrices.forEach(vp => {
            allPrices.push(Number(vp.MRP_SS));
          });
          
          // Get MRP for products in this category
          const productPrices = await conn.query(`
            SELECT p.MRP
            FROM Product p
            WHERE p.Model = ? AND p.ProductCategory_Gen = ? AND p.Model > 0
              AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
              AND p.MRP > 0
          `, [model.ModelId, req.params.categoryId]);
          
          // Add product MRP prices to array
          productPrices.forEach(pp => {
            allPrices.push(Number(pp.MRP));
          });
          
          // Calculate min/max from all available prices
          if (allPrices.length > 0) {
            model.MinPrice = Math.min(...allPrices);
            model.MaxPrice = Math.max(...allPrices);
          }
          
          console.log(`Model ${model.ModelId} price range in category: ₹${model.MinPrice} - ₹${model.MaxPrice}`);
        }
      } catch (err) {
        console.log('Product count/pricing error:', err.message);
      }
      
      // Get available colors for this category
      try {
        const colors = await conn.query(`
          SELECT DISTINCT c.ColorId, c.Color
          FROM Product p
          LEFT JOIN Color c ON p.Color = c.ColorId
          WHERE p.Model = ? AND p.ProductCategory_Gen = ? AND p.Model > 0
            AND (p.IsDeleted = '' OR p.IsDeleted = 'N') AND c.Color IS NOT NULL
          ORDER BY c.Color
        `, [model.ModelId, req.params.categoryId]);
        
        model.availableColors = colors.map(c => c.Color);
        model.availableColorIds = colors.map(c => Number(c.ColorId));
      } catch (err) {
        console.log('Colors query error:', err.message);
      }
      
      // Get available sizes for this category
      try {
        const sizes = await conn.query(`
          SELECT DISTINCT 
            CASE WHEN p.Size = 0 THEN 0 ELSE s.SizeId END as SizeId,
            CASE WHEN p.Size = 0 THEN 'One Size' ELSE s.Size END as Size
          FROM Product p
          LEFT JOIN Size s ON p.Size = s.SizeId
          WHERE p.Model = ? AND p.ProductCategory_Gen = ? AND p.Model > 0
            AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
          ORDER BY SizeId
        `, [model.ModelId, req.params.categoryId]);
        
        model.availableSizes = sizes.map(s => s.Size);
        model.availableSizeIds = sizes.map(s => Number(s.SizeId));
      } catch (err) {
        console.log('Sizes query error:', err.message);
      }
      
      // Get the first available product's image for the model thumbnail in this category
      try {
        const firstProduct = await conn.query(`
          SELECT p.ProductId
          FROM Product p
          WHERE p.Model = ? AND p.ProductCategory_Gen = ? AND p.Model > 0
            AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
          ORDER BY p.ProductId ASC
          LIMIT 1
        `, [model.ModelId, req.params.categoryId]);
        
        if (firstProduct && firstProduct.length > 0) {
          const productId = firstProduct[0].ProductId;
          
          // Get images for this product
          const images = await conn.query(`
            SELECT ImageType, ImagePath, ImageOrder 
            FROM product_images 
            WHERE ProductId = ? AND IsActive = 'Y' 
            ORDER BY ImageOrder ASC
          `, [productId]);
          
          if (images && images.length > 0) {
            // Try to get main image first, otherwise use the first available image
            const mainImg = images.find(img => img.ImageType === 'main');
            const thumbnailImg = images.find(img => img.ImageType === 'thumbnail');
            
            if (mainImg) {
              model.mainImage = mainImg.ImagePath;
              model.thumbnail = mainImg.ImagePath;
            } else if (thumbnailImg) {
              model.mainImage = thumbnailImg.ImagePath;
              model.thumbnail = thumbnailImg.ImagePath;
            } else {
              // Use first available image
              model.mainImage = images[0].ImagePath;
              model.thumbnail = images[0].ImagePath;
            }
            
            console.log(`Model ${model.ModelId} in category ${req.params.categoryId} using image: ${model.mainImage}`);
          } else {
            console.log(`Model ${model.ModelId} in category ${req.params.categoryId} has no images available`);
          }
        } else {
          console.log(`Model ${model.ModelId} in category ${req.params.categoryId} has no products`);
        }
      } catch (err) {
        console.log('Image query error for category:', err.message);
      }
    }
    
    conn.release();
    console.log(`Returning ${models.length} models for category ${req.params.categoryId}`);
    res.json({ models });
  } catch (err) {
    console.error('Error fetching models by category:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get model details with all product variants
router.get('/:modelId', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // Get model information
    const modelInfo = await conn.query(`
      SELECT 
        m.*,
        b.Brand AS BrandName,
        mat.Material AS MaterialName
      FROM Model m
      LEFT JOIN Brand b ON m.Brand = b.BrandId
      LEFT JOIN Material mat ON m.Material = mat.MaterialId
      WHERE m.ModelId = ? AND m.IsDeleted != 'Y'
    `, [req.params.modelId]);
    
    if (!modelInfo || modelInfo.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Model not found' });
    }
    
    const model = modelInfo[0];
    
    // Set default material if null
    if (!model.MaterialName) {
      model.MaterialName = 'N/A';
    }
    
    // Get all products for this model with complete information
    const products = await conn.query(`
      SELECT 
        p.*,
        pc.ProductCategoryId,
        pc.ProductCategory,
        psc.ProductSubCategory AS ProductSubCategoryName,
        c.Color AS ColorName,
        s.Size AS SizeName,
        sh.Shape AS ShapeName,
        u.Unit AS UnitName,
        cur.Currency AS CurrencyName
      FROM Product p
      LEFT JOIN ProductCategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      LEFT JOIN ProductSubCategory psc ON p.ProductSubCategory = psc.ProductSubCategoryId
      LEFT JOIN Color c ON p.Color = c.ColorId
      LEFT JOIN Size s ON p.Size = s.SizeId
      LEFT JOIN Shape sh ON p.Shape = sh.ShapeId
      LEFT JOIN Unit u ON p.Unit = u.UnitId
      LEFT JOIN Currency cur ON p.Currency = cur.CurrencyId
      WHERE p.Model = ? AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
      ORDER BY p.ProductId
    `, [req.params.modelId]);
    
    // Get images for each product
    for (let product of products) {
      const images = await conn.query(`
        SELECT ImageType, ImagePath, ImageOrder 
        FROM product_images 
        WHERE ProductId = ? AND IsActive = 'Y' 
        ORDER BY ImageOrder
      `, [product.ProductId]);
      
      product.images = images;
      product.thumbnail = images.find(img => img.ImageType === 'thumbnail')?.ImagePath || '/placeholder.svg';
      product.mainImage = images.find(img => img.ImageType === 'main')?.ImagePath || '/placeholder.svg';
      product.galleryImages = images.filter(img => img.ImageType === 'gallery').map(img => img.ImagePath);
    }
    
    // Get all available colors and sizes for this model
    const availableColors = await conn.query(`
      SELECT DISTINCT c.ColorId, c.Color
      FROM Product p
      LEFT JOIN Color c ON p.Color = c.ColorId
      WHERE p.Model = ? AND (p.IsDeleted = '' OR p.IsDeleted = 'N') AND c.Color IS NOT NULL
      ORDER BY c.Color
    `, [req.params.modelId]);
    
    const availableSizes = await conn.query(`
      SELECT DISTINCT 
        CASE WHEN p.Size = 0 THEN 0 ELSE s.SizeId END as SizeId,
        CASE WHEN p.Size = 0 THEN 'One Size' ELSE s.Size END as Size
      FROM Product p
      LEFT JOIN Size s ON p.Size = s.SizeId
      WHERE p.Model = ? AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
      ORDER BY SizeId
    `, [req.params.modelId]);
    
    model.products = products;
    model.availableColors = availableColors;
    model.availableSizes = availableSizes;
    
    conn.release();
    res.json({ model });
  } catch (err) {
    console.error('Error fetching model details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific product details by color and size
router.get('/:modelId/product/:colorId/:sizeId', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    console.log(`Fetching product for model ${req.params.modelId}, color ${req.params.colorId}, size ${req.params.sizeId}`);
    
    // Check if product exists for this color/size combination
    const products = await conn.query(`
      SELECT 
        p.*,
        pc.ProductCategoryId,
        pc.ProductCategory,
        psc.ProductSubCategory AS ProductSubCategoryName,
        c.Color AS ColorName,
        CASE WHEN p.Size = 0 THEN 'One Size' ELSE s.Size END AS SizeName,
        sh.Shape AS ShapeName,
        u.Unit AS UnitName,
        cur.Currency AS CurrencyName
      FROM Product p
      LEFT JOIN ProductCategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      LEFT JOIN ProductSubCategory psc ON p.ProductSubCategory = psc.ProductSubCategoryId
      LEFT JOIN Color c ON p.Color = c.ColorId
      LEFT JOIN Size s ON p.Size = s.SizeId
      LEFT JOIN Shape sh ON p.Shape = sh.ShapeId
      LEFT JOIN Unit u ON p.Unit = u.UnitId
      LEFT JOIN Currency cur ON p.Currency = cur.CurrencyId
      WHERE p.Model = ? AND p.Color = ? AND p.Size = ? AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
    `, [req.params.modelId, req.params.colorId, req.params.sizeId]);
    
    console.log(`Found ${products.length} products for this combination`);
    
    if (!products || products.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Product does not exist for this color/size combination' });
    }
    
    const product = products[0];
    
    // Convert BigInt values to numbers
    product.ProductId = Number(product.ProductId);
    product.MRP = Number(product.MRP);
    product.Quantity = Number(product.Quantity);
    
    // Get images for this product
    const images = await conn.query(`
      SELECT ImageType, ImagePath, ImageOrder 
      FROM product_images 
      WHERE ProductId = ? AND IsActive = 'Y' 
      ORDER BY ImageOrder
    `, [product.ProductId]);
    
    product.images = images;
    product.thumbnail = images.find(img => img.ImageType === 'thumbnail')?.ImagePath || '/placeholder.svg';
    product.mainImage = images.find(img => img.ImageType === 'main')?.ImagePath || '/placeholder.svg';
    product.galleryImages = images.filter(img => img.ImageType === 'gallery').map(img => img.ImagePath);
    
    conn.release();
    res.json({ product });
  } catch (err) {
    console.error('Error fetching specific product:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get vendor pricing for a specific product
router.get('/:modelId/products/:productId/vendors', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    console.log(`Fetching vendors for product ${req.params.productId}`);
    
    // First check if vendor-related tables exist
    try {
      await conn.query('SELECT 1 FROM VendorProduct LIMIT 1');
    } catch (err) {
      console.log('VendorProduct table not accessible:', err.message);
      conn.release();
      return res.json({ 
        vendors: [],
        totalStock: 0,
        vendorCount: 0
      });
    }
    
    try {
      await conn.query('SELECT 1 FROM Vendor LIMIT 1');
    } catch (err) {
      console.log('Vendor table does not exist, returning vendor product data only');
      
      // Get vendor products without vendor details
      const vendorPricing = await conn.query(`
        SELECT 
          vp.*,
          'Unknown Vendor' AS VendorName,
          '' AS VendorEmail,
          '' AS VendorPhone,
          'Unknown Courier' AS CourierName
        FROM VendorProduct vp
        WHERE vp.Product = ? AND (vp.IsDeleted != 'Y' OR vp.IsDeleted IS NULL) AND (vp.IsNotAvailable != 'Y' OR vp.IsNotAvailable IS NULL)
        ORDER BY vp.MRP_SS ASC
      `, [req.params.productId]);
      
      console.log(`Found ${vendorPricing.length} vendor products (no vendor details available)`);
      
      let totalStock = 0;
      if (vendorPricing && vendorPricing.length > 0) {
        vendorPricing.forEach(vendor => {
          totalStock += Number(vendor.StockQty) || 0;
        });
      }
      
      conn.release();
      return res.json({ 
        vendors: vendorPricing || [],
        totalStock: totalStock,
        vendorCount: vendorPricing ? vendorPricing.length : 0
      });
    }
    
    // If both tables exist, get full vendor details
    try {
      const vendorPricing = await conn.query(`
        SELECT 
          vp.*,
          v.Name AS VendorName,
          v.Email AS VendorEmail,
          v.PhoneNumber AS VendorPhone,
          c.Name AS CourierName
        FROM VendorProduct vp
        LEFT JOIN Vendor v ON vp.Vendor = v.VendorId
        LEFT JOIN Courier c ON vp.Courier = c.CourierId
        WHERE vp.Product = ? AND (vp.IsDeleted != 'Y' OR vp.IsDeleted IS NULL) AND (vp.IsNotAvailable != 'Y' OR vp.IsNotAvailable IS NULL)
        ORDER BY vp.MRP_SS ASC
      `, [req.params.productId]);
      
      console.log(`Found ${vendorPricing.length} vendors for product ${req.params.productId}`);
      
      // Calculate total available stock across all vendors
      let totalStock = 0;
      if (vendorPricing && vendorPricing.length > 0) {
        vendorPricing.forEach(vendor => {
          totalStock += Number(vendor.StockQty) || 0;
        });
      }
      
      conn.release();
      res.json({ 
        vendors: vendorPricing || [],
        totalStock: totalStock,
        vendorCount: vendorPricing ? vendorPricing.length : 0
      });
    } catch (vendorQueryError) {
      console.log('Vendor query failed (likely missing Courier table):', vendorQueryError.message);
      
      // Fallback to VendorProduct data only without Courier details
      const vendorPricing = await conn.query(`
        SELECT 
          vp.*,
          'Unknown Vendor' AS VendorName,
          '' AS VendorEmail,
          '' AS VendorPhone,
          'Unknown Courier' AS CourierName
        FROM VendorProduct vp
        WHERE vp.Product = ? AND (vp.IsDeleted != 'Y' OR vp.IsDeleted IS NULL) AND (vp.IsNotAvailable != 'Y' OR vp.IsNotAvailable IS NULL)
        ORDER BY vp.MRP_SS ASC
      `, [req.params.productId]);
      
      console.log(`Found ${vendorPricing.length} vendor products (fallback mode)`);
      
      let totalStock = 0;
      if (vendorPricing && vendorPricing.length > 0) {
        vendorPricing.forEach(vendor => {
          totalStock += Number(vendor.StockQty) || 0;
        });
      }
      
      conn.release();
      res.json({ 
        vendors: vendorPricing || [],
        totalStock: totalStock,
        vendorCount: vendorPricing ? vendorPricing.length : 0
      });
    }
  } catch (err) {
    console.error('Error fetching vendor pricing:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;