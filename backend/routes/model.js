import express from 'express';
import { db, redis } from '../index.js';

const router = express.Router();

// List all models with aggregated information
router.get('/', async (req, res) => {
  const startTime = Date.now();
  console.log(`[MODELS] Request started at ${new Date().toISOString()}`);
  
  try {
    // Check cache first
    const cacheKey = 'models:all';
    const cachedData = await redis.get(cacheKey);
    
    if (cachedData) {
      // CACHE HIT
      console.log('[MODELS] CACHE HIT – served from Redis');
      const endTime = Date.now();
      console.log(`[MODELS] Response sent at ${new Date().toISOString()}, Execution time: ${endTime - startTime}ms`);
      return res.json(JSON.parse(cachedData));
    }
    
    // CACHE MISS - fetch from DB
    console.log('[MODELS] CACHE MISS – fetching from DB');
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
      WHERE m.IsDeleted = 'N'
      ORDER BY m.ModelId DESC
    `);
    
    // Add basic defaults for each model
    for (let model of models) {
      // Try to get brand name
      try {
        const brand = await conn.query(`
          SELECT Brand FROM Brand WHERE BrandId = ?
        `, [model.Brand]);
        model.BrandName = brand[0]?.Brand || 'Unknown Brand';
      } catch (err) {
        model.BrandName = 'Unknown Brand';
      }
      
      // Try to get material name
      try {
        const material = await conn.query(`
          SELECT Material FROM Material WHERE MaterialId = ?
        `, [model.Material]);
        model.MaterialName = material[0]?.Material || 'N/A';
      } catch (err) {
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
          

          
          model.availableColors = colors.map(c => c.Color);
          model.availableColorIds = colors.map(c => Number(c.ColorId));
          

        } catch (err) {
          
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
          

          
          model.availableSizes = sizes.map(s => s.Size);
          model.availableSizeIds = sizes.map(s => Number(s.SizeId));
          

        } catch (err) {
          
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
              

            } else {

            }
          } else {

          }
        } catch (err) {
          
        }
      } catch (err) {
        
      }
    }
    
    conn.release();
    
    // Store in cache
    const cacheTTL = process.env.REDIS_TTL || 300; // 5 minutes default
    await redis.setEx(cacheKey, cacheTTL, JSON.stringify({ models }));
    
    const endTime = Date.now();
    console.log(`[MODELS] Response sent at ${new Date().toISOString()}, Execution time: ${endTime - startTime}ms`);
    res.json({ models });
  } catch (err) {
    const endTime = Date.now();
    console.log(`[MODELS] Error at ${new Date().toISOString()}, Execution time: ${endTime - startTime}ms`);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get models by category
router.get('/category/:categoryId', async (req, res) => {
  const startTime = Date.now();
  console.log(`[MODELS/CATEGORY] Request for category ${req.params.categoryId} started at ${new Date().toISOString()}`);
  
  try {
    // Check cache first
    const cacheKey = `models:category:${req.params.categoryId}`;
    const cachedData = await redis.get(cacheKey);
    
    if (cachedData) {
      // CACHE HIT
      console.log('[MODELS/CATEGORY] CACHE HIT – served from Redis');
      const endTime = Date.now();
      console.log(`[MODELS/CATEGORY] Response sent at ${new Date().toISOString()}, Execution time: ${endTime - startTime}ms`);
      return res.json(JSON.parse(cachedData));
    }
    
    // CACHE MISS - fetch from DB
    console.log('[MODELS/CATEGORY] CACHE MISS – fetching from DB');
    const conn = await db.getConnection();
    
    // First, check what products exist in this category
    const allProductsInCategory = await conn.query(`
      SELECT p.ProductId, p.Product, p.Model, pc.ProductCategory
      FROM Product p
      LEFT JOIN ProductCategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      WHERE p.ProductCategory_Gen = ? AND p.IsDeleted = 'N'
    `, [req.params.categoryId]);
    

    
    // Now get models that have products in the specified category (exclude Model = 0)
    const modelIds = await conn.query(`
      SELECT DISTINCT p.Model as ModelId, p.ProductCategory_Gen, pc.ProductCategory
      FROM Product p
      LEFT JOIN ProductCategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      WHERE p.ProductCategory_Gen = ? AND p.Model > 0 AND p.IsDeleted = 'N'
    `, [req.params.categoryId]);
    

    
    // Also check for products with Model = 0 in this category
    const orphanProducts = await conn.query(`
      SELECT COUNT(*) as count
      FROM Product p
      WHERE p.ProductCategory_Gen = ? AND p.Model = 0 AND (p.IsDeleted = '' OR p.IsDeleted = 'N')
    `, [req.params.categoryId]);
    

    
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
        // Silent error handling
      }
      
      // Get product count and pricing for this category only (exclude Model = 0)
      try {
        const productCount = await conn.query(`
          SELECT COUNT(*) as count FROM Product 
          WHERE Model = ? AND ProductCategory_Gen = ? AND Model > 0 AND (IsDeleted = '' OR IsDeleted = 'N')
        `, [model.ModelId, req.params.categoryId]);
        
        model.ProductCount = Number(productCount[0]?.count) || 0;
        
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
        }
      } catch (err) {
        
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
            

          } else {

          }
        } else {

        }
      } catch (err) {
        
      }
    }
    
    conn.release();
    
    // Store in cache
    const cacheTTL = parseInt(process.env.REDIS_TTL) || 300; // 5 minutes default
    await redis.setEx(cacheKey, cacheTTL, JSON.stringify({ models }));
    
    const endTime = Date.now();
    console.log(`[MODELS/CATEGORY] Response sent at ${new Date().toISOString()}, Execution time: ${endTime - startTime}ms`);
    res.json({ models });
  } catch (err) {
    const endTime = Date.now();
    console.log(`[MODELS/CATEGORY] Error at ${new Date().toISOString()}, Execution time: ${endTime - startTime}ms`);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get model details with all product variants
router.get('/:modelId', async (req, res) => {
  const startTime = Date.now();
  let queryCount = 0;
  console.log(`[MODEL/ID] Request for model ${req.params.modelId} started at ${new Date().toISOString()}`);
  
  try {
    // Check cache first for model metadata
    const metaCacheKey = `model:meta:${req.params.modelId}`;
    const cachedMeta = await redis.get(metaCacheKey);
    
    if (cachedMeta) {
      // Use cached metadata and fetch dynamic data separately
      const modelMeta = JSON.parse(cachedMeta);
      
      const conn = await db.getConnection();
      const originalQuery = conn.query;
      conn.query = async function(sql, params) {
        queryCount++;
        console.log(`[QUERY ${queryCount}] ${sql.substring(0, 100)}...`);
        return originalQuery.call(this, sql, params);
      };
      
      // Get products with dynamic vendor data
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
      
      // Get vendor product information for each product
      for (let product of products) {
        const vendorProducts = await conn.query(`
          SELECT 
            vp.VendorProductId,
            vp.Product,
            vp.Vendor,
            vp.StockQty,
            vp.Discount,
            vp.GST_SS,
            vp.MRP_SS,
            vp.isNotAvailable,
            u.User as VendorName
          FROM VendorProduct vp
          LEFT JOIN User u ON vp.Vendor = u.UserId
          WHERE vp.Product = ? AND (vp.IsDeleted != 'Y' AND vp.IsNotAvailable != 'Y')
        `, [product.ProductId]);
        
        product.vendorProducts = vendorProducts;
      }
      
      // Restore original query method
      conn.query = originalQuery;
      conn.release();
      
      // Combine cached metadata with fresh dynamic data
      modelMeta.products = products;
      
      const endTime = Date.now();
      console.log(`[MODEL/ID] CACHE HIT – served from Redis metadata + live vendor data, Execution time: ${endTime - startTime}ms`);
      console.log(`[METRICS] Model ${req.params.modelId}: ${queryCount} queries, ${endTime - startTime}ms`);
      return res.json({ model: modelMeta });
    }
    
    // CACHE MISS - fetch all data and cache the metadata
    const conn = await db.getConnection();
    const originalQuery = conn.query;
    conn.query = async function(sql, params) {
      queryCount++;
      console.log(`[QUERY ${queryCount}] ${sql.substring(0, 100)}...`);
      return originalQuery.call(this, sql, params);
    };
    
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
      const endTime = Date.now();
      console.log(`[MODEL/ID] Response sent at ${new Date().toISOString()}, Execution time: ${endTime - startTime}ms`);
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
      WHERE p.Model = ? AND p.IsDeleted = 'N'
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
    
    // Prepare model metadata for caching (stable data only)
    const modelMetadata = {
      ...model,
      products: products.map(p => ({
        ProductId: p.ProductId,
        Product: p.Product,
        MRP: p.MRP,
        Quantity: p.Quantity,
        ProductCategory_Gen: p.ProductCategory_Gen,
        ProductCategory: p.ProductCategory,
        Model: p.Model,
        Brand: p.Brand,
        Color: p.Color,
        ColorName: p.ColorName,
        Size: p.Size,
        SizeName: p.SizeName,
        Shape: p.Shape,
        ShapeName: p.ShapeName,
        Unit: p.Unit,
        UnitName: p.UnitName,
        Currency: p.Currency,
        CurrencyName: p.CurrencyName,
        ProductSubCategory: p.ProductSubCategory,
        ProductSubCategoryName: p.ProductSubCategoryName,
        thumbnail: p.thumbnail,
        mainImage: p.mainImage,
        images: p.images,
        galleryImages: p.galleryImages
      })),
      availableColors,
      availableSizes
    };
    
    // Cache the stable metadata
    const cacheTTL = parseInt(process.env.REDIS_TTL) || 300; // 5 minutes default
    await redis.setEx(metaCacheKey, cacheTTL, JSON.stringify(modelMetadata));
    
    // Get vendor product information for each product (dynamic data)
    for (let product of products) {
      const vendorProducts = await conn.query(`
        SELECT 
          vp.VendorProductId,
          vp.Product,
          vp.Vendor,
          vp.StockQty,
          vp.Discount,
          vp.GST_SS,
          vp.MRP_SS,
          vp.isNotAvailable,
          u.User as VendorName
        FROM VendorProduct vp
        LEFT JOIN User u ON vp.Vendor = u.UserId
        WHERE vp.Product = ? AND (vp.IsDeleted != 'Y' AND vp.IsNotAvailable != 'Y')
      `, [product.ProductId]);
      
      product.vendorProducts = vendorProducts;
    }
    
    model.products = products;
    model.availableColors = availableColors;
    model.availableSizes = availableSizes;
    
    // Restore original query method
    conn.query = originalQuery;
    conn.release();
    
    const endTime = Date.now();
    console.log(`[MODEL/ID] CACHE MISS – fetched from DB and metadata cached, Execution time: ${endTime - startTime}ms`);
    console.log(`[METRICS] Model ${req.params.modelId}: ${queryCount} queries, ${endTime - startTime}ms`);
    res.json({ model });
  } catch (err) {
    // Restore original query method if connection exists
    if (conn && conn.query === originalQuery) {
      conn.query = originalQuery;
    }
    const endTime = Date.now();
    console.log(`[MODEL/ID] Error at ${new Date().toISOString()}, Execution time: ${endTime - startTime}ms`);
    console.log(`[METRICS] Model ${req.params.modelId}: ${queryCount} queries, ${endTime - startTime}ms`);
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
      await conn.query('SELECT 1 FROM user LIMIT 1');
    } catch (err) {
      console.log('User table does not exist:', err.message);
      conn.release();
      return res.json({ 
        vendors: [],
        totalStock: 0,
        vendorCount: 0
      });
    }
    
    // Get vendor products with user details
    try {
      const vendorPricing = await conn.query(`
        SELECT 
          vp.*,
          COALESCE(v.User, 'Unknown Vendor') AS VendorName,
          COALESCE(v.UserEmail, '') AS VendorEmail,
          COALESCE(v.UserMobile, '') AS VendorPhone,
          COALESCE(c.User, 'Unknown Courier') AS CourierName
        FROM VendorProduct vp
        LEFT JOIN user v ON vp.Vendor = v.UserId AND v.IsVendor = 'Y'
        LEFT JOIN user c ON vp.Courier = c.UserId AND c.IsCourier = 'Y'
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
      console.error('Error fetching vendor pricing:', vendorQueryError.message);
      conn.release();
      res.status(500).json({ error: 'Server error', details: vendorQueryError.message });
    }
  } catch (err) {
    console.error('Error fetching vendor pricing:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Fuzzy search models by name (case-insensitive, partial match)
router.get('/search/:query', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const searchQuery = req.params.query.toLowerCase().trim();

    if (!searchQuery) {
      conn.release();
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Split the search query by spaces to handle multiple words
    const searchTerms = searchQuery.split(/\s+/).filter(term => term.length > 0);

    if (searchTerms.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Build dynamic query for multiple search terms
    let query = `
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
    `;

    // Add conditions for each search term (fuzzy matching)
    const conditions = [];
    for (let i = 0; i < searchTerms.length; i++) {
      conditions.push(`LOWER(m.Model) LIKE ?`);
    }

    if (conditions.length > 0) {
      query += ` AND (${conditions.join(' AND ')})`;
    }

    query += ` ORDER BY m.Model ASC`;

    // Prepare parameters for each search term
    const params = searchTerms.map(term => `%${term}%`);

    const models = await conn.query(query, params);

    // Process each model (similar to the main list endpoint)
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

      // Get basic product count and pricing from vendor products
      try {
        const productCount = await conn.query(`
          SELECT COUNT(*) as count FROM Product WHERE Model = ? AND (IsDeleted = '' OR IsDeleted = 'N')
        `, [model.ModelId]);

        // Convert BigInt to Number for JSON serialization
        model.ProductCount = Number(productCount[0]?.count) || 0;

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

          model.availableColors = colors.map(c => c.Color);
          model.availableColorIds = colors.map(c => Number(c.ColorId));
        } catch (err) {
          
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

          model.availableSizes = sizes.map(s => s.Size);
          model.availableSizeIds = sizes.map(s => Number(s.SizeId));
        } catch (err) {
          
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
            }
          }
        } catch (err) {
          
        }
      } catch (err) {
        
      }
    }

    conn.release();
    res.json({ models, searchQuery: req.params.query, resultCount: models.length });
  } catch (err) {
    console.error('Error searching models:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;