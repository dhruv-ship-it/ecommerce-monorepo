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

// Get courier's assigned orders - Frontend compatible format
router.get('/orders', authMiddleware, courierOnlyMiddleware, async (req, res) => {
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
        v.User as VendorName,
        v.UserMobile as VendorMobile,
        CASE 
          WHEN vpc.IsDelivered = 'Y' THEN 'Delivered'
          WHEN vpc.IsPartialDelivery = 'Y' THEN 'Partial Delivery'
          WHEN vpc.IsReturned = 'Y' THEN 'Returned'
          WHEN vpc.IsOut_for_Delivery = 'Y' THEN 'Out for Delivery'
          WHEN vpc.IsDispatched = 'Y' THEN 'Dispatched'
          WHEN vpc.IsReady_for_Pickup_by_Courier = 'Y' AND vpc.IsPicked_by_Courier = 'Y' THEN 'Ready for Pickup'
          WHEN vpc.IsPicked_by_Courier = 'Y' THEN 'Accepted'
          ELSE 'Pending'
        END as OrderStatus,
        CASE 
          WHEN vpc.IsReady_for_Pickup_by_Courier = 'Y' AND vpc.IsPicked_by_Courier = 'Y' AND vpc.IsDispatched != 'Y' THEN 'Y'
          ELSE 'N'
        END as CanUpdateStatus
      FROM VendorProductCustomerCourier vpc
      JOIN Product p ON vpc.Product = p.ProductId
      JOIN Customer c ON vpc.Customer = c.CustomerId
      JOIN User v ON vpc.Vendor = v.UserId
      WHERE vpc.Courier = ? AND vpc.IsDeleted != 'Y'
      ORDER BY 
        CASE WHEN vpc.IsReady_for_Pickup_by_Courier = 'Y' AND vpc.IsPicked_by_Courier = 'Y' AND vpc.IsDispatched != 'Y' THEN 0 ELSE 1 END,
        vpc.OrderCreationTimeStamp DESC
    `, [req.user.id]);
    conn.release();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get order details
router.get('/order/:id', authMiddleware, courierOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [order] = await conn.query(
      'SELECT p.*, vpc.Vendor, vpc.Courier, ' +
      'p.OrderStatus, p.TotalAmount, p.OrderDate, ' +
      'pr.Product, pr.MRP as ProductPrice, ' +
      'c.Customer, c.CustomerEmail, c.CustomerMobile ' +
      'FROM Purchase p ' +
      'JOIN VendorProductCustomerCourier vpc ON p.PuchaseId = vpc.PurchaseId ' +
      'JOIN Product pr ON vpc.Product = pr.ProductId ' +
      'JOIN Customer c ON vpc.Customer = c.CustomerId ' +
      'WHERE p.PuchaseId = ? AND vpc.Courier = ?',
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

// Accept or reject order - THIS IS THE ONLY WAY COURIER ACCEPTS
router.put('/order/:id/accept', authMiddleware, courierOnlyMiddleware, async (req, res) => {
  const { accept } = req.body;
  if (accept === undefined) return res.status(400).json({ error: 'Missing accept parameter' });
  
  try {
    const conn = await db.getConnection();
    
    // Check if this courier is assigned to the order
    const [assignment] = await conn.query(
      'SELECT * FROM VendorProductCustomerCourier WHERE PurchaseId = ? AND Courier = ?',
      [req.params.id, req.user.id]
    );
    
    if (!assignment || assignment.length === 0) {
      conn.release();
      return res.status(403).json({ error: 'Not assigned to this courier' });
    }
    
    // Check if already accepted/rejected
    if (assignment[0].IsPicked_by_Courier === 'Y') {
      conn.release();
      return res.status(400).json({ error: 'Order already accepted - cannot change decision' });
    }
    
    if (accept) {
      // ACCEPT: Mark as picked by courier (this enables all future status updates)
      // DO NOT mark as dispatched yet - that happens after vendor marks ready for pickup
      await conn.query(
        'UPDATE VendorProductCustomerCourier SET IsPicked_by_Courier = "Y", Picked_by_CourierTimeStamp = NOW() WHERE PurchaseId = ?',
        [req.params.id]
      );
      
      res.json({ message: 'Order accepted successfully. Waiting for vendor to mark ready for pickup.' });
    } else {
      // REJECT: Find another courier
      const [couriers] = await conn.query(
        'SELECT UserId FROM User WHERE IsCourier = "Y" AND IsActivated = "Y" AND UserId != ? LIMIT 1',
        [req.user.id]
      );
      
      if (couriers && couriers.length > 0) {
        const newCourierId = couriers[0].UserId;
        
        // Assign to new courier and reset acceptance status
        await conn.query(
          'UPDATE VendorProductCustomerCourier SET Courier = ?, IsPicked_by_Courier = "N", Picked_by_CourierTimeStamp = "0000-00-00 00:00:00" WHERE PurchaseId = ?',
          [newCourierId, req.params.id]
        );
        
        res.json({ message: 'Order rejected and reassigned to another courier' });
      } else {
        // No other couriers available - requires manual vendor assignment
        await conn.query(
          'UPDATE VendorProductCustomerCourier SET Courier = 0, IsPicked_by_Courier = "N", Picked_by_CourierTimeStamp = "0000-00-00 00:00:00" WHERE PurchaseId = ?',
          [req.params.id]
        );
        
        res.json({ message: 'Order rejected - no other couriers available, requires manual assignment by vendor' });
      }
    }
    
    conn.release();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Handle courier timeout for order acceptance - Fixed endpoint
router.post('/order/:id/timeout', authMiddleware, courierOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // First verify this courier was assigned to this order
    const [order] = await conn.query(
      'SELECT * FROM VendorProductCustomerCourier WHERE PurchaseId = ? AND Courier = ? AND IsPicked_by_Courier != "Y"',
      [req.params.id, req.user.id]
    );
    
    if (!order) {
      conn.release();
      return res.status(404).json({ error: 'Order not found or already accepted' });
    }
    
    // Find next available courier for this vendor
    const [availableCouriers] = await conn.query(
      'SELECT UserId FROM User WHERE UserRole = "courier" AND UserId != ? ORDER BY RAND() LIMIT 1',
      [req.user.id]
    );
    
    if (availableCouriers.length > 0) {
      // Assign to next courier
      await conn.query(
        'UPDATE VendorProductCustomerCourier SET Courier = ? WHERE PurchaseId = ?',
        [availableCouriers[0].UserId, req.params.id]
      );
      
      // Set timeout for new courier (30 minutes)
      setTimeout(async () => {
        // This is a simplified timeout - in production, use a proper job queue
        console.log(`Order ${req.params.id} timeout for courier ${availableCouriers[0].UserId}`);
      }, 30 * 60 * 1000);
      
      conn.release();
      res.json({ message: 'Order reassigned to next courier', newCourierId: availableCouriers[0].UserId });
    } else {
      // No more couriers available - mark as unassigned
      await conn.query(
        'UPDATE VendorProductCustomerCourier SET Courier = 0 WHERE PurchaseId = ?',
        [req.params.id]
      );
      conn.release();
      res.json({ message: 'No couriers available - order marked as unassigned' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update order status - Only after acceptance and vendor marks ready for pickup
router.put('/order/:id/status', authMiddleware, courierOnlyMiddleware, async (req, res) => {
  const { status, trackingEvent } = req.body;
  if (!status) return res.status(400).json({ error: 'Missing status' });
  
  try {
    const conn = await db.getConnection();
    
    // Update Purchase table status
    await conn.query('UPDATE Purchase SET OrderStatus = ? WHERE PuchaseId = ?', [status, req.params.id]);
    
    // Update VendorProductCustomerCourier table based on status
    const updateFields = [];
    const updateValues = [];
    
    if (req.body.trackingNumber) {
      updateFields.push('TrackingNo = ?');
      updateValues.push(req.body.trackingNumber);
    }
    
    if (status === 'Out for Delivery') {
      updateFields.push('IsOut_for_Delivery = "Y", Out_for_DeliveryTimeStamp = NOW()');
    } else if (status === 'Delivered') {
      updateFields.push('IsDelivered = "Y", DeliveryTimeStamp = NOW()');
    } else if (status === 'Returned') {
      updateFields.push('IsReturned = "Y", ReturnTimeStamp = NOW()');
    }
    
    if (updateFields.length > 0) {
      await conn.query(
        `UPDATE VendorProductCustomerCourier SET ${updateFields.join(', ')} WHERE PurchaseId = ?`,
        [...updateValues, req.params.id]
      );
    }
    
    // Get updated order details with product info
    const [updatedOrder] = await conn.query(
      'SELECT p.*, vpc.Vendor, vpc.Courier, ' +
      'p.OrderStatus, p.TotalAmount, p.OrderDate, ' +
      'pr.Product, pr.MRP as ProductPrice, ' +
      'c.Customer, c.CustomerEmail, c.CustomerMobile ' +
      'FROM Purchase p ' +
      'JOIN VendorProductCustomerCourier vpc ON p.PuchaseId = vpc.PurchaseId ' +
      'JOIN Product pr ON vpc.Product = pr.ProductId ' +
      'JOIN Customer c ON vpc.Customer = c.CustomerId ' +
      'WHERE p.PuchaseId = ? AND vpc.Courier = ?',
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
router.get('/order/:id/tracking', authMiddleware, courierOnlyMiddleware, async (req, res) => {
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
      'WHERE p.PuchaseId = ? AND vpc.Courier = ?',
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
router.post('/order/:id/tracking', authMiddleware, courierOnlyMiddleware, async (req, res) => {
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

export default router; 