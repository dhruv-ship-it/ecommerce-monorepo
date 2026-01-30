import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../index.js';

const router = express.Router();

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    console.log('AUTH DEBUG: Decoded user from token:', req.user);
    next();
  } catch (err) {
    console.error('AUTH ERROR: Invalid token:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
}

function vendorOnlyMiddleware(req, res, next) {
  console.log('VENDOR MIDDLEWARE DEBUG: User role:', req.user.role, 'User ID:', req.user.id);
  if (req.user.role === 'vendor') return next();
  console.log('VENDOR MIDDLEWARE DEBUG: Access denied for user:', req.user);
  return res.status(403).json({ error: 'Forbidden' });
}

// Get vendor's products with default courier info
router.get('/products', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  try {
    console.log('=== DEBUG: Vendor Products Request ===');
    console.log('Vendor ID:', req.user.id);
    
    const conn = await db.getConnection();
    
    // Check if a specific product ID is requested
    const productId = req.query.id;
    
    let query = `
      SELECT 
        p.*, 
        vp.VendorProductId, 
        vp.Courier as DefaultCourier, 
        COALESCE(vp.MRP_SS, 0) as MRP_SS, 
        COALESCE(vp.Discount, 0) as Discount, 
        COALESCE(vp.GST_SS, 0) as GST_SS, 
        COALESCE(vp.StockQty, 0) as StockQty, 
        COALESCE(vp.MaxStockQty, 0) as MaxStockQty, 
        COALESCE(vp.IsNotAvailable, 'N') as IsNotAvailable,
        COALESCE(u.User, 'Not Assigned') as CourierName, 
        u.UserMobile as CourierMobile
      FROM Product p 
      JOIN VendorProduct vp ON p.ProductId = vp.Product 
      LEFT JOIN User u ON vp.Courier = u.UserId AND u.IsCourier = 'Y' AND u.IsBlackListed != 'Y'
      WHERE vp.Vendor = ? AND vp.IsDeleted != 'Y'
    `;
    
    let queryParams = [req.user.id];
    
    // If a specific product ID is requested, filter by it
    if (productId) {
      query += ' AND vp.VendorProductId = ?';
      queryParams.push(productId);
    }
    
    const products = await conn.query(query, queryParams);
    
    console.log('Raw products result:', JSON.stringify(products, null, 2));
    console.log('Products type:', typeof products);
    console.log('Products is array:', Array.isArray(products));
    console.log('Products length:', Array.isArray(products) ? products.length : 'N/A');
    
    // Handle different possible return formats
    let productsData = [];
    if (Array.isArray(products)) {
      // Check if it's an array of arrays (MariaDB format) or array of objects
      if (products.length > 0 && Array.isArray(products[0])) {
        // MariaDB returns [data, metadata] format
        productsData = products[0];
      } else {
        // Direct array of objects
        productsData = products;
      }
    } else if (products && typeof products === 'object') {
      // Single object result
      productsData = [products];
    }
    
    console.log('Processed products data:', JSON.stringify(productsData, null, 2));
    console.log('Vendor products count:', productsData.length);
    console.log('=== END DEBUG: Vendor Products Request ===');
    
    conn.release();
    res.json({ products: productsData });
  } catch (err) {
    console.error('Vendor products error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all available products from Product table for vendor to choose from
router.get('/available-products', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    
    console.log('=== DEBUG: Available Products Request ===');
    console.log('Vendor ID:', req.user.id);
    
    // First, check if Product table exists and get all products with more details
    const allProducts = await conn.query(`
      SELECT 
        p.ProductId, 
        p.Product, 
        p.MRP, 
        p.ProductCategory_Gen, 
        p.ProductSubCategory,
        COALESCE(pc.ProductCategory, 'Unknown Category') as CategoryName,
        COALESCE(psc.ProductSubCategory, 'Unknown Subcategory') as SubCategoryName
      FROM Product p
      LEFT JOIN ProductCategory pc ON p.ProductCategory_Gen = pc.ProductCategoryId
      LEFT JOIN ProductSubCategory psc ON p.ProductSubCategory = psc.ProductSubCategoryId
      WHERE p.IsDeleted = '' OR p.IsDeleted = 'N'
      ORDER BY p.Product
    `);
    
    console.log('All products type:', typeof allProducts);
    console.log('All products is array:', Array.isArray(allProducts));
    console.log('All products length:', Array.isArray(allProducts) ? allProducts.length : 'N/A');
    
    // Handle different possible return formats
    let allProductsData = [];
    if (Array.isArray(allProducts)) {
      // Check if it's an array of arrays (MariaDB format) or array of objects
      if (allProducts.length > 0 && Array.isArray(allProducts[0])) {
        // MariaDB returns [data, metadata] format
        allProductsData = allProducts[0];
      } else {
        // Direct array of objects
        allProductsData = allProducts;
      }
    } else if (allProducts && typeof allProducts === 'object') {
      // Single object result
      allProductsData = [allProducts];
    }
    
    console.log('All products count:', allProductsData.length);
    console.log('Found', allProductsData.length, 'total products in Product table');
    
    // Then get products this vendor already has
    const vendorProducts = await conn.query(`
      SELECT DISTINCT Product FROM VendorProduct 
      WHERE Vendor = ? AND IsDeleted != 'Y'
    `, [req.user.id]);
    
    console.log('Vendor products type:', typeof vendorProducts);
    console.log('Vendor products is array:', Array.isArray(vendorProducts));
    console.log('Vendor products length:', Array.isArray(vendorProducts) ? vendorProducts.length : 'N/A');
    
    // Handle different possible return formats
    let vendorProductsData = [];
    if (Array.isArray(vendorProducts)) {
      // Check if it's an array of arrays (MariaDB format) or array of objects
      if (vendorProducts.length > 0 && Array.isArray(vendorProducts[0])) {
        // MariaDB returns [data, metadata] format
        vendorProductsData = vendorProducts[0];
      } else {
        // Direct array of objects
        vendorProductsData = vendorProducts;
      }
    } else if (vendorProducts && typeof vendorProducts === 'object') {
      // Single object result
      vendorProductsData = [vendorProducts];
    }
    
    console.log('Vendor products count:', vendorProductsData.length);
    console.log(`Vendor ${req.user.id} has ${vendorProductsData.length} products already`);
    
    // Filter out products vendor already has
    // Convert vendor product IDs to numbers for proper comparison
    const vendorProductIds = vendorProductsData.map(vp => Number(vp.Product));
    console.log('Vendor product IDs:', vendorProductIds);
    
    const availableProducts = allProductsData.filter(p => !vendorProductIds.includes(Number(p.ProductId)));
    console.log('Available products count:', availableProducts.length);
    console.log(`Available products for vendor: ${availableProducts.length}`);
    console.log('=== END DEBUG: Available Products Request ===');
    
    conn.release();
    res.json({ products: availableProducts });
  } catch (err) {
    console.error('Available products error:', err);
    console.error('Error stack:', err.stack);
    if (conn) conn.release();
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get available couriers for assignment
router.get('/couriers', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  let conn;
  try {
    console.log('=== DEBUG: Couriers Request ===');
    
    conn = await db.getConnection();
    const couriers = await conn.query(
      'SELECT UserId, User, UserMobile, UserEmail FROM User WHERE IsCourier = "Y" AND IsBlackListed != "Y"'
    );
    
    console.log('Raw couriers result:', JSON.stringify(couriers, null, 2));
    console.log('Couriers type:', typeof couriers);
    console.log('Couriers is array:', Array.isArray(couriers));
    
    // Handle different possible return formats for MariaDB
    let couriersData = [];
    if (Array.isArray(couriers)) {
      // Check if it's an array of arrays (MariaDB format) or array of objects
      if (couriers.length > 0 && Array.isArray(couriers[0])) {
        // MariaDB returns [data, metadata] format
        couriersData = couriers[0];
      } else {
        // Direct array of objects
        couriersData = couriers;
      }
    } else if (couriers && typeof couriers === 'object') {
      // Single object result
      couriersData = [couriers];
    }
    
    console.log('Processed couriers data:', JSON.stringify(couriersData, null, 2));
    console.log('Couriers count:', couriersData.length);
    console.log('=== END DEBUG: Couriers Request ===');
    
    res.json({ couriers: couriersData });
  } catch (err) {
    console.error('Couriers error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
});

// Add existing product to vendor catalog
router.post('/product/add-existing', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  const { productId, stockQty, sellingPrice, discount, gst, defaultCourierId } = req.body;
  if (!productId) return res.status(400).json({ error: 'Missing productId' });
  
  // Validate input parameters
  if (stockQty === undefined || stockQty <= 0) return res.status(400).json({ error: 'Invalid stock quantity' });
  if (sellingPrice === undefined || sellingPrice <= 0) return res.status(400).json({ error: 'Invalid selling price' });
  if (discount === undefined || discount < 0 || discount > 100) return res.status(400).json({ error: 'Invalid discount percentage' });
  if (gst === undefined || gst < 0 || gst > 100) return res.status(400).json({ error: 'Invalid GST percentage' });
  if (defaultCourierId === undefined || defaultCourierId <= 0) return res.status(400).json({ error: 'Invalid courier' });
  
  try {
    const conn = await db.getConnection();
    
    // Verify product exists in Product table
    const [product] = await conn.query('SELECT * FROM Product WHERE ProductId = ?', [productId]);
    if (!product || product.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Product not found in catalog' });
    }
    
    // Verify courier exists and is not blacklisted
    const [courier] = await conn.query(
      'SELECT UserId FROM User WHERE UserId = ? AND IsCourier = "Y" AND IsBlackListed != "Y"',
      [defaultCourierId]
    );
    if (!courier || courier.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'Invalid or blacklisted courier' });
    }
    
    // Check if vendor already has this product
    const [existing] = await conn.query(
      'SELECT * FROM VendorProduct WHERE Vendor = ? AND Product = ? AND IsDeleted != "Y"',
      [req.user.id, productId]
    );
    
    if (existing && existing.length > 0) {
      // Product already exists - increase stock quantity instead of creating duplicate
      const newStockQty = existing[0].StockQty + stockQty;
      await conn.query(
        'UPDATE VendorProduct SET StockQty = ?, LastUpdationLogin = ? WHERE VendorProductId = ?',
        [newStockQty, req.user.id, existing[0].VendorProductId]
      );
      conn.release();
      return res.json({ 
        message: `Stock quantity increased successfully! Previous: ${existing[0].StockQty}, Added: ${stockQty}, New Total: ${newStockQty}`,
        action: 'stock_increased',
        previousStock: existing[0].StockQty,
        addedStock: stockQty,
        newStock: newStockQty
      });
    }
    
    // Add new product to vendor catalog
    await conn.query(`
      INSERT INTO VendorProduct (Vendor, Product, Courier, MRP_SS, Discount, GST_SS, StockQty, IsNotAvailable, IsDeleted, RecordCreationLogin) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'N', 'N', ?)
    `, [req.user.id, productId, defaultCourierId, sellingPrice, discount, gst, stockQty, req.user.id]);
    
    conn.release();
    res.json({ 
      message: 'Product added to your catalog successfully',
      action: 'product_added',
      stockQty: stockQty
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update vendor-product details only (vendors cannot modify Product table)
router.put('/product/:id', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  const { defaultCourierId, stockQty, discount, gst, sellingPrice, isNotAvailable } = req.body;
  
  // Validate input parameters if provided
  if (stockQty !== undefined && stockQty < 0) return res.status(400).json({ error: 'Invalid stock quantity' });
  if (sellingPrice !== undefined && sellingPrice <= 0) return res.status(400).json({ error: 'Invalid selling price' });
  if (discount !== undefined && (discount < 0 || discount > 100)) return res.status(400).json({ error: 'Invalid discount percentage' });
  if (gst !== undefined && (gst < 0 || gst > 100)) return res.status(400).json({ error: 'Invalid GST percentage' });
  // Remove the isNotAvailable validation since we're handling it automatically
  
  try {
    const conn = await db.getConnection();
    
    // Verify vendor owns this product in their catalog
    const [vendorProduct] = await conn.query(
      'SELECT * FROM VendorProduct WHERE VendorProductId = ? AND Vendor = ? AND IsDeleted != "Y"',
      [req.params.id, req.user.id]
    );
    
    if (!vendorProduct || vendorProduct.length === 0) {
      conn.release();
      return res.status(403).json({ error: 'Product not found in your catalog' });
    }
    
    // Verify courier exists and is not blacklisted if provided
    if (defaultCourierId !== undefined && defaultCourierId > 0) {
      const [courier] = await conn.query(
        'SELECT UserId FROM User WHERE UserId = ? AND IsCourier = "Y" AND IsBlackListed != "Y"',
        [defaultCourierId]
      );
      if (!courier || courier.length === 0) {
        conn.release();
        return res.status(400).json({ error: 'Invalid or blacklisted courier' });
      }
    }
    
    // Update only vendor-product relationship (pricing, stock, courier, availability)
    const updates = [];
    const values = [];
    
    if (defaultCourierId !== undefined) {
      updates.push('Courier = ?');
      values.push(defaultCourierId);
    }
    if (sellingPrice !== undefined) {
      updates.push('MRP_SS = ?');
      values.push(sellingPrice);
    }
    if (discount !== undefined) {
      updates.push('Discount = ?');
      values.push(discount);
    }
    if (gst !== undefined) {
      updates.push('GST_SS = ?');
      values.push(gst);
    }
    if (stockQty !== undefined) {
      updates.push('StockQty = ?');
      values.push(stockQty);
      // Automatically set IsNotAvailable based on stock quantity
      updates.push('IsNotAvailable = ?');
      values.push(stockQty === 0 ? 'Y' : 'N');
    }
    // Remove the manual isNotAvailable check since we're handling it automatically based on stock
    
    // Always update the last modification login
    updates.push('LastUpdationLogin = ?');
    values.push(req.user.id);
    
    if (updates.length > 1) { // More than just LastUpdationLogin
      const query = `UPDATE VendorProduct SET ${updates.join(', ')} WHERE VendorProductId = ? AND Vendor = ?`;
      values.push(req.params.id, req.user.id);
      
      await conn.query(query, values);
    }
    
    conn.release();
    res.json({ message: 'Product updated successfully in your catalog' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update stock quantity only (quick stock management)
router.put('/product/:id/stock', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  const { stockQty } = req.body;
  if (stockQty === undefined) return res.status(400).json({ error: 'Missing stock quantity' });
  if (stockQty < 0) return res.status(400).json({ error: 'Invalid stock quantity' });
  
  try {
    const conn = await db.getConnection();
    
    // Verify vendor owns this product
    const [vendorProduct] = await conn.query(
      'SELECT * FROM VendorProduct WHERE VendorProductId = ? AND Vendor = ? AND IsDeleted != "Y"',
      [req.params.id, req.user.id]
    );
    
    if (!vendorProduct || vendorProduct.length === 0) {
      conn.release();
      return res.status(403).json({ error: 'Product not found in your catalog' });
    }
    
    // Update stock quantity only
    await conn.query(
      'UPDATE VendorProduct SET StockQty = ?, LastUpdationLogin = ? WHERE VendorProductId = ? AND Vendor = ?',
      [stockQty, req.user.id, req.params.id, req.user.id]
    );
    
    conn.release();
    res.json({ message: 'Stock quantity updated successfully', newStock: stockQty });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product from vendor's catalog (mark as deleted in VendorProduct table)
router.delete('/product/:id', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    // Update IsDeleted flag instead of actually deleting the record
    await conn.query(
      'UPDATE VendorProduct SET IsDeleted = "Y", LastUpdationLogin = ? WHERE VendorProductId = ? AND Vendor = ?', 
      [req.user.id, req.params.id, req.user.id]
    );
    conn.release();
    res.json({ message: 'Product removed from your catalog' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get vendor's orders with full status tracking - Frontend compatible format
router.get('/orders', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    const ordersResult = await conn.query(`
      SELECT 
        vpc.PurchaseId as PuchaseId,
        vpc.Product as ProductId,
        p.Product,
        p.MRP as ProductPrice,
        vpc.Customer as CustomerId,
        vpc.OrderCreationTimeStamp as OrderDate,
        COALESCE(prch.TotalAmount, 0) as TotalAmount,
        COALESCE(prch.PaymentMode, 'COD') as PaymentMode,
        COALESCE(prch.PaymentStatus, 'Pending') as PaymentStatus,
        COALESCE(vpc.Courier, vp.Courier) as CourierId,  -- Use default courier from vendorproduct if not assigned in order
        vpc.Vendor as VendorId,
        c.Customer as CustomerName,
        c.CustomerEmail,
        c.CustomerMobile,
        COALESCE(u.User, default_u.User) as CourierName,  -- Use default courier name if not assigned in order
        COALESCE(u.UserMobile, default_u.UserMobile) as CourierMobile,  -- Use default courier mobile if not assigned in order
        CASE 
          WHEN vpc.IsDelivered = 'Y' THEN 'Delivered'
          WHEN vpc.IsReturned = 'Y' THEN 'Returned'
          WHEN vpc.IsOut_for_Delivery = 'Y' THEN 'Out for Delivery'
          WHEN vpc.IsDispatched = 'Y' THEN 'Dispatched'
          WHEN vpc.IsReady_for_Pickup_by_Courier = 'Y' THEN 'Ready for Pickup'
          WHEN COALESCE(vpc.Courier, vp.Courier) = 0 THEN 'No Courier Assigned'
          ELSE 'Order Placed'
        END as OrderStatus,
        CASE
          WHEN COALESCE(vpc.Courier, vp.Courier) = 0 THEN 'No Courier Assigned'
          WHEN vpc.IsPicked_by_Courier = 'Y' THEN 'Courier Assigned'
          WHEN vpc.IsReturned = 'Y' THEN 'Rejected'
          WHEN vpc.IsReady_for_Pickup_by_Courier = 'Y' THEN 'Ready for Pickup'
          ELSE 'Courier Assigned'
        END as CourierAcceptanceStatus,
        vpc.IsReady_for_Pickup_by_Courier as IsReadyForPickup,
        vpc.IsPicked_by_Courier,
        vpc.Courier as ActualCourierId,
        'Active' as OrderCategory
      FROM VendorProductCustomerCourier vpc
      JOIN Product p ON vpc.Product = p.ProductId
      JOIN Customer c ON vpc.Customer = c.CustomerId
      JOIN VendorProduct vp ON vpc.Product = vp.Product AND vpc.Vendor = vp.Vendor  -- Join to get default courier
      LEFT JOIN Purchase prch ON vpc.PurchaseId = prch.PuchaseId
      LEFT JOIN User u ON vpc.Courier = u.UserId AND u.IsCourier = "Y"  -- Actual assigned courier
      LEFT JOIN User default_u ON vp.Courier = default_u.UserId AND default_u.IsCourier = "Y"  -- Default courier from vendorproduct
      WHERE vpc.Vendor = ? AND vpc.IsDeleted != 'Y'
      UNION ALL
      SELECT 
        vpc_arch.PurchaseId as PuchaseId,
        vpc_arch.Product as ProductId,
        p.Product,
        p.MRP as ProductPrice,
        vpc_arch.Customer as CustomerId,
        vpc_arch.OrderCreationTimeStamp as OrderDate,
        COALESCE(prch_arch.TotalAmount, 0) as TotalAmount,
        COALESCE(prch_arch.PaymentMode, 'COD') as PaymentMode,
        COALESCE(prch_arch.PaymentStatus, 'Pending') as PaymentStatus,
        vpc_arch.Courier as CourierId,
        vpc_arch.Vendor as VendorId,
        c.Customer as CustomerName,
        c.CustomerEmail,
        c.CustomerMobile,
        u.User as CourierName,
        u.UserMobile as CourierMobile,
        CASE 
          WHEN vpc_arch.IsDelivered = 'Y' THEN 'Delivered'
          WHEN vpc_arch.IsReturned = 'Y' THEN 'Returned'
          WHEN vpc_arch.IsOut_for_Delivery = 'Y' THEN 'Out for Delivery'
          WHEN vpc_arch.IsDispatched = 'Y' THEN 'Dispatched'
          WHEN vpc_arch.IsReady_for_Pickup_by_Courier = 'Y' THEN 'Ready for Pickup'
          WHEN COALESCE(vpc_arch.Courier, 0) = 0 THEN 'No Courier Assigned'
          ELSE 'Order Placed'
        END as OrderStatus,
        CASE
          WHEN COALESCE(vpc_arch.Courier, 0) = 0 THEN 'No Courier Assigned'
          WHEN vpc_arch.IsPicked_by_Courier = 'Y' THEN 'Courier Assigned'
          WHEN vpc_arch.IsReturned = 'Y' THEN 'Rejected'
          WHEN vpc_arch.IsReady_for_Pickup_by_Courier = 'Y' THEN 'Ready for Pickup'
          ELSE 'Courier Assigned'
        END as CourierAcceptanceStatus,
        vpc_arch.IsReady_for_Pickup_by_Courier as IsReadyForPickup,
        vpc_arch.IsPicked_by_Courier,
        vpc_arch.Courier as ActualCourierId,
        'Archived' as OrderCategory
      FROM vendorproductcustomercourier_arch vpc_arch
      JOIN Product p ON vpc_arch.Product = p.ProductId
      JOIN Customer c ON vpc_arch.Customer = c.CustomerId
      LEFT JOIN purchase_arch prch_arch ON vpc_arch.PurchaseId = prch_arch.PuchaseId
      LEFT JOIN User u ON vpc_arch.Courier = u.UserId AND u.IsCourier = "Y"
      WHERE vpc_arch.Vendor = ?
      ORDER BY OrderDate DESC
    `, [req.user.id, req.user.id]);
    
    // Handle the result properly - MariaDB returns an array where each element is a row
    let orders = [];
    if (Array.isArray(ordersResult)) {
      // If first element is an array, it contains all rows
      if (Array.isArray(ordersResult[0])) {
        orders = ordersResult[0];
      } else {
        // Otherwise, each element is a row
        orders = ordersResult;
      }
    } else if (ordersResult) {
      // If it's a single object, make it an array
      orders = [ordersResult];
    }
    
    conn.release();
    res.json({ orders });
  } catch (err) {
    console.error('Orders fetch error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Assign courier to order (manual assignment by vendor)
router.post('/order/:id/assign-courier', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  const { courierId } = req.body;
  if (!courierId) return res.status(400).json({ error: 'Missing courierId' });
  
  try {
    const conn = await db.getConnection();
    
    // Verify vendor owns this order
    const [orderCheck] = await conn.query(
      'SELECT * FROM VendorProductCustomerCourier WHERE PurchaseId = ? AND Vendor = ?',
      [req.params.id, req.user.id]
    );
    
    if (!orderCheck || orderCheck.length === 0) {
      conn.release();
      return res.status(403).json({ error: 'Order not found or access denied' });
    }
    
    const order = orderCheck[0];
    
    // Prevent reassignment if order is already in progress (ready for pickup, dispatched, etc.)
    if (order.IsReady_for_Pickup_by_Courier === 'Y' || 
        order.IsDispatched === 'Y' || 
        order.IsOut_for_Delivery === 'Y' || 
        order.IsDelivered === 'Y' || 
        order.IsReturned === 'Y') {
      conn.release();
      return res.status(400).json({ error: 'Cannot reassign courier - order is already in progress or completed' });
    }
    
    // Verify courier exists and is active
    const [courierCheck] = await conn.query(
      'SELECT UserId FROM User WHERE UserId = ? AND IsCourier = "Y" AND IsActivated = "Y"',
      [courierId]
    );
    
    if (!courierCheck || courierCheck.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'Invalid or inactive courier' });
    }
    
    // Update VendorProductCustomerCourier table - Assign courier (don't mark as picked up yet)
    await conn.query(
      'UPDATE VendorProductCustomerCourier SET Courier = ? WHERE PurchaseId = ?',
      [courierId, req.params.id]
    );
    
    console.log(`NOTIFICATION: Vendor ${req.user.id} assigned order ${req.params.id} to courier ${courierId}`);
    
    conn.release();
    res.json({ message: 'Courier assigned successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark order as ready for pickup
router.put('/order/:id/ready', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // Verify vendor owns this order
    const orderCheckResult = await conn.query(
      'SELECT * FROM VendorProductCustomerCourier WHERE PurchaseId = ? AND Vendor = ?',
      [req.params.id, req.user.id]
    );
    
    // Handle query result
    let orderCheck = [];
    if (Array.isArray(orderCheckResult)) {
      if (Array.isArray(orderCheckResult[0])) {
        orderCheck = orderCheckResult[0];
      } else {
        orderCheck = orderCheckResult;
      }
    } else if (orderCheckResult) {
      orderCheck = [orderCheckResult];
    }
    
    if (!orderCheck || orderCheck.length === 0) {
      conn.release();
      return res.status(403).json({ error: 'Order not found or access denied' });
    }
    
    const order = orderCheck[0];
    
    // Check if already marked as ready
    if (order.IsReady_for_Pickup_by_Courier === 'Y') {
      conn.release();
      return res.status(400).json({ error: 'Order already marked as ready for pickup' });
    }
    
    // Auto-assign courier from vendorproduct if not already assigned
    let courierId = order.Courier;
    if (!courierId || courierId === 0) {
      // Get the default courier from vendorproduct table
      const [vendorProductResult] = await conn.query(
        'SELECT Courier FROM VendorProduct WHERE Product = ? AND Vendor = ?',
        [order.Product, order.Vendor]
      );
      
      if (vendorProductResult && vendorProductResult.length > 0) {
        courierId = vendorProductResult[0].Courier;
        
        // Update the order with the default courier
        await conn.query(
          'UPDATE VendorProductCustomerCourier SET Courier = ? WHERE PurchaseId = ?',
          [courierId, req.params.id]
        );
      }
    }
    
    if (!courierId || courierId === 0) {
      conn.release();
      return res.status(400).json({ error: 'Cannot mark ready for pickup - no courier assigned' });
    }
    
    // Generate a unique tracking number
    const trackingNumber = `TRK${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Update VendorProductCustomerCourier table
    await conn.query(
      'UPDATE VendorProductCustomerCourier SET IsReady_for_Pickup_by_Courier = "Y", Ready_for_Pickup_by_CourierTimeStamp = NOW(), TrackingNo = ? WHERE PurchaseId = ?',
      [trackingNumber, req.params.id]
    );
    
    // Create notifications for Ready for Pickup status
    try {
      console.log(`NOTIFICATION: Order ${req.params.id} marked as ready for pickup by vendor ${req.user.id}`);
      
      // Get order details for notification messages
      const orderDetailsResult = await conn.query(
        `SELECT 
          vpc.PurchaseId,
          vpc.Customer,
          vpc.Courier,
          vpc.Vendor,
          p.Product,
          c.Customer as CustomerName
         FROM VendorProductCustomerCourier vpc
         JOIN Product p ON vpc.Product = p.ProductId
         JOIN Customer c ON vpc.Customer = c.CustomerId
         WHERE vpc.PurchaseId = ?`,
        [req.params.id]
      );
      
      // Handle MariaDB result format
      let orderDetails = [];
      if (Array.isArray(orderDetailsResult)) {
        if (Array.isArray(orderDetailsResult[0])) {
          orderDetails = orderDetailsResult[0];
        } else {
          orderDetails = orderDetailsResult;
        }
      }
      
      if (orderDetails && orderDetails.length > 0) {
        const order = orderDetails[0];
        console.log(`NOTIFICATION DEBUG: Creating ready for pickup notifications for order ${req.params.id}`);
        console.log(`NOTIFICATION DEBUG: Customer ID: ${order.Customer}, Vendor ID: ${order.Vendor}, Courier ID: ${order.Courier}`);
        
        // Create customer notification
        await conn.query(
          `INSERT INTO notification_customer 
           (CustomerId, Type, Message, IsRead, RecordCreationTimeStamp) 
           VALUES (?, ?, ?, 'N', NOW())`,
          [order.Customer, 'Order Update', `Your order #${req.params.id} for ${order.Product} is now ready for pickup by the courier. We'll keep you updated on its delivery status.`]
        );
        console.log(`NOTIFICATION DEBUG: Customer notification created for CustomerId: ${order.Customer}`);
        
        // Create vendor notification (confirmation)
        await conn.query(
          `INSERT INTO notification_user 
           (UserId, Type, Message, IsRead, RecordCreationTimeStamp) 
           VALUES (?, ?, ?, 'N', NOW())`,
          [order.Vendor, 'Order Update', `Order #${req.params.id} for ${order.Product} has been marked as ready for pickup. The courier will be notified.`]
        );
        console.log(`NOTIFICATION DEBUG: Vendor notification created for UserId: ${order.Vendor}`);
        
        // Create courier notification if courier is assigned
        if (order.Courier && order.Courier !== 0) {
          // Verify courier exists and is active
          const courierCheckResult = await conn.query(
            'SELECT UserId FROM User WHERE UserId = ? AND IsCourier = "Y" AND IsBlackListed != "Y"',
            [order.Courier]
          );
          
          // Handle MariaDB result format
          let courierCheck = [];
          if (Array.isArray(courierCheckResult)) {
            if (Array.isArray(courierCheckResult[0])) {
              courierCheck = courierCheckResult[0];
            } else {
              courierCheck = courierCheckResult;
            }
          }
          
          if (courierCheck && courierCheck.length > 0) {
            await conn.query(
              `INSERT INTO notification_user 
               (UserId, Type, Message, IsRead, RecordCreationTimeStamp) 
               VALUES (?, ?, ?, 'N', NOW())`,
              [order.Courier, 'Order Update', `Order #${req.params.id} for ${order.Product} is now ready for pickup. Please collect it from the vendor.`]
            );
            console.log(`NOTIFICATION DEBUG: Courier notification created for UserId: ${order.Courier}`);
          } else {
            console.log(`NOTIFICATION DEBUG: No courier notification created. Courier not found or inactive. Courier ID: ${order.Courier}`);
          }
        } else {
          console.log(`NOTIFICATION DEBUG: No courier notification created. No courier assigned. Courier ID: ${order.Courier}`);
        }
        
        console.log(`NOTIFICATION: Created ready for pickup notifications for order ${req.params.id}`);
      } else {
        console.log(`NOTIFICATION DEBUG: Could not find order details for notification. Order ID: ${req.params.id}`);
      }
    } catch (notificationError) {
      console.error('Error creating ready for pickup notifications:', notificationError);
      // Don't fail the ready for pickup operation if notification fails
    }
    
    conn.release();
    res.json({ message: 'Order marked as ready for pickup', trackingNumber });
  } catch (err) {
    console.error('Mark ready error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Update order status with product details
router.put('/order/:id/status', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  const { status, courierId, trackingNumber } = req.body;
  if (!status) return res.status(400).json({ error: 'Missing status' });
  
  try {
    const conn = await db.getConnection();
    
    // Update Purchase table status
    await conn.query('UPDATE Purchase SET OrderStatus = ? WHERE PuchaseId = ?', [status, req.params.id]);
    
    // Update VendorProductCustomerCourier table - ONLY vendor-specific fields
    const updateFields = [];
    const updateValues = [];
    
    if (courierId) {
      updateFields.push('Courier = ?');
      updateValues.push(courierId);
    }
    
    if (trackingNumber) {
      updateFields.push('TrackingNo = ?');
      updateValues.push(trackingNumber);
      
      // Also update the ready for pickup timestamp when tracking number is provided
      updateFields.push('IsReady_for_Pickup_by_Courier = "Y", Ready_for_Pickup_by_CourierTimeStamp = NOW()');
    }
    
    // Vendors should NOT update delivery status fields - only couriers can do that
    // These fields are intentionally omitted:
    // - IsDispatched
    // - IsOut_for_Delivery
    // - IsDelivered
    
    if (updateFields.length > 0) {
      await conn.query(
        `UPDATE VendorProductCustomerCourier SET ${updateFields.join(', ')} WHERE PurchaseId = ?`,
        [...updateValues, req.params.id]
      );
    }
    
    // Get updated order details with product info
    const updatedOrderResult = await conn.query(
      'SELECT p.*, vpc.Courier, vpc.TrackingNo, ' +
      'pr.Product, pr.MRP as ProductPrice, ' +
      'c.Customer, c.CustomerEmail, c.CustomerMobile ' +
      'FROM Purchase p ' +
      'JOIN VendorProductCustomerCourier vpc ON p.PuchaseId = vpc.PurchaseId ' +
      'JOIN Product pr ON vpc.Product = pr.ProductId ' +
      'JOIN Customer c ON vpc.Customer = c.CustomerId ' +
      'WHERE p.PuchaseId = ? AND vpc.Vendor = ?',
      [req.params.id, req.user.id]
    );
    
    // Handle MariaDB result format
    let updatedOrder = [];
    if (Array.isArray(updatedOrderResult)) {
      if (Array.isArray(updatedOrderResult[0])) {
        updatedOrder = updatedOrderResult[0];
      } else {
        updatedOrder = updatedOrderResult;
      }
    } else if (updatedOrderResult) {
      updatedOrder = [updatedOrderResult];
    }
    
    conn.release();
    res.json({ 
      message: 'Order status updated',
      order: updatedOrder[0] || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tracking events for order with product details
router.get('/order/:id/tracking', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    
    // Get order details with product info and tracking information
    const orderResult = await conn.query(
      'SELECT vpc.PurchaseId as PuchaseId, vpc.Vendor, COALESCE(vpc.Courier, vp.Courier) as Courier, vpc.TrackingNo, ' +
      'vpc.IsReady_for_Pickup_by_Courier, vpc.Ready_for_Pickup_by_CourierTimeStamp, ' +
      'vpc.IsPicked_by_Courier, vpc.Picked_by_CourierTimeStamp, ' +
      'vpc.IsDispatched, vpc.DispatchedTimeStamp, ' +
      'vpc.IsOut_for_Delivery, vpc.Out_for_DeliveryTimeStamp, ' +
      'vpc.IsDelivered, vpc.DeliveryTimeStamp, ' +
      'vpc.IsReturned, vpc.ReturnTimeStamp, ' +
      'COALESCE(p.OrderStatus, "Pending") as OrderStatus, ' +
      'COALESCE(p.TotalAmount, 0) as TotalAmount, ' +
      'COALESCE(p.OrderDate, vpc.OrderCreationTimeStamp) as OrderDate, ' +
      'vpc.OrderCreationTimeStamp, ' +
      'pr.Product, pr.MRP as ProductPrice, ' +
      'c.Customer, c.CustomerEmail, c.CustomerMobile ' +
      'FROM VendorProductCustomerCourier vpc ' +
      'JOIN VendorProduct vp ON vpc.Product = vp.Product AND vpc.Vendor = vp.Vendor ' +
      'LEFT JOIN Purchase p ON p.PuchaseId = vpc.PurchaseId ' +
      'JOIN Product pr ON vpc.Product = pr.ProductId ' +
      'JOIN Customer c ON vpc.Customer = c.CustomerId ' +
      'LEFT JOIN User u ON vpc.Courier = u.UserId AND u.IsCourier = "Y" ' +
      'LEFT JOIN User default_u ON vp.Courier = default_u.UserId AND default_u.IsCourier = "Y" ' +
      'WHERE vpc.PurchaseId = ? AND vpc.Vendor = ?',
      [req.params.id, req.user.id]
    );
    
    // Handle MariaDB result format
    let order = [];
    if (Array.isArray(orderResult)) {
      if (Array.isArray(orderResult[0])) {
        order = orderResult[0];
      } else {
        order = orderResult;
      }
    } else if (orderResult) {
      order = [orderResult];
    }
    
    if (!order || order.length === 0) {
      console.log(`Tracking order not found: ID=${req.params.id}, Vendor=${req.user.id}`);
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Generate tracking events based on the order status fields
    const trackingEvents = [];
    const orderData = order[0];

    if (!orderData) {
      console.log(`Tracking order data not found: ID=${req.params.id}, Vendor=${req.user.id}`);
      return res.status(404).json({ error: 'Order data not found' });
    }
    
    // Add order placed event
    trackingEvents.push({
      TrackingEventId: 1,
      PurchaseId: orderData.PuchaseId,
      status: "Order Placed",
      location: "Warehouse",
      description: `Order #${orderData.PuchaseId} was placed by customer.`,
      timestamp: orderData.OrderCreationTimeStamp
    });
    
    // Add status updates based on order fields
    if (orderData.IsPicked_by_Courier === 'Y') {
      trackingEvents.push({
        TrackingEventId: 2,
        PurchaseId: orderData.PuchaseId,
        status: "Courier Accepted",
        location: "Vendor Location",
        description: `Order #${orderData.PuchaseId} accepted by courier.`,
        timestamp: orderData.Picked_by_CourierTimeStamp
      });
    }
    
    if (orderData.IsReady_for_Pickup_by_Courier === 'Y') {
      trackingEvents.push({
        TrackingEventId: 3,
        PurchaseId: orderData.PuchaseId,
        status: "Ready for Pickup",
        location: "Vendor Location",
        description: `Order #${orderData.PuchaseId} marked ready for pickup by vendor.`,
        timestamp: orderData.Ready_for_Pickup_by_CourierTimeStamp
      });
    }
    
    if (orderData.IsDispatched === 'Y') {
      trackingEvents.push({
        TrackingEventId: 4,
        PurchaseId: orderData.PuchaseId,
        status: "Shipped",
        location: "Distribution Center",
        description: `Order #${orderData.PuchaseId} has been shipped and is ready for delivery.`,
        timestamp: orderData.DispatchedTimeStamp
      });
    }
    
    if (orderData.IsOut_for_Delivery === 'Y') {
      trackingEvents.push({
        TrackingEventId: 5,
        PurchaseId: orderData.PuchaseId,
        status: "Out for Delivery",
        location: "Local Delivery Hub",
        description: `Order #${orderData.PuchaseId} is out for delivery.`,
        timestamp: orderData.Out_for_DeliveryTimeStamp
      });
    }
    
    if (orderData.IsDelivered === 'Y') {
      trackingEvents.push({
        TrackingEventId: 6,
        PurchaseId: orderData.PuchaseId,
        status: "Delivered",
        location: "Customer Address",
        description: `Order #${orderData.PuchaseId} has been successfully delivered.`,
        timestamp: orderData.DeliveryTimeStamp
      });
    } else if (orderData.IsReturned === 'Y') {
      trackingEvents.push({
        TrackingEventId: 6,
        PurchaseId: orderData.PuchaseId,
        status: "Returned",
        location: "Vendor Location",
        description: `Order #${orderData.PuchaseId} has been returned.`,
        timestamp: orderData.ReturnTimeStamp
      });
    }
    
    res.json({ 
      trackingEvents,
      order: orderData
    });
  } catch (err) {
    console.error('Vendor tracking error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// Add tracking event (RESTRICTED - Only couriers can update delivery status)
router.post('/order/:id/tracking', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  // Vendors should NOT be able to update delivery status fields
  // Only couriers can update these fields for security and logical workflow reasons
  return res.status(403).json({ error: 'Only couriers can update delivery status. Please contact the assigned courier for delivery updates.' });
});

// View order details with product details
router.get('/order/:id', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    
    // First check the active table
    const orderResult = await conn.query(
      'SELECT vpc.PurchaseId as PuchaseId, vpc.Vendor, vpc.Product as ProductId, vpc.Customer as CustomerId, ' +
      'COALESCE(vpc.Courier, vp.Courier) as CourierId, vpc.TrackingNo, ' +
      'vpc.IsReady_for_Pickup_by_Courier, vpc.Ready_for_Pickup_by_CourierTimeStamp, ' +
      'vpc.IsPicked_by_Courier, vpc.Picked_by_CourierTimeStamp, ' +
      'vpc.IsDispatched, vpc.DispatchedTimeStamp, ' +
      'vpc.IsOut_for_Delivery, vpc.Out_for_DeliveryTimeStamp, ' +
      'vpc.IsDelivered, vpc.DeliveryTimeStamp, ' +
      'vpc.IsReturned, vpc.ReturnTimeStamp, ' +
      'vpc.MRP_SS, vpc.Discount_SS, vpc.GST_SS, vpc.PurchaseQty, ' +
      'vpc.OrderCreationTimeStamp, ' +
      'COALESCE(prch.PaymentMode, "COD") as PaymentMode, ' +
      'COALESCE(prch.PaymentStatus, "Pending") as PaymentStatus, ' +
      'COALESCE(prch.OrderDate, vpc.OrderCreationTimeStamp) as OrderDate, ' +
      'COALESCE(prch.TotalAmount, 0) as TotalAmount, ' +
      'CASE ' +
      '  WHEN vpc.IsDelivered = "Y" THEN "Delivered" ' +
      '  WHEN vpc.IsReturned = "Y" THEN "Returned" ' +
      '  WHEN vpc.IsOut_for_Delivery = "Y" THEN "Out for Delivery" ' +
      '  WHEN vpc.IsDispatched = "Y" THEN "Dispatched" ' +
      '  WHEN vpc.IsReady_for_Pickup_by_Courier = "Y" THEN "Ready for Pickup" ' +
      '  WHEN COALESCE(vpc.Courier, vp.Courier) = 0 THEN "No Courier Assigned" ' +
      '  ELSE "Order Placed" ' +
      'END as OrderStatus, ' +
      'CASE ' +
      '  WHEN COALESCE(vpc.Courier, vp.Courier) = 0 THEN "No Courier Assigned" ' +
      '  WHEN vpc.IsPicked_by_Courier = "Y" THEN "Courier Assigned" ' +
      '  WHEN vpc.IsReturned = "Y" THEN "Rejected" ' +
      '  WHEN vpc.IsReady_for_Pickup_by_Courier = "Y" THEN "Ready for Pickup" ' +
      '  ELSE "Courier Assigned" ' +
      'END as CourierAcceptanceStatus, ' +
      'pr.Product, pr.MRP as ProductPrice, ' +
      'c.Customer, c.CustomerEmail, c.CustomerMobile, c.Address as CustomerAddress, c.Locality, ' +
      'COALESCE(u.User, default_u.User) as CourierName, COALESCE(u.UserMobile, default_u.UserMobile) as CourierMobile, ' +
      '"Active" as OrderCategory ' +
      'FROM VendorProductCustomerCourier vpc ' +
      'JOIN VendorProduct vp ON vpc.Product = vp.Product AND vpc.Vendor = vp.Vendor ' +
      'LEFT JOIN Purchase prch ON prch.PuchaseId = vpc.PurchaseId ' +
      'JOIN Product pr ON vpc.Product = pr.ProductId ' +
      'JOIN Customer c ON vpc.Customer = c.CustomerId ' +
      'LEFT JOIN User u ON vpc.Courier = u.UserId AND u.IsCourier = "Y" ' +
      'LEFT JOIN User default_u ON vp.Courier = default_u.UserId AND default_u.IsCourier = "Y" ' +
      'WHERE vpc.PurchaseId = ? AND vpc.Vendor = ?',
      [req.params.id, req.user.id]
    );
    
    // Handle MariaDB result format
    let order = [];
    if (Array.isArray(orderResult)) {
      if (Array.isArray(orderResult[0])) {
        order = orderResult[0];
      } else {
        order = orderResult;
      }
    } else if (orderResult) {
      order = [orderResult];
    }
    
    // If no active order found, check archived table
    if (!order || order.length === 0) {
      const archivedOrderResult = await conn.query(
        'SELECT vpc_arch.PurchaseId as PuchaseId, vpc_arch.Vendor, vpc_arch.Product as ProductId, vpc_arch.Customer as CustomerId, ' +
        'vpc_arch.Courier as CourierId, vpc_arch.TrackingNo, ' +
        'vpc_arch.IsReady_for_Pickup_by_Courier, vpc_arch.Ready_for_Pickup_by_CourierTimeStamp, ' +
        'vpc_arch.IsPicked_by_Courier, vpc_arch.Picked_by_CourierTimeStamp, ' +
        'vpc_arch.IsDispatched, vpc_arch.DispatchedTimeStamp, ' +
        'vpc_arch.IsOut_for_Delivery, vpc_arch.Out_for_DeliveryTimeStamp, ' +
        'vpc_arch.IsDelivered, vpc_arch.DeliveryTimeStamp, ' +
        'vpc_arch.IsReturned, vpc_arch.ReturnTimeStamp, ' +
        'vpc_arch.MRP_SS, vpc_arch.Discount_SS, vpc_arch.GST_SS, vpc_arch.PurchaseQty, ' +
        'vpc_arch.OrderCreationTimeStamp, ' +
        'COALESCE(prch_arch.PaymentMode, "COD") as PaymentMode, ' +
        'COALESCE(prch_arch.PaymentStatus, "Pending") as PaymentStatus, ' +
        'COALESCE(prch_arch.OrderDate, vpc_arch.OrderCreationTimeStamp) as OrderDate, ' +
        'COALESCE(prch_arch.TotalAmount, 0) as TotalAmount, ' +
        'CASE ' +
        '  WHEN vpc_arch.IsDelivered = "Y" THEN "Delivered" ' +
        '  WHEN vpc_arch.IsReturned = "Y" THEN "Returned" ' +
        '  WHEN vpc_arch.IsOut_for_Delivery = "Y" THEN "Out for Delivery" ' +
        '  WHEN vpc_arch.IsDispatched = "Y" THEN "Dispatched" ' +
        '  WHEN vpc_arch.IsReady_for_Pickup_by_Courier = "Y" THEN "Ready for Pickup" ' +
        '  WHEN COALESCE(vpc_arch.Courier, 0) = 0 THEN "No Courier Assigned" ' +
        '  ELSE "Order Placed" ' +
        'END as OrderStatus, ' +
        'CASE ' +
        '  WHEN COALESCE(vpc_arch.Courier, 0) = 0 THEN "No Courier Assigned" ' +
        '  WHEN vpc_arch.IsPicked_by_Courier = "Y" THEN "Courier Assigned" ' +
        '  WHEN vpc_arch.IsReturned = "Y" THEN "Rejected" ' +
        '  WHEN vpc_arch.IsReady_for_Pickup_by_Courier = "Y" THEN "Ready for Pickup" ' +
        '  ELSE "Courier Assigned" ' +
        'END as CourierAcceptanceStatus, ' +
        'pr.Product, pr.MRP as ProductPrice, ' +
        'c.Customer, c.CustomerEmail, c.CustomerMobile, c.Address as CustomerAddress, c.Locality, ' +
        'u.User as CourierName, u.UserMobile as CourierMobile, ' +
        '"Archived" as OrderCategory ' +
        'FROM vendorproductcustomercourier_arch vpc_arch ' +
        'LEFT JOIN purchase_arch prch_arch ON prch_arch.PuchaseId = vpc_arch.PurchaseId ' +
        'JOIN Product pr ON vpc_arch.Product = pr.ProductId ' +
        'JOIN Customer c ON vpc_arch.Customer = c.CustomerId ' +
        'LEFT JOIN User u ON vpc_arch.Courier = u.UserId AND u.IsCourier = "Y" ' +
        'WHERE vpc_arch.PurchaseId = ? AND vpc_arch.Vendor = ?',
        [req.params.id, req.user.id]
      );
      
      // Handle MariaDB result format for archived query
      if (Array.isArray(archivedOrderResult)) {
        if (Array.isArray(archivedOrderResult[0])) {
          order = archivedOrderResult[0];
        } else {
          order = archivedOrderResult;
        }
      } else if (archivedOrderResult) {
        order = [archivedOrderResult];
      }
    }
    
    console.log(`ORDER FETCH DEBUG: Query returned ${order.length} results for ID=${req.params.id}, Vendor=${req.user.id}`);
    console.log(`ORDER FETCH DEBUG: Processed order array:`, order);
    
    if (!order || order.length === 0) {
      console.log(`Order not found: ID=${req.params.id}, Vendor=${req.user.id}`);
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ order: order[0] });
  } catch (err) {
    console.error('Vendor order details error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// Get customer address hierarchy
router.get('/customer/address-hierarchy/:localityId', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  try {
    const { localityId } = req.params;
    
    // Handle case where localityId is 0 or invalid
    if (!localityId || localityId === '0' || isNaN(localityId)) {
      return res.json({
        locality: "",
        district: "",
        state: "",
        country: "",
        continent: ""
      });
    }
    
    const conn = await db.getConnection();
    
    // Get locality info
    const [localityRow] = await conn.query('SELECT Locality, District FROM locality WHERE LocalityId = ? AND IsDeleted != "Y"', [localityId]);
    
    // If locality doesn't exist, return empty hierarchy
    if (!localityRow) {
      conn.release();
      return res.json({
        locality: "",
        district: "",
        state: "",
        country: "",
        continent: ""
      });
    }
    
    const locality = localityRow.Locality || "";
    const districtId = localityRow.District;
    
    // Get district info
    let district = "";
    let stateId = 0;
    if (districtId && districtId !== 0 && !isNaN(districtId)) {
      const [districtRow] = await conn.query('SELECT District, State FROM district WHERE DistrictId = ? AND IsDeleted != "Y"', [districtId]);
      if (districtRow && districtRow.District) {
        district = districtRow.District || "";
        stateId = districtRow.State;
      }
    }
    
    // Get state info
    let state = "";
    let countryId = 0;
    if (stateId && stateId !== 0 && !isNaN(stateId)) {
      const [stateRow] = await conn.query('SELECT State, Country FROM state WHERE StateId = ? AND IsDeleted != "Y"', [stateId]);
      if (stateRow && stateRow.State) {
        state = stateRow.State || "";
        countryId = stateRow.Country;
      }
    }
    
    // Get country info
    let country = "";
    let continentId = 0;
    if (countryId && countryId !== 0 && !isNaN(countryId)) {
      const [countryRow] = await conn.query('SELECT Country, Continent FROM country WHERE CountryId = ? AND IsDeleted != "Y"', [countryId]);
      if (countryRow && countryRow.Country) {
        country = countryRow.Country || "";
        continentId = countryRow.Continent;
      }
    }
    
    // Get continent info
    let continent = "";
    if (continentId && continentId !== 0 && !isNaN(continentId)) {
      const [continentRow] = await conn.query('SELECT Continent FROM continent WHERE ContinentId = ? AND IsDeleted != "Y"', [continentId]);
      if (continentRow && continentRow.Continent) {
        continent = continentRow.Continent || "";
      }
    }
    
    conn.release();
    
    res.json({
      locality,
      district,
      state,
      country,
      continent
    });
  } catch (err) {
    console.error('Vendor address hierarchy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;