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

function courierOnlyMiddleware(req, res, next) {
  if (req.user.role === 'courier') return next();
  return res.status(403).json({ error: 'Forbidden' });
}

// Get order details (MOVED UP to avoid conflict with /orders route)
router.get('/order/:id', authMiddleware, courierOnlyMiddleware, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    
    console.log('=== COURIER ORDER DETAILS DEBUG ===');
    console.log(`Requesting order details for ID: ${req.params.id}, Logged-in Courier: ${req.user.id}`);
    
    // First check active orders table
    const orderResult = await conn.query(
      'SELECT vpc.PurchaseId as PuchaseId, ' +
      'vpc.Vendor, vpc.Product as ProductId, vpc.Customer as CustomerId, ' +
      'vpc.Courier, vpc.TrackingNo, ' +
      'vpc.IsReady_for_Pickup_by_Courier, vpc.Ready_for_Pickup_by_CourierTimeStamp, ' +
      'vpc.IsPicked_by_Courier, vpc.Picked_by_CourierTimeStamp, ' +
      'vpc.IsDispatched, vpc.DispatchedTimeStamp, ' +
      'vpc.IsOut_for_Delivery, vpc.Out_for_DeliveryTimeStamp, ' +
      'vpc.IsDelivered, vpc.DeliveryTimeStamp, ' +
      'vpc.IsReturned, vpc.ReturnTimeStamp, ' +
      'vpc.MRP_SS, vpc.Discount_SS, vpc.GST_SS, vpc.PurchaseQty, ' +
      'vpc.OrderCreationTimeStamp as OrderDate, ' +
      'p.Product, ' +
      'p.MRP as ProductPrice, ' +
      'c.Customer as CustomerName, ' +
      'c.CustomerEmail, ' +
      'c.CustomerMobile, ' +
      'c.Address as CustomerAddress, ' +
      'c.Locality, ' +
      'pur.TotalAmount, ' +
      'v.User as VendorName, ' +
      'v.UserMobile as VendorMobile, ' +
      'v.UserEmail as VendorEmail ' +
      'FROM VendorProductCustomerCourier vpc ' +
      'JOIN Product p ON vpc.Product = p.ProductId ' +
      'JOIN Customer c ON vpc.Customer = c.CustomerId ' +
      'LEFT JOIN Purchase pur ON vpc.PurchaseId = pur.PuchaseId ' +
      'LEFT JOIN User v ON vpc.Vendor = v.UserId AND v.IsVendor = "Y" ' +
      'WHERE vpc.PurchaseId = ? AND vpc.Courier = ?',
      [req.params.id, req.user.id]
    );
    
    // Handle MariaDB result format (can be array of arrays or array of objects)
    let orderArray = [];
    if (Array.isArray(orderResult)) {
      if (orderResult.length > 0 && Array.isArray(orderResult[0])) {
        // MariaDB returns [data, metadata] format
        orderArray = orderResult[0];
      } else {
        // Direct array of objects
        orderArray = orderResult;
      }
    } else if (orderResult && typeof orderResult === 'object') {
      // Single object result
      orderArray = [orderResult];
    }
    
    if (!orderArray || orderArray.length === 0) {
      // Check archived orders if not found in active table
      const archivedOrderResult = await conn.query(
        'SELECT vpc_arch.PurchaseId as PuchaseId, ' +
        'vpc_arch.Vendor, vpc_arch.Product as ProductId, vpc_arch.Customer as CustomerId, ' +
        'vpc_arch.Courier, vpc_arch.TrackingNo, ' +
        'vpc_arch.IsReady_for_Pickup_by_Courier, vpc_arch.Ready_for_Pickup_by_CourierTimeStamp, ' +
        'vpc_arch.IsPicked_by_Courier, vpc_arch.Picked_by_CourierTimeStamp, ' +
        'vpc_arch.IsDispatched, vpc_arch.DispatchedTimeStamp, ' +
        'vpc_arch.IsOut_for_Delivery, vpc_arch.Out_for_DeliveryTimeStamp, ' +
        'vpc_arch.IsDelivered, vpc_arch.DeliveryTimeStamp, ' +
        'vpc_arch.IsReturned, vpc_arch.ReturnTimeStamp, ' +
        'vpc_arch.MRP_SS, vpc_arch.Discount_SS, vpc_arch.GST_SS, vpc_arch.PurchaseQty, ' +
        'vpc_arch.OrderCreationTimeStamp as OrderDate, ' +
        'p.Product, ' +
        'p.MRP as ProductPrice, ' +
        'c.Customer as CustomerName, ' +
        'c.CustomerEmail, ' +
        'c.CustomerMobile, ' +
        'c.Address as CustomerAddress, ' +
        'c.Locality, ' +
        'pur_arch.TotalAmount, ' +
        'v.User as VendorName, ' +
        'v.UserMobile as VendorMobile, ' +
        'v.UserEmail as VendorEmail ' +
        'FROM vendorproductcustomercourier_arch vpc_arch ' +
        'JOIN Product p ON vpc_arch.Product = p.ProductId ' +
        'JOIN Customer c ON vpc_arch.Customer = c.CustomerId ' +
        'LEFT JOIN purchase_arch pur_arch ON vpc_arch.PurchaseId = pur_arch.PuchaseId ' +
        'LEFT JOIN User v ON vpc_arch.Vendor = v.UserId AND v.IsVendor = "Y" ' +
        'WHERE vpc_arch.PurchaseId = ? AND vpc_arch.Courier = ?',
        [req.params.id, req.user.id]
      );
      
      // Handle MariaDB result format for archived orders
      let archivedOrderArray = [];
      if (Array.isArray(archivedOrderResult)) {
        if (archivedOrderResult.length > 0 && Array.isArray(archivedOrderResult[0])) {
          archivedOrderArray = archivedOrderResult[0];
        } else {
          archivedOrderArray = archivedOrderResult;
        }
      } else if (archivedOrderResult && typeof archivedOrderResult === 'object') {
        archivedOrderArray = [archivedOrderResult];
      }
      
      if (!archivedOrderArray || archivedOrderArray.length === 0) {
        return res.status(404).json({ error: 'Order not found or access denied' });
      }
      
      // Convert BigInt values to numbers for archived order
      const processedOrder = {};
      for (const [key, value] of Object.entries(archivedOrderArray[0])) {
        processedOrder[key] = typeof value === 'bigint' ? Number(value) : value;
      }
      
      console.log(`Found archived order:`, processedOrder);
      return res.json({ order: processedOrder, source: 'archived' });
    }
    
    // Convert BigInt values to numbers to prevent serialization errors
    const processedOrder = {};
    for (const [key, value] of Object.entries(orderArray[0])) {
      processedOrder[key] = typeof value === 'bigint' ? Number(value) : value;
    }
    
    console.log(`Found active order:`, processedOrder);
    res.json({ order: processedOrder, source: 'active' });
  } catch (err) {
    console.error('Error fetching order details:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
});

// Get courier's assigned orders - Frontend compatible format
router.get('/orders', authMiddleware, courierOnlyMiddleware, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    const ordersResult = await conn.query(`
      SELECT 
        vpc.PurchaseId,
        vpc.Product as ProductId,
        p.Product,
        p.MRP as ProductPrice,
        vpc.Customer as CustomerId,
        vpc.OrderCreationTimeStamp as OrderDate,
        pur.TotalAmount,
        pur.PaymentMode,
        pur.PaymentStatus,
        vpc.Courier as CourierId,
        vpc.Vendor as VendorId,
        c.Customer as CustomerName,
        c.CustomerEmail,
        c.CustomerMobile,
        c.Address as CustomerAddress,
        v.User as VendorName,
        v.UserMobile as VendorMobile,
        v.UserEmail as VendorEmail,
        CASE 
          WHEN vpc.IsDelivered = 'Y' THEN 'Delivered'
          WHEN vpc.IsPartialDelivery = 'Y' THEN 'Partial Delivery'
          WHEN vpc.IsReturned = 'Y' THEN 'Returned'
          WHEN vpc.IsOut_for_Delivery = 'Y' THEN 'Out for Delivery'
          WHEN vpc.IsDispatched = 'Y' THEN 'Dispatched'
          WHEN vpc.IsReady_for_Pickup_by_Courier = 'Y' THEN 'Ready for Pickup'
          ELSE 'Order Placed'
        END as OrderStatus,
        vpc.IsReady_for_Pickup_by_Courier,
        vpc.Ready_for_Pickup_by_CourierTimeStamp,
        vpc.IsPicked_by_Courier,
        vpc.Picked_by_CourierTimeStamp,
        vpc.IsDispatched,
        vpc.DispatchedTimeStamp,
        vpc.IsOut_for_Delivery,
        vpc.Out_for_DeliveryTimeStamp,
        vpc.IsDelivered,
        vpc.DeliveryTimeStamp,
        vpc.IsReturned,
        vpc.ReturnTimeStamp,
        vpc.TrackingNo,
        'Active' as OrderSource
      FROM VendorProductCustomerCourier vpc
      JOIN Product p ON vpc.Product = p.ProductId
      JOIN Customer c ON vpc.Customer = c.CustomerId
      LEFT JOIN Purchase pur ON vpc.PurchaseId = pur.PuchaseId
      LEFT JOIN User v ON vpc.Vendor = v.UserId AND v.IsVendor = 'Y'
      WHERE vpc.Courier = ? AND vpc.IsDeleted != 'Y'
      UNION ALL
      SELECT 
        vpc_arch.PurchaseId,
        vpc_arch.Product as ProductId,
        p.Product,
        p.MRP as ProductPrice,
        vpc_arch.Customer as CustomerId,
        vpc_arch.OrderCreationTimeStamp as OrderDate,
        pur_arch.TotalAmount,
        pur_arch.PaymentMode,
        pur_arch.PaymentStatus,
        vpc_arch.Courier as CourierId,
        vpc_arch.Vendor as VendorId,
        c.Customer as CustomerName,
        c.CustomerEmail,
        c.CustomerMobile,
        c.Address as CustomerAddress,
        v.User as VendorName,
        v.UserMobile as VendorMobile,
        v.UserEmail as VendorEmail,
        CASE 
          WHEN vpc_arch.IsDelivered = 'Y' THEN 'Delivered'
          WHEN vpc_arch.IsPartialDelivery = 'Y' THEN 'Partial Delivery'
          WHEN vpc_arch.IsReturned = 'Y' THEN 'Returned'
          WHEN vpc_arch.IsOut_for_Delivery = 'Y' THEN 'Out for Delivery'
          WHEN vpc_arch.IsDispatched = 'Y' THEN 'Dispatched'
          WHEN vpc_arch.IsReady_for_Pickup_by_Courier = 'Y' THEN 'Ready for Pickup'
          ELSE 'Order Placed'
        END as OrderStatus,
        vpc_arch.IsReady_for_Pickup_by_Courier,
        vpc_arch.Ready_for_Pickup_by_CourierTimeStamp,
        vpc_arch.IsPicked_by_Courier,
        vpc_arch.Picked_by_CourierTimeStamp,
        vpc_arch.IsDispatched,
        vpc_arch.DispatchedTimeStamp,
        vpc_arch.IsOut_for_Delivery,
        vpc_arch.Out_for_DeliveryTimeStamp,
        vpc_arch.IsDelivered,
        vpc_arch.DeliveryTimeStamp,
        vpc_arch.IsReturned,
        vpc_arch.ReturnTimeStamp,
        vpc_arch.TrackingNo,
        'Archived' as OrderSource
      FROM vendorproductcustomercourier_arch vpc_arch
      JOIN Product p ON vpc_arch.Product = p.ProductId
      JOIN Customer c ON vpc_arch.Customer = c.CustomerId
      LEFT JOIN purchase_arch pur_arch ON vpc_arch.PurchaseId = pur_arch.PuchaseId
      LEFT JOIN User v ON vpc_arch.Vendor = v.UserId AND v.IsVendor = 'Y'
      WHERE vpc_arch.Courier = ?
      ORDER BY OrderDate DESC
    `, [req.user.id, req.user.id]);
    
    // Handle MariaDB result format (can be array of arrays or array of objects)
    let orders = [];
    if (Array.isArray(ordersResult)) {
      if (ordersResult.length > 0 && Array.isArray(ordersResult[0])) {
        // MariaDB returns [data, metadata] format
        orders = ordersResult[0];
      } else {
        // Direct array of objects
        orders = ordersResult;
      }
    } else if (ordersResult && typeof ordersResult === 'object') {
      // Single object result
      orders = [ordersResult];
    }
    
    // Convert BigInt values to numbers to prevent serialization errors
    const processedOrders = orders.map(order => {
      const processedOrder = {};
      for (const [key, value] of Object.entries(order)) {
        processedOrder[key] = typeof value === 'bigint' ? Number(value) : value;
      }
      return processedOrder;
    });
    
    console.log(`=== COURIER ORDERS LIST DEBUG ===`);
    console.log(`Returning ${processedOrders.length} orders for courier ${req.user.id}`);
    console.log('Sample order:', processedOrders.length > 0 ? processedOrders[0] : 'No orders');
    
    res.json({ orders: processedOrders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
});

// Courier picks up order - Generate tracking number and mark as picked up
router.put('/order/:id/pickup', authMiddleware, courierOnlyMiddleware, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    
    // Check if order is assigned to this courier and ready for pickup
    const orderCheckResult = await conn.query(
      'SELECT * FROM VendorProductCustomerCourier WHERE PurchaseId = ? AND Courier = ?',
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
      return res.status(403).json({ error: 'Order not found or not assigned to you' });
    }
    
    const order = orderCheck[0];
    
    // Check if order is ready for pickup
    if (order.IsReady_for_Pickup_by_Courier !== 'Y') {
      return res.status(400).json({ error: 'Order is not ready for pickup yet' });
    }
    
    // Check if already picked up
    if (order.IsPicked_by_Courier === 'Y') {
      return res.status(400).json({ error: 'Order already picked up' });
    }
    
    // Generate tracking number
    const trackingNumber = `TRK${Date.now()}${req.params.id}`;
    
    // Update VendorProductCustomerCourier table
    await conn.query(
      'UPDATE VendorProductCustomerCourier SET IsPicked_by_Courier = "Y", Picked_by_CourierTimeStamp = NOW(), TrackingNo = ? WHERE PurchaseId = ?',
      [trackingNumber, req.params.id]
    );
    
    // Update Purchase table status to Shipped when picked up
    await conn.query('UPDATE Purchase SET OrderStatus = ? WHERE PuchaseId = ?', ['Shipped', req.params.id]);
    
    // Create notifications for Picked Up status
    try {
      console.log(`NOTIFICATION: Order ${req.params.id} picked up by courier ${req.user.id}`);
      
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
        console.log(`NOTIFICATION DEBUG: Creating pickup notifications for order ${req.params.id}`);
        console.log(`NOTIFICATION DEBUG: Customer ID: ${order.Customer}, Vendor ID: ${order.Vendor}, Courier ID: ${order.Courier}`);
        
        // Create customer notification
        await conn.query(
          `INSERT INTO notification_customer 
           (CustomerId, Type, Message, IsRead, RecordCreationTimeStamp) 
           VALUES (?, ?, ?, 'N', NOW())`,
          [order.Customer, 'Order Update', `Your order #${req.params.id} for ${order.Product} has been picked up by the courier. Tracking number: ${trackingNumber}. It will be dispatched soon.`]
        );
        console.log(`NOTIFICATION DEBUG: Customer notification created for CustomerId: ${order.Customer}`);
        
        // Create vendor notification
        await conn.query(
          `INSERT INTO notification_user 
           (UserId, Type, Message, IsRead, RecordCreationTimeStamp) 
           VALUES (?, ?, ?, 'N', NOW())`,
          [order.Vendor, 'Order Update', `Order #${req.params.id} for ${order.Product} has been picked up by courier. The order is now in transit.`]
        );
        console.log(`NOTIFICATION DEBUG: Vendor notification created for UserId: ${order.Vendor}`);
        
        // Create courier notification (confirmation)
        await conn.query(
          `INSERT INTO notification_user 
           (UserId, Type, Message, IsRead, RecordCreationTimeStamp) 
           VALUES (?, ?, ?, 'N', NOW())`,
          [order.Courier, 'Order Update', `Order #${req.params.id} for ${order.Product} has been successfully picked up. Please proceed with dispatch.`]
        );
        console.log(`NOTIFICATION DEBUG: Courier notification created for UserId: ${order.Courier}`);
        
        console.log(`NOTIFICATION: Created pickup notifications for order ${req.params.id}`);
      } else {
        console.log(`NOTIFICATION DEBUG: Could not find order details for notification. Order ID: ${req.params.id}`);
      }
    } catch (notificationError) {
      console.error('Error creating pickup notifications:', notificationError);
      // Don't fail the pickup operation if notification fails
    }
    
    conn.release();
    res.json({ 
      message: 'Order picked up successfully', 
      trackingNumber,
      pickupTime: new Date().toISOString()
    });
  } catch (err) {
    console.error('Courier pickup error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
});

// Update order status - Couriers can update delivery status after order is ready for pickup
router.put('/order/:id/status', authMiddleware, courierOnlyMiddleware, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Missing status' });
  
  let conn;
  try {
    conn = await db.getConnection();
    
    // Check if order is assigned to this courier and ready for pickup
    const orderCheckResult = await conn.query(
      'SELECT * FROM VendorProductCustomerCourier WHERE PurchaseId = ? AND Courier = ?',
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
      return res.status(403).json({ error: 'Order not found or not assigned to you' });
    }
    
    const order = orderCheck[0];
    
    // Check if order is ready for pickup (required before any status updates)
    if (order.IsReady_for_Pickup_by_Courier !== 'Y') {
      return res.status(400).json({ error: 'Order is not ready for pickup yet' });
    }
    
    // Generate tracking number when dispatching (first status update)
    let trackingNumber = order.TrackingNo;
    if (!trackingNumber && (status === 'Shipped' || status === 'Dispatched')) {
      trackingNumber = `TRK${Date.now()}${req.params.id}`;
    }
    
    // Update Purchase table status - map to valid ENUM values
    let purchaseStatus = status;
    if (status === 'Out for Delivery') {
      purchaseStatus = 'Shipped'; // Closest valid ENUM value
    } else if (status === 'Dispatched') {
      purchaseStatus = 'Shipped'; // Map frontend 'Dispatched' to backend 'Shipped'
    }
    // 'Delivered' and 'Cancelled' are already valid ENUM values
    
    await conn.query('UPDATE Purchase SET OrderStatus = ? WHERE PuchaseId = ?', [purchaseStatus, req.params.id]);
    
    // Update VendorProductCustomerCourier table based on status
    const updateFields = [];
    const updateValues = [];
    
    if (trackingNumber) {
      updateFields.push('TrackingNo = ?');
      updateValues.push(trackingNumber);
    }
    
    console.log(`DEBUG: Updating order ${req.params.id} with status: ${status}`);
    console.log(`DEBUG: Order ready for pickup: ${order.IsReady_for_Pickup_by_Courier}`);
    console.log(`DEBUG: Order picked up: ${order.IsPicked_by_Courier}`);
    
    // Couriers can update delivery status fields
    if (status === 'Shipped' || status === 'Dispatched') {
      updateFields.push('IsDispatched = "Y", DispatchedTimeStamp = NOW()');
      console.log('DEBUG: Setting IsDispatched = Y');
    } else if (status === 'Out for Delivery') {
      updateFields.push('IsOut_for_Delivery = "Y", Out_for_DeliveryTimeStamp = NOW()');
      console.log('DEBUG: Setting IsOut_for_Delivery = Y');
    } else if (status === 'Delivered') {
      updateFields.push('IsDelivered = "Y", DeliveryTimeStamp = NOW()');
      console.log('DEBUG: Setting IsDelivered = Y');
    } else if (status === 'Returned') {
      updateFields.push('IsReturned = "Y", ReturnTimeStamp = NOW()');
      console.log('DEBUG: Setting IsReturned = Y');
    } else {
      console.log('DEBUG: No matching status condition found');
    }
    
    if (updateFields.length > 0) {
      console.log(`DEBUG: Executing query: UPDATE VendorProductCustomerCourier SET ${updateFields.join(', ')} WHERE PurchaseId = ?`);
      console.log(`DEBUG: Query parameters:`, [...updateValues, req.params.id]);
      
      try {
        await conn.query(
          `UPDATE VendorProductCustomerCourier SET ${updateFields.join(', ')} WHERE PurchaseId = ?`,
          [...updateValues, req.params.id]
        );
        console.log('DEBUG: VendorProductCustomerCourier update successful');
        
        // Create notifications for Dispatched status
        if (status === 'Shipped' || status === 'Dispatched') {
          try {
            console.log(`NOTIFICATION: Order ${req.params.id} marked as dispatched by courier ${req.user.id}`);
            
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
              console.log(`NOTIFICATION DEBUG: Creating dispatched notifications for order ${req.params.id}`);
              console.log(`NOTIFICATION DEBUG: Customer ID: ${order.Customer}, Vendor ID: ${order.Vendor}, Courier ID: ${order.Courier}`);
              
              // Create customer notification
              await conn.query(
                `INSERT INTO notification_customer 
                 (CustomerId, Type, Message, IsRead, RecordCreationTimeStamp) 
                 VALUES (?, ?, ?, 'N', NOW())`,
                [order.Customer, 'Order Update', `Your order #${req.params.id} for ${order.Product} has been dispatched and is on its way for delivery. Tracking number: ${trackingNumber || 'Not available yet'}.`]
              );
              console.log(`NOTIFICATION DEBUG: Customer notification created for CustomerId: ${order.Customer}`);
              
              // Create vendor notification
              await conn.query(
                `INSERT INTO notification_user 
                 (UserId, Type, Message, IsRead, RecordCreationTimeStamp) 
                 VALUES (?, ?, ?, 'N', NOW())`,
                [order.Vendor, 'Order Update', `Order #${req.params.id} for ${order.Product} has been dispatched by courier. The customer will be notified.`]
              );
              console.log(`NOTIFICATION DEBUG: Vendor notification created for UserId: ${order.Vendor}`);
              
              // Create courier notification (confirmation)
              await conn.query(
                `INSERT INTO notification_user 
                 (UserId, Type, Message, IsRead, RecordCreationTimeStamp) 
                 VALUES (?, ?, ?, 'N', NOW())`,
                [order.Courier, 'Order Update', `Order #${req.params.id} for ${order.Product} has been marked as dispatched. Continue with delivery process.`]
              );
              console.log(`NOTIFICATION DEBUG: Courier notification created for UserId: ${order.Courier}`);
              
              console.log(`NOTIFICATION: Created dispatched notifications for order ${req.params.id}`);
            } else {
              console.log(`NOTIFICATION DEBUG: Could not find order details for notification. Order ID: ${req.params.id}`);
            }
          } catch (notificationError) {
            console.error('Error creating dispatched notifications:', notificationError);
            // Don't fail the dispatch operation if notification fails
          }
        }
        
        // Create notifications for Out for Delivery status
        if (status === 'Out for Delivery') {
          try {
            console.log(`NOTIFICATION: Order ${req.params.id} marked as out for delivery by courier ${req.user.id}`);
            
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
              console.log(`NOTIFICATION DEBUG: Creating out for delivery notifications for order ${req.params.id}`);
              console.log(`NOTIFICATION DEBUG: Customer ID: ${order.Customer}, Vendor ID: ${order.Vendor}, Courier ID: ${order.Courier}`);
              
              // Create customer notification
              await conn.query(
                `INSERT INTO notification_customer 
                 (CustomerId, Type, Message, IsRead, RecordCreationTimeStamp) 
                 VALUES (?, ?, ?, 'N', NOW())`,
                [order.Customer, 'Order Update', `Your order #${req.params.id} for ${order.Product} is now out for delivery. The courier is on the way to deliver it to you. Tracking number: ${trackingNumber || 'Not available yet'}.`]
              );
              console.log(`NOTIFICATION DEBUG: Customer notification created for CustomerId: ${order.Customer}`);
              
              // Create vendor notification
              await conn.query(
                `INSERT INTO notification_user 
                 (UserId, Type, Message, IsRead, RecordCreationTimeStamp) 
                 VALUES (?, ?, ?, 'N', NOW())`,
                [order.Vendor, 'Order Update', `Order #${req.params.id} for ${order.Product} is now out for delivery. The customer will be updated shortly.`]
              );
              console.log(`NOTIFICATION DEBUG: Vendor notification created for UserId: ${order.Vendor}`);
              
              // Create courier notification (confirmation)
              await conn.query(
                `INSERT INTO notification_user 
                 (UserId, Type, Message, IsRead, RecordCreationTimeStamp) 
                 VALUES (?, ?, ?, 'N', NOW())`,
                [order.Courier, 'Order Update', `Order #${req.params.id} for ${order.Product} has been marked as out for delivery. Proceed with final delivery to customer.`]
              );
              console.log(`NOTIFICATION DEBUG: Courier notification created for UserId: ${order.Courier}`);
              
              console.log(`NOTIFICATION: Created out for delivery notifications for order ${req.params.id}`);
            } else {
              console.log(`NOTIFICATION DEBUG: Could not find order details for notification. Order ID: ${req.params.id}`);
            }
          } catch (notificationError) {
            console.error('Error creating out for delivery notifications:', notificationError);
            // Don't fail the out for delivery operation if notification fails
          }
        }
        
        // Create notifications for Delivered status
        if (status === 'Delivered') {
          try {
            console.log(`NOTIFICATION: Order ${req.params.id} marked as delivered by courier ${req.user.id}`);
            
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
              console.log(`NOTIFICATION DEBUG: Creating delivered notifications for order ${req.params.id}`);
              console.log(`NOTIFICATION DEBUG: Customer ID: ${order.Customer}, Vendor ID: ${order.Vendor}, Courier ID: ${order.Courier}`);
              
              // Create customer notification
              await conn.query(
                `INSERT INTO notification_customer 
                 (CustomerId, Type, Message, IsRead, RecordCreationTimeStamp) 
                 VALUES (?, ?, ?, 'N', NOW())`,
                [order.Customer, 'Order Update', `Your order #${req.params.id} for ${order.Product} has been successfully delivered. Thank you for shopping with us!`]
              );
              console.log(`NOTIFICATION DEBUG: Customer notification created for CustomerId: ${order.Customer}`);
              
              // Create vendor notification
              await conn.query(
                `INSERT INTO notification_user 
                 (UserId, Type, Message, IsRead, RecordCreationTimeStamp) 
                 VALUES (?, ?, ?, 'N', NOW())`,
                [order.Vendor, 'Order Update', `Order #${req.params.id} for ${order.Product} has been successfully delivered. Payment should be processed accordingly.`]
              );
              console.log(`NOTIFICATION DEBUG: Vendor notification created for UserId: ${order.Vendor}`);
              
              // Create courier notification (confirmation)
              await conn.query(
                `INSERT INTO notification_user 
                 (UserId, Type, Message, IsRead, RecordCreationTimeStamp) 
                 VALUES (?, ?, ?, 'N', NOW())`,
                [order.Courier, 'Order Update', `Order #${req.params.id} for ${order.Product} has been successfully delivered. Delivery process completed.`]
              );
              console.log(`NOTIFICATION DEBUG: Courier notification created for UserId: ${order.Courier}`);
              
              console.log(`NOTIFICATION: Created delivered notifications for order ${req.params.id}`);
            } else {
              console.log(`NOTIFICATION DEBUG: Could not find order details for notification. Order ID: ${req.params.id}`);
            }
          } catch (notificationError) {
            console.error('Error creating delivered notifications:', notificationError);
            // Don't fail the delivered operation if notification fails
          }
        }
      } catch (dbError) {
        console.error('DEBUG: Database error:', dbError);
        throw dbError;
      }
    } else {
      console.log('DEBUG: No fields to update');
    }
    
    // Get updated order details with product info
    const orderResult = await conn.query(
      'SELECT vpc.PurchaseId as PuchaseId, ' +
      'vpc.Vendor, vpc.Product as ProductId, vpc.Customer as CustomerId, ' +
      'vpc.Courier, vpc.TrackingNo, ' +
      'vpc.IsReady_for_Pickup_by_Courier, vpc.Ready_for_Pickup_by_CourierTimeStamp, ' +
      'vpc.IsPicked_by_Courier, vpc.Picked_by_CourierTimeStamp, ' +
      'vpc.IsDispatched, vpc.DispatchedTimeStamp, ' +
      'vpc.IsOut_for_Delivery, vpc.Out_for_DeliveryTimeStamp, ' +
      'vpc.IsDelivered, vpc.DeliveryTimeStamp, ' +
      'vpc.IsReturned, vpc.ReturnTimeStamp, ' +
      'vpc.MRP_SS, vpc.Discount_SS, vpc.GST_SS, vpc.PurchaseQty, ' +
      'vpc.OrderCreationTimeStamp as OrderDate, ' +
      'vpc.Courier as CourierId, ' +
      'pr.Product, pr.MRP as ProductPrice, ' +
      'c.Customer, c.CustomerEmail, c.CustomerMobile, ' +
      'u.User as VendorName, u.UserMobile as VendorMobile, u.UserEmail as VendorEmail ' +
      'FROM VendorProductCustomerCourier vpc ' +
      'JOIN Product pr ON vpc.Product = pr.ProductId ' +
      'JOIN Customer c ON vpc.Customer = c.CustomerId ' +
      'JOIN User u ON vpc.Vendor = u.UserId ' +
      'WHERE vpc.PurchaseId = ? AND vpc.Courier = ?',
      [req.params.id, req.user.id]
    );
    
    // Handle MariaDB result format (can be array of arrays or array of objects)
    let updatedOrder = [];
    if (Array.isArray(orderResult)) {
      if (orderResult.length > 0 && Array.isArray(orderResult[0])) {
        // MariaDB returns [data, metadata] format
        updatedOrder = orderResult[0];
      } else {
        // Direct array of objects
        updatedOrder = orderResult;
      }
    } else if (orderResult && typeof orderResult === 'object') {
      // Single object result
      updatedOrder = [orderResult];
    }
    
    // Convert BigInt values to strings to prevent serialization errors
    let processedUpdatedOrder = {};
    if (updatedOrder && updatedOrder.length > 0) {
      for (const [key, value] of Object.entries(updatedOrder[0])) {
        processedUpdatedOrder[key] = typeof value === 'bigint' ? Number(value) : value;
      }
    }
    
    res.json({ 
      message: 'Order status updated',
      order: processedUpdatedOrder
    });
  } catch (err) {
    console.error('Courier status update error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// Get tracking events for order with product details
router.get('/order/:id/tracking', authMiddleware, courierOnlyMiddleware, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    
    // Get order details with product info and tracking information
    const [order] = await conn.query(
      'SELECT p.*, vpc.Vendor, vpc.Courier, vpc.TrackingNo, ' +
      'vpc.IsReady_for_Pickup_by_Courier, vpc.Ready_for_Pickup_by_CourierTimeStamp, ' +
      'vpc.IsPicked_by_Courier, vpc.Picked_by_CourierTimeStamp, ' +
      'vpc.IsDispatched, vpc.DispatchedTimeStamp, ' +
      'vpc.IsOut_for_Delivery, vpc.Out_for_DeliveryTimeStamp, ' +
      'vpc.IsDelivered, vpc.DeliveryTimeStamp, ' +
      'vpc.IsReturned, vpc.ReturnTimeStamp, ' +
      'COALESCE(p.OrderStatus, \'Order Placed\') as OrderStatus, ' +
      'COALESCE(p.TotalAmount, vpc.MRP_SS) as TotalAmount, ' +
      'COALESCE(p.OrderDate, vpc.OrderCreationTimeStamp) as OrderDate, ' +
      'pr.Product, pr.MRP as ProductPrice, ' +
      'c.Customer, c.CustomerEmail, c.CustomerMobile ' +
      'FROM VendorProductCustomerCourier vpc ' +
      'LEFT JOIN Purchase p ON vpc.PurchaseId = p.PuchaseId ' +
      'JOIN Product pr ON vpc.Product = pr.ProductId ' +
      'JOIN Customer c ON vpc.Customer = c.CustomerId ' +
      'WHERE vpc.PurchaseId = ? AND vpc.Courier = ?',
      [req.params.id, req.user.id]
    );
    
    // Handle MariaDB result format (can be array of arrays or array of objects)
    let orderArray = [];
    if (Array.isArray(order)) {
      if (order.length > 0 && Array.isArray(order[0])) {
        // MariaDB returns [data, metadata] format
        orderArray = order[0];
      } else {
        // Direct array of objects
        orderArray = order;
      }
    } else if (order && typeof order === 'object') {
      // Single object result
      orderArray = [order];
    }
    
    if (!orderArray || orderArray.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Convert BigInt values to numbers to prevent serialization errors
    const processedOrderData = {};
    for (const [key, value] of Object.entries(orderArray[0])) {
      processedOrderData[key] = typeof value === 'bigint' ? Number(value) : value;
    }
    
    // Generate tracking events based on the order status fields
    const trackingEvents = [];
    const orderData = processedOrderData;
    
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
  } finally {
    if (conn) conn.release();
  }
});

// Add tracking event (FULLY FUNCTIONAL - Couriers can update all delivery status fields)
router.post('/order/:id/tracking', authMiddleware, courierOnlyMiddleware, async (req, res) => {
  // Couriers can update all delivery status fields
  const { status, location, description } = req.body;
  if (!status || !location || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  let conn;
  try {
    conn = await db.getConnection();
    
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
    
    res.json({ message: 'Tracking event added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
});

// Get customer address hierarchy
router.get('/customer/address-hierarchy/:localityId', authMiddleware, courierOnlyMiddleware, async (req, res) => {
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
    console.error('Courier address hierarchy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get vendors that have selected this courier as default
router.get('/vendors', authMiddleware, courierOnlyMiddleware, async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    
    const vendorsResult = await conn.query(`
      SELECT 
        vp.Vendor as VendorId,
        u.User as VendorName,
        u.UserMobile as VendorMobile,
        u.UserEmail as VendorEmail,
        vp.Courier as DefaultCourier,
        cu.User as CourierName,
        cu.UserMobile as CourierMobile,
        cu.UserEmail as CourierEmail
      FROM VendorProduct vp
      JOIN User u ON vp.Vendor = u.UserId
      JOIN User cu ON vp.Courier = cu.UserId
      WHERE vp.Courier = ?
      GROUP BY vp.Vendor
    `, [req.user.id]);
    
    // Handle query result
    let vendors = [];
    if (Array.isArray(vendorsResult)) {
      if (Array.isArray(vendorsResult[0])) {
        vendors = vendorsResult[0];
      } else {
        vendors = vendorsResult;
      }
    }
    
    res.json({ vendors });
  } catch (err) {
    console.error('Error fetching vendors:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
});

export default router;