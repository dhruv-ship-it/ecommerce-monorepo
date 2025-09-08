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
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function vendorOnlyMiddleware(req, res, next) {
  if (req.user.role === 'vendor') return next();
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
  try {
    console.log('=== DEBUG: Couriers Request ===');
    
    const conn = await db.getConnection();
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
    
    conn.release();
    res.json({ couriers: couriersData });
  } catch (err) {
    console.error('Couriers error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Server error' });
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
    const [orders] = await conn.query(`
      SELECT 
        vpc.PurchaseId as PuchaseId,
        vpc.Product as ProductId,
        p.Product,
        p.MRP as ProductPrice,
        vpc.Customer as CustomerId,
        vpc.OrderCreationTimeStamp as OrderDate,
        vpc.MRP_SS as TotalAmount,
        'COD' as PaymentMode,
        'Pending' as PaymentStatus,
        vpc.Courier as CourierId,
        vpc.Vendor as VendorId,
        c.Customer as CustomerName,
        c.CustomerEmail,
        c.CustomerMobile,
        u.User as CourierName,
        u.UserMobile as CourierMobile,
        CASE 
          WHEN vpc.IsDelivered = 'Y' THEN 'Delivered'
          WHEN vpc.IsReturned = 'Y' THEN 'Returned'
          WHEN vpc.IsOut_for_Delivery = 'Y' THEN 'Out for Delivery'
          WHEN vpc.IsDispatched = 'Y' THEN 'Dispatched'
          WHEN vpc.IsPicked_by_Courier = 'Y' AND vpc.IsReady_for_Pickup_by_Courier = 'Y' THEN 'Ready for Pickup'
          WHEN vpc.IsPicked_by_Courier = 'Y' THEN 'Accepted by Courier'
          WHEN vpc.Courier = 0 THEN 'No Courier Assigned'
          ELSE 'Pending Courier Acceptance'
        END as OrderStatus
      FROM VendorProductCustomerCourier vpc
      JOIN Product p ON vpc.Product = p.ProductId
      JOIN Customer c ON vpc.Customer = c.CustomerId
      LEFT JOIN User u ON vpc.Courier = u.UserId
      WHERE vpc.Vendor = ? AND vpc.IsDeleted != 'Y'
      ORDER BY vpc.OrderCreationTimeStamp DESC
    `, [req.user.id]);
    conn.release();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
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
    
    // CRITICAL: Prevent courier reassignment after acceptance
    if (order.IsPicked_by_Courier === 'Y') {
      conn.release();
      return res.status(400).json({ error: 'Cannot reassign courier - order has already been accepted by current courier' });
    }
    
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
    
    // Only allow assignment if no courier is currently assigned or current courier hasn't accepted
    if (order.Courier !== 0 && order.Courier !== courierId) {
      conn.release();
      return res.status(400).json({ error: 'Order already has a courier assigned. Cancel current assignment first if needed.' });
    }
    
    // Update VendorProductCustomerCourier table - Only assign courier, don't mark as ready
    await conn.query(
      'UPDATE VendorProductCustomerCourier SET Courier = ? WHERE PurchaseId = ?',
      [courierId, req.params.id]
    );
    
    conn.release();
    res.json({ message: 'Courier assigned successfully - waiting for courier acceptance' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark order as ready for pickup - ONLY after courier has accepted
router.put('/order/:id/ready', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
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
    
    // CRITICAL: Courier must have accepted the order first
    if (order.IsPicked_by_Courier !== 'Y') {
      conn.release();
      return res.status(400).json({ error: 'Cannot mark ready for pickup - courier has not accepted the order yet' });
    }
    
    // Check if already marked as ready
    if (order.IsReady_for_Pickup_by_Courier === 'Y') {
      conn.release();
      return res.status(400).json({ error: 'Order already marked as ready for pickup - cannot undo' });
    }
    
    // Update VendorProductCustomerCourier table
    await conn.query(
      'UPDATE VendorProductCustomerCourier SET IsReady_for_Pickup_by_Courier = "Y", Ready_for_Pickup_by_CourierTimeStamp = NOW() WHERE PurchaseId = ?',
      [req.params.id]
    );
    
    conn.release();
    res.json({ message: 'Order marked as ready for pickup - courier will be notified' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
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
    
    // Update VendorProductCustomerCourier table
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
    
    if (status === 'Shipped') {
      updateFields.push('IsDispatched = "Y", DispatchedTimeStamp = NOW()');
    } else if (status === 'Out for Delivery') {
      updateFields.push('IsOut_for_Delivery = "Y", Out_for_DeliveryTimeStamp = NOW()');
    } else if (status === 'Delivered') {
      updateFields.push('IsDelivered = "Y", DeliveryTimeStamp = NOW()');
    }
    
    if (updateFields.length > 0) {
      await conn.query(
        `UPDATE VendorProductCustomerCourier SET ${updateFields.join(', ')} WHERE PurchaseId = ?`,
        [...updateValues, req.params.id]
      );
    }
    
    // Get updated order details with product info
    const [updatedOrder] = await conn.query(
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
    
    conn.release();
    res.json({ 
      message: 'Order status updated',
      order: updatedOrder[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tracking events for order with product details
router.get('/order/:id/tracking', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // Get order details with product info and tracking information
    const [order] = await conn.query(
      'SELECT p.*, vpc.Vendor, vpc.Courier, vpc.TrackingNo, ' +
      'vpc.IsReady_for_Pickup_by_Courier, vpc.Ready_for_Pickup_by_CourierTimeStamp, ' +
      'vpc.IsPicked_by_Courier, vpc.Picked_by_CourierTimeStamp, ' +
      'vpc.IsDispatched, vpc.DispatchedTimeStamp, ' +
      'vpc.IsOut_for_Delivery, vpc.Out_for_DeliveryTimeStamp, ' +
      'vpc.IsDelivered, vpc.DeliveryTimeStamp, ' +
      'vpc.IsReturned, vpc.ReturnTimeStamp, ' +
      'p.OrderStatus, p.TotalAmount, p.OrderDate, ' +
      'pr.Product, pr.MRP as ProductPrice, ' +
      'c.Customer, c.CustomerEmail, c.CustomerMobile ' +
      'FROM Purchase p ' +
      'JOIN VendorProductCustomerCourier vpc ON p.PuchaseId = vpc.PurchaseId ' +
      'JOIN Product pr ON vpc.Product = pr.ProductId ' +
      'JOIN Customer c ON vpc.Customer = c.CustomerId ' +
      'WHERE p.PuchaseId = ? AND vpc.Vendor = ?',
      [req.params.id, req.user.id]
    );
    
    conn.release();
    
    if (!order || order.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Generate tracking events based on the order status fields
    const trackingEvents = [];
    const orderData = order[0];
    
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
    res.status(500).json({ error: 'Server error' });
  }
});

// Add tracking event (dummy endpoint since tracking is in VendorProductCustomerCourier)
router.post('/order/:id/tracking', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  // Since tracking is stored in VendorProductCustomerCourier, we'll update the appropriate status field
  const { status, location, description } = req.body;
  if (!status || !location || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const conn = await db.getConnection();
    
    // Update the order status based on the tracking event
    let updateFields = '';
    if (status === 'Shipped') {
      updateFields = 'IsDispatched = "Y", DispatchedTimeStamp = NOW()';
    } else if (status === 'Out for Delivery') {
      updateFields = 'IsOut_for_Delivery = "Y", Out_for_DeliveryTimeStamp = NOW()';
    } else if (status === 'Delivered') {
      updateFields = 'IsDelivered = "Y", DeliveryTimeStamp = NOW()';
    } else if (status === 'Returned') {
      updateFields = 'IsReturned = "Y", ReturnTimeStamp = NOW()';
    }
    
    if (updateFields) {
      await conn.query(
        `UPDATE VendorProductCustomerCourier SET ${updateFields} WHERE PurchaseId = ?`,
        [req.params.id]
      );
    }
    
    conn.release();
    res.json({ message: 'Tracking event added' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// View order details with product details
router.get('/order/:id', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [order] = await conn.query(
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
    conn.release();
    
    if (!order || order.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ order: order[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 