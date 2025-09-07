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
    const conn = await db.getConnection();
    const [products] = await conn.query(`
      SELECT p.*, vp.VendorProductId, vp.Courier as DefaultCourier, vp.MRP_SS, vp.Discount, vp.GST_SS, vp.StockQty, vp.IsNotAvailable,
             u.User as CourierName, u.UserMobile as CourierMobile
      FROM Product p 
      JOIN VendorProduct vp ON p.ProductId = vp.Product 
      LEFT JOIN User u ON vp.Courier = u.UserId
      WHERE vp.Vendor = ? AND vp.IsDeleted != 'Y'
    `, [req.user.id]);
    conn.release();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all available products from Product table for vendor to choose from
router.get('/available-products', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    
    // First, check if Product table exists and get all products
    const allProductsResult = await conn.query(`
      SELECT ProductId, Product, MRP, ProductCategory_Gen, ProductSubCategory
      FROM Product 
      ORDER BY Product
    `);
    console.log('Raw allProductsResult:', allProductsResult);
    const allProducts = allProductsResult[0] || [];
    console.log('Processed allProducts:', allProducts);
    
    console.log(`Found ${allProducts ? allProducts.length : 'undefined'} total products in Product table`);
    
    // Then get products this vendor already has
    const vendorProductsResult = await conn.query(`
      SELECT DISTINCT Product FROM VendorProduct 
      WHERE Vendor = ? AND IsDeleted != 'Y'
    `, [req.user.id]);
    console.log('Raw vendorProductsResult:', vendorProductsResult);
    const vendorProducts = vendorProductsResult[0] || [];
    console.log('Processed vendorProducts:', vendorProducts);
    
    console.log(`Vendor ${req.user.id} has ${vendorProducts.length} products already`);
    
    // Filter out products vendor already has
    const vendorProductIds = Array.isArray(vendorProducts) ? vendorProducts.map(vp => vp.Product) : [];
    const availableProducts = Array.isArray(allProducts) ? allProducts.filter(p => !vendorProductIds.includes(p.ProductId)) : [];
    
    console.log(`Available products for vendor: ${availableProducts.length}`);
    
    conn.release();
    res.json({ products: availableProducts });
  } catch (err) {
    console.error('Available products error:', err);
    if (conn) conn.release();
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Add existing product to vendor catalog
router.post('/product/add-existing', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  const { productId, stockQty, sellingPrice, discount, gst, defaultCourierId } = req.body;
  if (!productId) return res.status(400).json({ error: 'Missing productId' });
  
  try {
    const conn = await db.getConnection();
    
    // Verify product exists in Product table
    const [product] = await conn.query('SELECT * FROM Product WHERE ProductId = ?', [productId]);
    if (!product || product.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Product not found in catalog' });
    }
    
    // Check if vendor already has this product
    const [existing] = await conn.query(
      'SELECT * FROM VendorProduct WHERE Vendor = ? AND Product = ? AND IsDeleted != "Y"',
      [req.user.id, productId]
    );
    
    if (existing && existing.length > 0) {
      // Product already exists - increase stock quantity instead of creating duplicate
      const newStockQty = existing[0].StockQty + (stockQty || 0);
      await conn.query(
        'UPDATE VendorProduct SET StockQty = ?, LastUpdationLogin = ? WHERE VendorProductId = ?',
        [newStockQty, req.user.id, existing[0].VendorProductId]
      );
      conn.release();
      return res.json({ 
        message: `Stock quantity increased! Previous: ${existing[0].StockQty}, Added: ${stockQty || 0}, New Total: ${newStockQty}`,
        action: 'stock_increased',
        previousStock: existing[0].StockQty,
        addedStock: stockQty || 0,
        newStock: newStockQty
      });
    }
    
    // Add new product to vendor catalog
    await conn.query(`
      INSERT INTO VendorProduct (Vendor, Product, Courier, MRP_SS, Discount, GST_SS, StockQty, IsNotAvailable, IsDeleted, RecordCreationLogin) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'N', 'N', ?)
    `, [req.user.id, productId, defaultCourierId || 0, sellingPrice || product[0].MRP, discount || 0, gst || 0, stockQty || 0, req.user.id]);
    
    conn.release();
    res.json({ 
      message: 'Product added to your catalog successfully',
      action: 'product_added',
      stockQty: stockQty || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update vendor-product details only (vendors cannot modify Product table)
router.put('/product/:id', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  const { defaultCourierId, stockQty, discount, gst, sellingPrice, isNotAvailable } = req.body;
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
    
    // Update only vendor-product relationship (pricing, stock, courier, availability)
    await conn.query(`
      UPDATE VendorProduct SET 
        Courier = ?, MRP_SS = ?, Discount = ?, GST_SS = ?, StockQty = ?, 
        IsNotAvailable = ?, LastUpdationLogin = ?
      WHERE VendorProductId = ? AND Vendor = ?
    `, [defaultCourierId || vendorProduct[0].Courier, sellingPrice || vendorProduct[0].MRP_SS, discount || vendorProduct[0].Discount, gst || vendorProduct[0].GST_SS, stockQty || vendorProduct[0].StockQty, isNotAvailable || vendorProduct[0].IsNotAvailable, req.user.id, req.params.id, req.user.id]);
    
    conn.release();
    res.json({ message: 'Product updated successfully in your catalog' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update stock quantity only (quick stock management)
router.put('/product/:id/stock', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  const { stockQty } = req.body;
  if (stockQty === undefined || stockQty < 0) return res.status(400).json({ error: 'Invalid stock quantity' });
  
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

// Delete product
router.delete('/product/:id', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    await conn.query('DELETE FROM Product WHERE ProductId = ? AND ProductId IN (SELECT Product FROM VendorProductCustomerCourier WHERE Vendor = ?)', [req.params.id, req.user.id]);
    conn.release();
    res.json({ message: 'Product deleted' });
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
        vpc.VendorProductCustomerCourierId as PuchaseId,
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

// Get available couriers for assignment
router.get('/couriers', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [couriers] = await conn.query(
      'SELECT UserId, User, UserMobile, UserEmail FROM User WHERE IsCourier = "Y" AND IsActivated = "Y" AND IsBlackListed != "Y"'
    );
    conn.release();
    res.json({ couriers });
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
      'SELECT * FROM VendorProductCustomerCourier WHERE VendorProductCustomerCourierId = ? AND Vendor = ?',
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
      'SELECT UserId FROM User WHERE UserId = ? AND UserRole = "courier" AND IsActivated = "Y"',
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
      'UPDATE VendorProductCustomerCourier SET Courier = ? WHERE VendorProductCustomerCourierId = ?',
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
      'SELECT * FROM VendorProductCustomerCourier WHERE VendorProductCustomerCourierId = ? AND Vendor = ?',
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
      'UPDATE VendorProductCustomerCourier SET IsReady_for_Pickup_by_Courier = "Y", Ready_for_Pickup_by_CourierTimeStamp = NOW() WHERE VendorProductCustomerCourierId = ?',
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
        `UPDATE VendorProductCustomerCourier SET ${updateFields.join(', ')} WHERE VendorProductCustomerCourierId = ?`,
        [...updateValues, req.params.id]
      );
    }
    
    // Get updated order details with product info
    const [updatedOrder] = await conn.query(
      'SELECT p.*, vpc.Courier, vpc.TrackingNo, ' +
      'pr.Product, pr.MRP as ProductPrice, ' +
      'c.Customer, c.CustomerEmail, c.CustomerMobile ' +
      'FROM Purchase p ' +
      'JOIN VendorProductCustomerCourier vpc ON p.PuchaseId = vpc.VendorProductCustomerCourierId ' +
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
      'JOIN VendorProductCustomerCourier vpc ON p.PuchaseId = vpc.VendorProductCustomerCourierId ' +
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
        `UPDATE VendorProductCustomerCourier SET ${updateFields} WHERE VendorProductCustomerCourierId = ?`,
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
      'JOIN VendorProductCustomerCourier vpc ON p.PuchaseId = vpc.VendorProductCustomerCourierId ' +
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