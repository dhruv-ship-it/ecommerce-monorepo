import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../index.js';
import { recommendationService } from '../services/recommendationService.js';
import { notificationService } from '../services/notificationService.js';
import crypto from 'crypto';
import { redis } from '../index.js';

const router = express.Router();

// Function to check and handle idempotency with in-progress lock
async function handleIdempotency(req, customerId) {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return null; // No idempotency key provided, proceed normally
  }
  
  try {
    // Create cache keys
    const cacheKey = `idempotency:${customerId}:${idempotencyKey}`;
    const lockKey = `${cacheKey}:lock`;
    
    // Try to acquire in-progress lock with SET NX EX (only if not exists, expire in 60 seconds)
    const lockAcquired = await redis.set(lockKey, 'LOCKED', {
      NX: true,  // Only set if key doesn't exist
      EX: 60     // Expire after 60 seconds (safety)
    });
    
    if (!lockAcquired) {
      // Lock already exists, meaning another request is in progress
      // Check if there's already a cached result
      const cachedResult = await redis.get(cacheKey);
      if (cachedResult) {
        console.log(`Idempotency hit for key: ${cacheKey}`);
        return JSON.parse(cachedResult);
      } else {
        // Another request is in progress but hasn't completed yet
        console.log(`Request in progress for key: ${cacheKey}`);
        throw new Error('Request already in progress');
      }
    }
    
    // Lock acquired successfully, proceed with request
    console.log(`Lock acquired for idempotency key: ${cacheKey}`);
    return null; // Indicate request should proceed
  } catch (error) {
    if (error.message === 'Request already in progress') {
      throw error; // Re-throw this specific error
    }
    console.error('Error checking idempotency:', error);
    // If Redis is down, proceed with the request (loses idempotency but maintains functionality)
    return null;
  }
}

// Function to cache idempotency result and clean up lock
async function cacheIdempotencyResult(req, customerId, result) {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return; // No idempotency key, no need to cache
  }
  
  try {
    const cacheKey = `idempotency:${customerId}:${idempotencyKey}`;
    const lockKey = `${cacheKey}:lock`;
    
    // Cache for 24 hours (86400 seconds)
    await redis.setEx(cacheKey, 86400, JSON.stringify(result));
    
    // Clean up the lock after successful caching
    await redis.del(lockKey);
    
    console.log(`Idempotency result cached for key: ${cacheKey}`);
  } catch (error) {
    console.error('Error caching idempotency result:', error);
    // Don't fail the request if caching fails
  }
}

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

// Place order from cart
router.post('/place', authMiddleware, async (req, res) => {
  let conn;
  try {
    const startTime = Date.now();
    console.log(`ORDER PLACEMENT STARTED at ${new Date(startTime).toISOString()}`);
    
    // For customers, req.user.id is already the CustomerId from JWT token
    if (req.user.userType !== 'customer') {
      return res.status(403).json({ error: 'Only customers can place orders' });
    }
    
    const customerId = req.user.id;
    
    // Check for idempotency - if this request was already processed, return cached result
    let cachedResult;
    try {
      cachedResult = await handleIdempotency(req, customerId);
    } catch (idempotencyError) {
      if (idempotencyError.message === 'Request already in progress') {
        return res.status(409).json({ error: 'Order processing in progress', message: 'Please wait for the previous request to complete' });
      }
      throw idempotencyError; // Re-throw other errors
    }
    if (cachedResult) {
      console.log(`Returning cached idempotent result for customer ${customerId}`);
      return res.status(200).json(cachedResult);
    }
    
    conn = await db.getConnection();
    await conn.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED;');
    await conn.beginTransaction();
    
    // Get cart items for the customer (including VendorProductId for stock updates)
    const result = await conn.query('SELECT ProductId, VendorProductId, Quantity FROM shoppingcart WHERE CustomerId = ?', [customerId]);
    
    // Handle the result properly - MariaDB returns an array where each element is a row
    let cartItems = [];
    if (Array.isArray(result)) {
      // If first element is an array, it contains all rows
      if (Array.isArray(result[0])) {
        cartItems = result[0];
      } else {
        // Otherwise, each element is a row
        cartItems = result;
      }
    } else if (result) {
      // If it's a single object, make it an array
      cartItems = [result];
    }
    
    if (!cartItems || cartItems.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    // Process each cart item
    const createdOrders = [];
    for (const item of cartItems) {
      try {
      // Get vendor and default courier for this product using VendorProductId
      // Use FOR UPDATE to lock the row during transaction
      const vendorProductResult = await conn.query(
        'SELECT VendorProductId, Vendor, Courier as DefaultCourier, MRP_SS, Discount, GST_SS, StockQty FROM vendorproduct WHERE VendorProductId = ? AND IsDeleted != "Y" AND IsNotAvailable != "Y" FOR UPDATE',
        [item.VendorProductId]
      );
      
      // Handle the result properly - MariaDB returns an array where each element is a row
      let vendorProduct = [];
      if (Array.isArray(vendorProductResult)) {
        // If first element is an array, it contains all rows
        if (Array.isArray(vendorProductResult[0])) {
          vendorProduct = vendorProductResult[0];
        } else {
          // Otherwise, each element is a row
          vendorProduct = vendorProductResult;
        }
      } else if (vendorProductResult) {
        // If it's a single object, make it an array
        vendorProduct = [vendorProductResult];
      }
      
      if (!vendorProduct || vendorProduct.length === 0) {
        throw new Error(`Vendor product not found or unavailable for item ${item.ProductId}`);
      }
      
      const vendor = vendorProduct[0];

      // Validate stock availability within transaction
      const currentStock = parseFloat(vendor.StockQty) || 0;
      if (currentStock < item.Quantity) {
        throw new Error(`Insufficient stock for product ${item.ProductId}. Only ${currentStock} items available.`);
      }

      // Calculate pricing totals using vendorproduct fields (discount treated as percentage)
      const mrp = parseFloat(vendor.MRP_SS) || 0;
      const gst = parseFloat(vendor.GST_SS) || 0;
      const discountPercent = parseFloat(vendor.Discount) || 0;
      const discountValuePerUnit = mrp * (discountPercent / 100);

      const mrpTotal = mrp * item.Quantity;
      const gstTotal = gst * item.Quantity;
      const discountTotal = discountValuePerUnit * item.Quantity;
      const totalAmount = mrpTotal - discountTotal + gstTotal;
      
      // Create purchase record
      await conn.query(
        'INSERT INTO purchase (ProductId, CustomerId, OrderStatus, MRP, GST, Discount, TotalAmount, PaymentStatus, PaymentMode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [item.ProductId, customerId, 'Pending', mrpTotal, gstTotal, discountTotal, totalAmount, 'Pending', 'COD']
      );
      
      const lastPurchaseResult = await conn.query('SELECT LAST_INSERT_ID() as id');
      // Handle the result properly
      let lastPurchase = [];
      if (Array.isArray(lastPurchaseResult)) {
        if (Array.isArray(lastPurchaseResult[0])) {
          lastPurchase = lastPurchaseResult[0];
        } else {
          lastPurchase = lastPurchaseResult;
        }
      } else if (lastPurchaseResult) {
        lastPurchase = [lastPurchaseResult];
      }
      const purchaseId = lastPurchase && lastPurchase.length > 0 ? lastPurchase[0].id : null;
      
      // Use default courier from VendorProduct directly (no acceptance flow)
      const courierId = vendor.DefaultCourier || 0;
      
      // Store order information for later notifications
      if (purchaseId) {
        createdOrders.push({
          purchaseId,
          productId: item.ProductId,
          vendorId: vendor.Vendor,
          courierId: courierId,
          vendorProductId: item.VendorProductId
        });
      }
      
      if (!purchaseId) {
        throw new Error(`Failed to create purchase record for item ${item.ProductId}`);
      }
      
      // Create order entry in vendorproductcustomercourier table
      // Courier will be assigned 'N' initially, tracking number generated when picked up
      await conn.query(
        `INSERT INTO vendorproductcustomercourier 
         (PurchaseId, Customer, Product, Vendor, Courier, MRP_SS, Discount_SS, GST_SS, PurchaseQty, 
          OrderCreationTimeStamp, IsReady_for_Pickup_by_Courier, TrackingNo, 
          IsPicked_by_Courier, Picked_by_CourierTimeStamp, IsDispatched, IsOut_for_Delivery, IsDelivered, 
          IsPartialDelivery, IsReturned, IsDeleted, RecordCreationLogin) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'N', '', 'N', '0000-00-00 00:00:00', 'N', 'N', 'N', 'N', 'N', 'N', ?)`,
        [purchaseId, customerId, item.ProductId, vendor.Vendor, courierId, mrp, discountValuePerUnit, gst, item.Quantity, customerId]
      );
      
      console.log(`NOTIFICATION: New order ${purchaseId} created with courier ${courierId || 'none (vendor must assign)'}`);
      
      // Decrement stock quantity for the vendor product
      const existingStock = parseFloat(vendor.StockQty) || 0;
      const newStock = Math.max(0, existingStock - item.Quantity);
      await conn.query(
        'UPDATE vendorproduct SET StockQty = ? WHERE VendorProductId = ?',
        [newStock, vendor.VendorProductId]
      );
      console.log(`Stock updated for VendorProductId ${vendor.VendorProductId}: ${existingStock} -> ${newStock}`);
  } catch (itemError) {
    console.error('Error processing cart item:', itemError);
    throw itemError; // Re-throw to trigger transaction rollback
  }
}

// Clear cart
await conn.query('DELETE FROM shoppingcart WHERE CustomerId = ?', [customerId]);

// Commit the transaction BEFORE sending notifications
await conn.commit();
conn.release();

// Send notifications AFTER successful commit
try {
  // Reconnect for notifications (separate transaction)
  const notificationConn = await db.getConnection();
      
  // Create notifications for each created order (using stored order info)
  for (const orderInfo of createdOrders) {
      // Use stored vendor and courier information directly
      const notifications = [
        {
          recipientId: customerId,
          recipientType: 'customer',
          type: 'Order',
          message: `Order #${orderInfo.purchaseId} placed successfully. We will keep you updated on its status.`
        },
        {
          recipientId: orderInfo.vendorId,
          recipientType: 'user',
          type: 'Order',
          message: `New order #${orderInfo.purchaseId} placed. Please prepare the items and mark it ready for pickup.`
        }
      ];
      
      // Add courier notification if courier exists
      if (orderInfo.courierId) {
        const courierUserResult = await notificationConn.query(
          'SELECT UserId FROM user WHERE UserId = ? AND IsCourier = "Y" AND IsBlackListed != "Y"',
          [orderInfo.courierId]
        );
        
        if (courierUserResult && courierUserResult.length > 0) {
          const courierUserId = courierUserResult[0].UserId;
          notifications.push({
            recipientId: courierUserId,
            recipientType: 'user',
            type: 'Order',
            message: `New order #${orderInfo.purchaseId} placed. Please wait until it's marked ready for pickup by the vendor.`
          });
        }
      }
      
      // Create all notifications
      const results = await notificationService.createNotifications(notifications);
      console.log(`NOTIFICATION DEBUG: Notification creation results:`, results);
      console.log(`NOTIFICATION: Created notifications for order ${orderInfo.purchaseId}`);
    }
    
    notificationConn.release();
  } catch (notificationError) {
    console.error('Error creating notifications:', notificationError);
    // Don't fail the order creation if notification fails
  }

// Generate recommendations based on the first product in the cart
// This is a simple approach - we'll use the first product for recommendations
let recommendations = [];
console.log(`DEBUG: Generating recommendations for customer ${customerId}, cart items count: ${cartItems && cartItems.length || 0}`);
if (cartItems && cartItems.length > 0) {
  console.log(`DEBUG: First product ID for recommendations: ${cartItems[0].ProductId}`);
  try {
    recommendations = await recommendationService.getRecommendations(customerId, cartItems[0].ProductId);
    console.log(`DEBUG: Generated ${recommendations.length} recommendations:`, recommendations);
  } catch (recError) {
    console.error('Error generating recommendations:', recError);
    // Don't fail the order if recommendations fail
  }
} else {
  console.log('DEBUG: No cart items found for recommendations');
}

// Get the latest order details for confirmation
const orderDetailsResult = await db.query(
  `SELECT p.PuchaseId, p.OrderDate, p.TotalAmount, p.PaymentStatus, p.PaymentMode,
   pr.Product, m.ModelId
   FROM purchase p
   JOIN product pr ON p.ProductId = pr.ProductId
   JOIN model m ON pr.Model = m.ModelId
   WHERE p.CustomerId = ?
   ORDER BY p.OrderDate DESC
   LIMIT 1`,
  [customerId]
);

let orderDetails = [];
if (Array.isArray(orderDetailsResult)) {
  if (Array.isArray(orderDetailsResult[0])) {
    orderDetails = orderDetailsResult[0];
  } else {
    orderDetails = orderDetailsResult;
  }
}

const latestOrder = orderDetails && orderDetails.length > 0 ? orderDetails[0] : null;

const endTime = Date.now();
const duration = endTime - startTime;
console.log(`ORDER PLACEMENT COMPLETED at ${new Date(endTime).toISOString()}, Duration: ${duration}ms`);

// Cache the successful result for idempotency
await cacheIdempotencyResult(req, customerId, { 
  message: 'Order placed',
  order: latestOrder,
  recommendations: recommendations
});

res.json({ 
  message: 'Order placed',
  order: latestOrder,
  recommendations: recommendations
});
} catch (err) {
  console.error('Order placement error:', err);
  
  // Clean up the idempotency lock if we have an idempotency key
  const idempotencyKey = req.headers['idempotency-key'];
  if (idempotencyKey) {
    const cacheKey = `idempotency:${customerId}:${idempotencyKey}`;
    const lockKey = `${cacheKey}:lock`;
    try {
      await redis.del(lockKey);
      console.log(`Idempotency lock cleaned up for key: ${lockKey}`);
    } catch (lockCleanupErr) {
      console.error('Error cleaning up idempotency lock:', lockCleanupErr);
    }
  }
  
  // Rollback transaction if connection exists
  if (conn) {
    try {
      await conn.rollback();
      console.log('Transaction rolled back due to error');
    } catch (rollbackErr) {
      console.error('Error during rollback:', rollbackErr);
    }
    conn.release();
  }
  
  // Handle specific errors
  if (err.message && err.message.includes('Insufficient stock')) {
    return res.status(400).json({ 
      error: 'Insufficient stock',
      message: err.message
    });
  }
  
  if (err.message && err.message.includes('Vendor product not found')) {
    return res.status(400).json({ 
      error: 'Order failed',
      message: err.message
    });
  }
  
  res.status(500).json({ error: 'Server error' });
}
}
);

// View order history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // For customers, req.user.id is already the CustomerId from JWT token
    if (req.user.userType !== 'customer') {
      conn.release();
      return res.status(403).json({ error: 'Only customers can view order history' });
    }
    
    const customerId = req.user.id;
    
    // Modified query to include model information and tracking details for orders that exist in vendorproductcustomercourier
    // Using INNER JOIN as per the requirement to only show orders with associated vendor and courier information
    const rows = await conn.query(
      `SELECT p.*, m.ModelId as ModelId, vpc.Vendor, vpc.Courier, vpc.TrackingNo, 
       vpc.IsReady_for_Pickup_by_Courier, vpc.Ready_for_Pickup_by_CourierTimeStamp,
       vpc.IsPicked_by_Courier, vpc.Picked_by_CourierTimeStamp, 
       vpc.IsDispatched, vpc.DispatchedTimeStamp,
       vpc.IsOut_for_Delivery, vpc.Out_for_DeliveryTimeStamp,
       vpc.IsDelivered, vpc.DeliveryTimeStamp,
       vpc.IsReturned, vpc.ReturnTimeStamp,
       CASE
         WHEN vpc.IsDelivered = 'Y' THEN 'Delivered'
         WHEN vpc.IsDispatched = 'Y' OR vpc.IsOut_for_Delivery = 'Y' THEN 'Shipped'
         WHEN vpc.IsPicked_by_Courier = 'Y' OR vpc.IsReady_for_Pickup_by_Courier = 'Y' THEN 'Processing'
         ELSE 'Processing'
       END as OrderCategory,
       'Active' as OrderSource
       FROM purchase p
       JOIN product pr ON p.ProductId = pr.ProductId
       JOIN model m ON pr.Model = m.ModelId
       LEFT JOIN vendorproductcustomercourier vpc ON p.PuchaseId = vpc.PurchaseId
       WHERE p.CustomerId = ? 
       UNION ALL
       SELECT p_arch.*, m.ModelId as ModelId, vpc_arch.Vendor, vpc_arch.Courier, vpc_arch.TrackingNo, 
       vpc_arch.IsReady_for_Pickup_by_Courier, vpc_arch.Ready_for_Pickup_by_CourierTimeStamp,
       vpc_arch.IsPicked_by_Courier, vpc_arch.Picked_by_CourierTimeStamp, 
       vpc_arch.IsDispatched, vpc_arch.DispatchedTimeStamp,
       vpc_arch.IsOut_for_Delivery, vpc_arch.Out_for_DeliveryTimeStamp,
       vpc_arch.IsDelivered, vpc_arch.DeliveryTimeStamp,
       vpc_arch.IsReturned, vpc_arch.ReturnTimeStamp,
       CASE
         WHEN vpc_arch.IsDelivered = 'Y' THEN 'Delivered'
         WHEN vpc_arch.IsDispatched = 'Y' OR vpc_arch.IsOut_for_Delivery = 'Y' THEN 'Shipped'
         WHEN vpc_arch.IsPicked_by_Courier = 'Y' OR vpc_arch.IsReady_for_Pickup_by_Courier = 'Y' THEN 'Processing'
         ELSE 'Processing'
       END as OrderCategory,
       'Archived' as OrderSource
       FROM purchase_arch p_arch
       JOIN product pr ON p_arch.ProductId = pr.ProductId
       JOIN model m ON pr.Model = m.ModelId
       LEFT JOIN vendorproductcustomercourier_arch vpc_arch ON p_arch.PuchaseId = vpc_arch.PurchaseId
       WHERE p_arch.CustomerId = ? 
       ORDER BY OrderDate DESC`,
      [customerId, customerId]
    );
    conn.release();
    
    // Handle the result properly - MariaDB returns an array where each element is a row
    let orders = [];
    if (Array.isArray(rows)) {
      // If first element is an array, it contains all rows
      if (Array.isArray(rows[0])) {
        orders = rows[0];
      } else {
        // Otherwise, each element is a row
        orders = rows;
      }
    } else if (rows) {
      // If it's a single object, make it an array
      orders = [rows];
    }
    
    res.json({ orders });
  } catch (err) {
    console.error('Order history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// View order details
router.get('/:orderId', authMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // For customers, req.user.id is already the CustomerId from JWT token
    if (req.user.userType !== 'customer') {
      conn.release();
      return res.status(403).json({ error: 'Only customers can view order details' });
    }
    
    const customerId = req.user.id;
    
    // First check active orders
    const rows = await conn.query(
      `SELECT p.*, vpc.Vendor, vpc.Courier, vpc.TrackingNo, 
       vpc.IsReady_for_Pickup_by_Courier, vpc.Ready_for_Pickup_by_CourierTimeStamp,
       vpc.IsPicked_by_Courier, vpc.Picked_by_CourierTimeStamp, 
       vpc.IsDispatched, vpc.DispatchedTimeStamp,
       vpc.IsOut_for_Delivery, vpc.Out_for_DeliveryTimeStamp,
       vpc.IsDelivered, vpc.DeliveryTimeStamp,
       vpc.IsReturned, vpc.ReturnTimeStamp,
       CASE
         WHEN vpc.IsDelivered = 'Y' THEN 'Delivered'
         WHEN vpc.IsDispatched = 'Y' OR vpc.IsOut_for_Delivery = 'Y' THEN 'Shipped'
         WHEN vpc.IsPicked_by_Courier = 'Y' OR vpc.IsReady_for_Pickup_by_Courier = 'Y' THEN 'Processing'
         ELSE 'Processing'
       END as OrderCategory,
       'Active' as OrderSource
       FROM purchase p
       LEFT JOIN vendorproductcustomercourier vpc ON p.PuchaseId = vpc.PurchaseId
       WHERE p.PuchaseId = ? AND p.CustomerId = ?`,
      [req.params.orderId, customerId]
    );
    
    // Handle case where no active order is found
    let order = null;
    if (rows && Array.isArray(rows) && rows.length > 0) {
      order = rows[0];
    }
    
    // If no active order found, check archived orders
    if (!order) {
      const archivedRows = await conn.query(
        `SELECT p_arch.*, vpc_arch.Vendor, vpc_arch.Courier, vpc_arch.TrackingNo, 
         vpc_arch.IsReady_for_Pickup_by_Courier, vpc_arch.Ready_for_Pickup_by_CourierTimeStamp,
         vpc_arch.IsPicked_by_Courier, vpc_arch.Picked_by_CourierTimeStamp, 
         vpc_arch.IsDispatched, vpc_arch.DispatchedTimeStamp,
         vpc_arch.IsOut_for_Delivery, vpc_arch.Out_for_DeliveryTimeStamp,
         vpc_arch.IsDelivered, vpc_arch.DeliveryTimeStamp,
         vpc_arch.IsReturned, vpc_arch.ReturnTimeStamp,
         CASE
           WHEN vpc_arch.IsDelivered = 'Y' THEN 'Delivered'
           WHEN vpc_arch.IsDispatched = 'Y' OR vpc_arch.IsOut_for_Delivery = 'Y' THEN 'Shipped'
           WHEN vpc_arch.IsPicked_by_Courier = 'Y' OR vpc_arch.IsReady_for_Pickup_by_Courier = 'Y' THEN 'Processing'
           ELSE 'Processing'
         END as OrderCategory,
         'Archived' as OrderSource
         FROM purchase_arch p_arch
         LEFT JOIN vendorproductcustomercourier_arch vpc_arch ON p_arch.PuchaseId = vpc_arch.PurchaseId
         WHERE p_arch.PuchaseId = ? AND p_arch.CustomerId = ?`,
        [req.params.orderId, customerId]
      );
      
      if (archivedRows && Array.isArray(archivedRows) && archivedRows.length > 0) {
        order = archivedRows[0];
      }
    }
    
    conn.release();
    
    // Handle case where no order is found
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ order });
  } catch (err) {
    console.error('Order details error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// View order tracking information
router.get('/:orderId/tracking', authMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // For customers, req.user.id is already the CustomerId from JWT token
    if (req.user.userType !== 'customer') {
      conn.release();
      return res.status(403).json({ error: 'Only customers can view order tracking' });
    }
    
    const customerId = req.user.id;
    
    // Get order details with product info and tracking information
    let rows = await conn.query(
      'SELECT p.*, vpc.Vendor, vpc.Courier, vpc.TrackingNo, ' +
      'vpc.IsReady_for_Pickup_by_Courier, vpc.Ready_for_Pickup_by_CourierTimeStamp, ' +
      'vpc.IsPicked_by_Courier, vpc.Picked_by_CourierTimeStamp, ' +
      'vpc.IsDispatched, vpc.DispatchedTimeStamp, ' +
      'vpc.IsOut_for_Delivery, vpc.Out_for_DeliveryTimeStamp, ' +
      'vpc.IsDelivered, vpc.DeliveryTimeStamp, ' +
      'vpc.IsReturned, vpc.ReturnTimeStamp, ' +
      'p.OrderStatus, p.TotalAmount, p.OrderDate, ' +
      'pr.Product as ProductName, pr.MRP as ProductPrice, ' +
      'c.Customer as CustomerName, c.CustomerEmail, c.CustomerMobile, ' +
      'v.User as VendorName, v.UserMobile as VendorMobile, ' +
      'u.User as CourierName, u.UserMobile as CourierMobile, ' +
      '\'Active\' as OrderSource ' +
      'FROM purchase p ' +
      'JOIN vendorproductcustomercourier vpc ON p.PuchaseId = vpc.PurchaseId ' +
      'JOIN product pr ON vpc.Product = pr.ProductId ' +
      'JOIN customer c ON vpc.Customer = c.CustomerId ' +
      'JOIN user v ON vpc.Vendor = v.UserId ' +
      'LEFT JOIN user u ON vpc.Courier = u.UserId ' +
      'WHERE p.PuchaseId = ? AND vpc.Customer = ?',
      [req.params.orderId, customerId]
    );
    
    let orderData = null;
    // Handle case where no active order is found
    if (rows && Array.isArray(rows) && rows.length > 0) {
      orderData = rows[0];
    }
    
    // If no active order found, check archived orders
    if (!orderData) {
      const archivedRows = await conn.query(
        'SELECT p_arch.*, vpc_arch.Vendor, vpc_arch.Courier, vpc_arch.TrackingNo, ' +
        'vpc_arch.IsReady_for_Pickup_by_Courier, vpc_arch.Ready_for_Pickup_by_CourierTimeStamp, ' +
        'vpc_arch.IsPicked_by_Courier, vpc_arch.Picked_by_CourierTimeStamp, ' +
        'vpc_arch.IsDispatched, vpc_arch.DispatchedTimeStamp, ' +
        'vpc_arch.IsOut_for_Delivery, vpc_arch.Out_for_DeliveryTimeStamp, ' +
        'vpc_arch.IsDelivered, vpc_arch.DeliveryTimeStamp, ' +
        'vpc_arch.IsReturned, vpc_arch.ReturnTimeStamp, ' +
        'p_arch.OrderStatus, p_arch.TotalAmount, p_arch.OrderDate, ' +
        'pr.Product as ProductName, pr.MRP as ProductPrice, ' +
        'c.Customer as CustomerName, c.CustomerEmail, c.CustomerMobile, ' +
        'v.User as VendorName, v.UserMobile as VendorMobile, ' +
        'u.User as CourierName, u.UserMobile as CourierMobile, ' +
        '\'Archived\' as OrderSource ' +
        'FROM purchase_arch p_arch ' +
        'JOIN vendorproductcustomercourier_arch vpc_arch ON p_arch.PuchaseId = vpc_arch.PurchaseId ' +
        'JOIN product pr ON vpc_arch.Product = pr.ProductId ' +
        'JOIN customer c ON vpc_arch.Customer = c.CustomerId ' +
        'JOIN user v ON vpc_arch.Vendor = v.UserId ' +
        'LEFT JOIN user u ON vpc_arch.Courier = u.UserId ' +
        'WHERE p_arch.PuchaseId = ? AND vpc_arch.Customer = ?',
        [req.params.orderId, customerId]
      );
      
      if (archivedRows && Array.isArray(archivedRows) && archivedRows.length > 0) {
        orderData = archivedRows[0];
      }
    }
    
    conn.release();
    
    // Handle case where no order is found
    if (!orderData) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Generate tracking events based on the order status fields
    const trackingEvents = [];
    
    // Add order placed event
    trackingEvents.push({
      TrackingEventId: 1,
      PurchaseId: orderData.PuchaseId,
      status: "Order Placed",
      location: "Warehouse",
      description: `Order #${orderData.PuchaseId} was placed by customer.`,
      timestamp: orderData.OrderDate
    });
    
    // Add courier acceptance event if applicable
    if (orderData.IsPicked_by_Courier === 'Y' && orderData.Picked_by_CourierTimeStamp && orderData.Picked_by_CourierTimeStamp !== '0000-00-00 00:00:00') {
      trackingEvents.push({
        TrackingEventId: 1.5,
        PurchaseId: orderData.PuchaseId,
        status: "Courier Picked Up",
        location: "Vendor Location",
        description: `Order #${orderData.PuchaseId} picked up by courier.`,
        timestamp: orderData.Picked_by_CourierTimeStamp
      });
    }

    // Add courier did not pick up event if applicable
    if (orderData.IsPicked_by_Courier === 'N' && orderData.IsReturned === 'Y' && orderData.ReturnTimeStamp && orderData.ReturnTimeStamp !== '0000-00-00 00:00:00') {
      trackingEvents.push({
        TrackingEventId: 1.6,
        PurchaseId: orderData.PuchaseId,
        status: "Courier Did Not Pick Up",
        location: "Vendor Location",
        description: `Courier did not pick up order #${orderData.PuchaseId}.`,
        timestamp: orderData.ReturnTimeStamp
      });
    }
    
    // Add status updates based on vendorproductcustomercourier fields
    if (orderData.IsReady_for_Pickup_by_Courier === 'Y' && orderData.Ready_for_Pickup_by_CourierTimeStamp && orderData.Ready_for_Pickup_by_CourierTimeStamp !== '0000-00-00 00:00:00') {
      trackingEvents.push({
        TrackingEventId: 2,
        PurchaseId: orderData.PuchaseId,
        status: "Ready for Pickup",
        location: "Vendor Location",
        description: `Order #${orderData.PuchaseId} is ready for pickup.`,
        timestamp: orderData.Ready_for_Pickup_by_CourierTimeStamp
      });
    }
    
    if (orderData.IsDispatched === 'Y' && orderData.DispatchedTimeStamp && orderData.DispatchedTimeStamp !== '0000-00-00 00:00:00') {
      trackingEvents.push({
        TrackingEventId: 3,
        PurchaseId: orderData.PuchaseId,
        status: "Shipped",
        location: "Distribution Center",
        description: `Order #${orderData.PuchaseId} has been shipped.`,
        timestamp: orderData.DispatchedTimeStamp
      });
    }
    
    if (orderData.IsOut_for_Delivery === 'Y' && orderData.Out_for_DeliveryTimeStamp && orderData.Out_for_DeliveryTimeStamp !== '0000-00-00 00:00:00') {
      trackingEvents.push({
        TrackingEventId: 4,
        PurchaseId: orderData.PuchaseId,
        status: "Out for Delivery",
        location: "Local Delivery Hub",
        description: `Order #${orderData.PuchaseId} is out for delivery.`,
        timestamp: orderData.Out_for_DeliveryTimeStamp
      });
    }
    
    if (orderData.IsDelivered === 'Y' && orderData.DeliveryTimeStamp && orderData.DeliveryTimeStamp !== '0000-00-00 00:00:00') {
      trackingEvents.push({
        TrackingEventId: 5,
        PurchaseId: orderData.PuchaseId,
        status: "Delivered",
        location: "Customer Address",
        description: `Order #${orderData.PuchaseId} has been successfully delivered.`,
        timestamp: orderData.DeliveryTimeStamp
      });
    } else if (orderData.IsReturned === 'Y' && orderData.ReturnTimeStamp && orderData.ReturnTimeStamp !== '0000-00-00 00:00:00') {
      // Courier rejection is already added above with TrackingEventId 1.6
      // This is kept for the return after delivery scenario
      trackingEvents.push({
        TrackingEventId: 6,
        PurchaseId: orderData.PuchaseId,
        status: "Returned",
        location: "Vendor Location",
        description: `Order #${orderData.PuchaseId} has been returned.`,
        timestamp: orderData.ReturnTimeStamp
      });
    }
    
    // Sort tracking events by timestamp
    trackingEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    res.json({ 
      trackingEvents,
      order: orderData
    });
  } catch (err) {
    console.error('Order tracking error:', err);
    res.status(500).json({ error: 'Server error' });
}
});

export default router;