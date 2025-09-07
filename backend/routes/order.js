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

// Place order from cart
router.post('/place', authMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // For customers, req.user.id is already the CustomerId from JWT token
    if (req.user.userType !== 'customer') {
      conn.release();
      return res.status(403).json({ error: 'Only customers can place orders' });
    }
    
    const customerId = req.user.id;
    
    // Get cart items for the customer
    const [cartItems] = await conn.query('SELECT ProductId, Quantity FROM shoppingcart WHERE CustomerId = ?', [customerId]);
    
    if (!cartItems || cartItems.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    // Process each cart item
    for (const item of cartItems) {
      // Get vendor and default courier for this product
      const [vendorProduct] = await conn.query(
        'SELECT Vendor, Courier as DefaultCourier, MRP_SS, Discount_SS, GST_SS FROM vendorproduct WHERE Product = ? AND IsDeleted != "Y" AND IsNotAvailable != "Y" LIMIT 1',
        [item.ProductId]
      );
      
      if (!vendorProduct || vendorProduct.length === 0) {
        continue; // Skip if product not found in vendor catalog
      }
      
      const vendor = vendorProduct[0];
      const totalAmount = (parseFloat(vendor.MRP_SS) - parseFloat(vendor.Discount_SS) + parseFloat(vendor.GST_SS)) * item.Quantity;
      
      // Create purchase record
      await conn.query(
        'INSERT INTO purchase (ProductId, CustomerId, OrderStatus, TotalAmount, PaymentStatus, PaymentMode) VALUES (?, ?, ?, ?, ?, ?)',
        [item.ProductId, customerId, 'Pending', totalAmount, 'Pending', 'COD']
      );
      
      const [lastPurchase] = await conn.query('SELECT LAST_INSERT_ID() as id');
      const purchaseId = lastPurchase[0].id;
      
      // Use default courier from VendorProduct, fallback to any available courier
      let courierId = vendor.DefaultCourier;
      
      if (!courierId || courierId === 0) {
        const [couriers] = await conn.query(
          'SELECT UserId FROM user WHERE IsCourier = "Y" AND IsActivated = "Y" LIMIT 1'
        );
        courierId = couriers && couriers.length > 0 ? couriers[0].UserId : 0;
      }
      
      if (courierId && courierId !== 0) {
        // Create order entry in vendorproductcustomercourier table
        await conn.query(
          `INSERT INTO vendorproductcustomercourier 
           (PurchaseId, Customer, Product, Vendor, Courier, MRP_SS, Discount_SS, GST_SS, PurchaseQty, 
            OrderCreationTimeStamp, IsReady_for_Pickup_by_Courier, TrackingNo, 
            IsPicked_by_Courier, IsDispatched, IsOut_for_Delivery, IsDelivered, 
            IsPartialDelivery, IsReturned, IsDeleted, RecordCreationLogin) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'N', '', 'N', 'N', 'N', 'N', 'N', 'N', 'N', ?)`,
          [purchaseId, customerId, item.ProductId, vendor.Vendor, courierId, vendor.MRP_SS, vendor.Discount_SS, vendor.GST_SS, item.Quantity, customerId]
        );
        
        // Set up 30-minute timeout for courier acceptance
        const [orderEntry] = await conn.query('SELECT LAST_INSERT_ID() as id');
        const orderEntryId = orderEntry[0].id;
        
        setTimeout(async () => {
          try {
            const timeoutConn = await db.getConnection();
            // Check if the order is still pending (courier not picked up)
            const rows = await timeoutConn.query(
              'SELECT * FROM vendorproductcustomercourier WHERE PurchaseId = ?',
              [orderEntryId]
            );
            
            // Handle case where no order is found
            if (!rows || (Array.isArray(rows) && rows.length === 0)) {
              timeoutConn.release();
              return;
            }
            
            // Extract the order from the result
            const order = Array.isArray(rows) ? rows[0] : rows;
            if (order.IsPicked_by_Courier !== 'Y') {
              // Order hasn't been accepted yet, try to assign to another courier
              const [newCouriers] = await timeoutConn.query(
                'SELECT UserId FROM user WHERE IsCourier = "Y" AND IsActivated = "Y" AND UserId != ? LIMIT 1',
                [courierId]
              );
              
              if (newCouriers && newCouriers.length > 0) {
                const newCourierId = newCouriers[0].UserId;
                
                // Update courier assignment
                await timeoutConn.query(
                  'UPDATE vendorproductcustomercourier SET Courier = ? WHERE PurchaseId = ?',
                  [newCourierId, purchaseId]
                );
                
                console.log(`Order ${purchaseId} reassigned to courier ${newCourierId}`);
              } else {
                // No other couriers available, mark as no available courier
                await timeoutConn.query(
                  'UPDATE purchase SET OrderStatus = "No Courier Available" WHERE PuchaseId = ?',
                  [purchaseId]
                );
                
                // Clear courier assignment
                await timeoutConn.query(
                  'UPDATE vendorproductcustomercourier SET Courier = 0 WHERE PurchaseId = ?',
                  [purchaseId]
                );
                
                console.log(`Order ${purchaseId} marked as no courier available`);
              }
            }
            timeoutConn.release();
          } catch (error) {
            console.error(`Error in timeout handler for order ${purchaseId}:`, error);
          }
        }, 30 * 60 * 1000); // 30 minutes timeout
      }
    }
    
    // Clear cart
    await conn.query('DELETE FROM shoppingcart WHERE CustomerId = ?', [customerId]);
    conn.release();
    res.json({ message: 'Order placed' });
  } catch (err) {
    console.error('Order placement error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

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
       vpc.IsDelivered, vpc.DeliveryTimeStamp
       FROM purchase p
       JOIN product pr ON p.ProductId = pr.ProductId
       JOIN model m ON pr.Model = m.ModelId
       LEFT JOIN vendorproductcustomercourier vpc ON p.PuchaseId = vpc.PurchaseId
       WHERE p.CustomerId = ? 
       ORDER BY p.OrderDate DESC`,
      [customerId]
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
    
    const rows = await conn.query(
      `SELECT p.*, vpc.Vendor, vpc.Courier, vpc.TrackingNo, 
       vpc.IsReady_for_Pickup_by_Courier, vpc.Ready_for_Pickup_by_CourierTimeStamp,
       vpc.IsPicked_by_Courier, vpc.Picked_by_CourierTimeStamp, 
       vpc.IsDispatched, vpc.DispatchedTimeStamp,
       vpc.IsOut_for_Delivery, vpc.Out_for_DeliveryTimeStamp,
       vpc.IsDelivered, vpc.DeliveryTimeStamp
       FROM purchase p
       LEFT JOIN vendorproductcustomercourier vpc ON p.PuchaseId = vpc.PurchaseId
       WHERE p.PuchaseId = ? AND p.CustomerId = ?`,
      [req.params.orderId, customerId]
    );
    conn.release();
    
    // Handle case where no order is found
    if (!rows || (Array.isArray(rows) && rows.length === 0)) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Extract the order from the result
    const order = Array.isArray(rows) ? rows[0] : rows;
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
    const rows = await conn.query(
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
      'u.User as CourierName, u.UserMobile as CourierMobile ' +
      'FROM purchase p ' +
      'JOIN vendorproductcustomercourier vpc ON p.PuchaseId = vpc.PurchaseId ' +
      'JOIN product pr ON vpc.Product = pr.ProductId ' +
      'JOIN customer c ON vpc.Customer = c.CustomerId ' +
      'JOIN user v ON vpc.Vendor = v.UserId ' +
      'LEFT JOIN user u ON vpc.Courier = u.UserId ' +
      'WHERE p.PuchaseId = ? AND vpc.Customer = ?',
      [req.params.orderId, customerId]
    );
    
    conn.release();
    
    // Handle case where no order is found
    if (!rows || (Array.isArray(rows) && rows.length === 0)) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Extract the order from the result
    const orderData = Array.isArray(rows) ? rows[0] : rows;
    
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
    
    // Add status updates based on order fields
    if (orderData.IsPicked_by_Courier === 'Y' && orderData.Picked_by_CourierTimeStamp && orderData.Picked_by_CourierTimeStamp !== '0000-00-00 00:00:00') {
      trackingEvents.push({
        TrackingEventId: 2,
        PurchaseId: orderData.PuchaseId,
        status: "Courier Accepted",
        location: "Vendor Location",
        description: `Order #${orderData.PuchaseId} accepted by courier ${orderData.CourierName || 'N/A'}.`,
        timestamp: orderData.Picked_by_CourierTimeStamp
      });
    }
    
    if (orderData.IsReady_for_Pickup_by_Courier === 'Y' && orderData.Ready_for_Pickup_by_CourierTimeStamp && orderData.Ready_for_Pickup_by_CourierTimeStamp !== '0000-00-00 00:00:00') {
      trackingEvents.push({
        TrackingEventId: 3,
        PurchaseId: orderData.PuchaseId,
        status: "Ready for Pickup",
        location: "Vendor Location",
        description: `Order #${orderData.PuchaseId} marked ready for pickup by vendor ${orderData.VendorName || 'N/A'}.`,
        timestamp: orderData.Ready_for_Pickup_by_CourierTimeStamp
      });
    }
    
    if (orderData.IsDispatched === 'Y' && orderData.DispatchedTimeStamp && orderData.DispatchedTimeStamp !== '0000-00-00 00:00:00') {
      trackingEvents.push({
        TrackingEventId: 4,
        PurchaseId: orderData.PuchaseId,
        status: "Shipped",
        location: "Distribution Center",
        description: `Order #${orderData.PuchaseId} has been shipped and is ready for delivery.`,
        timestamp: orderData.DispatchedTimeStamp
      });
    }
    
    if (orderData.IsOut_for_Delivery === 'Y' && orderData.Out_for_DeliveryTimeStamp && orderData.Out_for_DeliveryTimeStamp !== '0000-00-00 00:00:00') {
      trackingEvents.push({
        TrackingEventId: 5,
        PurchaseId: orderData.PuchaseId,
        status: "Out for Delivery",
        location: "Local Delivery Hub",
        description: `Order #${orderData.PuchaseId} is out for delivery by courier ${orderData.CourierName || 'N/A'}.`,
        timestamp: orderData.Out_for_DeliveryTimeStamp
      });
    }
    
    if (orderData.IsDelivered === 'Y' && orderData.DeliveryTimeStamp && orderData.DeliveryTimeStamp !== '0000-00-00 00:00:00') {
      trackingEvents.push({
        TrackingEventId: 6,
        PurchaseId: orderData.PuchaseId,
        status: "Delivered",
        location: "Customer Address",
        description: `Order #${orderData.PuchaseId} has been successfully delivered.`,
        timestamp: orderData.DeliveryTimeStamp
      });
    } else if (orderData.IsReturned === 'Y' && orderData.ReturnTimeStamp && orderData.ReturnTimeStamp !== '0000-00-00 00:00:00') {
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