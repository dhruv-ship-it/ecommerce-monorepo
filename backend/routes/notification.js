import express from 'express';
import { db } from '../index.js';

const router = express.Router();

// Get notifications for users (vendors/couriers/admins)
router.get('/user', async (req, res) => {
  try {
    console.log('User notification request received');
    console.log('User ID from token:', req.user.id);
    console.log('Full user object:', req.user);
    
    const conn = await db.getConnection();
    
    const notifications = await conn.query(`
      SELECT 
        NotificationId,
        UserId,
        Type,
        Message,
        IsRead,
        RecordCreationTimeStamp
      FROM notification_user
      WHERE UserId = ?
      ORDER BY RecordCreationTimeStamp DESC
    `, [req.user.id]);
    
    console.log('Found notifications:', notifications.length);
    console.log('Notifications data:', notifications);
    
    conn.release();
    
    // Mark all notifications as read
    if (notifications.length > 0) {
      const conn2 = await db.getConnection();
      await conn2.query(`
        UPDATE notification_user
        SET IsRead = 'Y'
        WHERE UserId = ? AND IsRead = 'N'
      `, [req.user.id]);
      conn2.release();
    }
    
    res.json({ notifications });
  } catch (err) {
    console.error('Error fetching user notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get notifications for customers
router.get('/customer', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    const notifications = await conn.query(`
      SELECT 
        NotificationId,
        CustomerId,
        Type,
        Message,
        IsRead,
        RecordCreationTimeStamp
      FROM notification_customer
      WHERE CustomerId = ?
      ORDER BY RecordCreationTimeStamp DESC
    `, [req.customer.id]);
    
    conn.release();
    
    // Mark all notifications as read
    if (notifications.length > 0) {
      const conn2 = await db.getConnection();
      await conn2.query(`
        UPDATE notification_customer
        SET IsRead = 'Y'
        WHERE CustomerId = ? AND IsRead = 'N'
      `, [req.customer.id]);
      conn2.release();
    }
    
    res.json({ notifications });
  } catch (err) {
    console.error('Error fetching customer notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread notification count for user
router.get('/unread-count', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    const [result] = await conn.query(`
      SELECT COUNT(*) as unreadCount
      FROM notification_user
      WHERE UserId = ? AND IsRead = 'N'
    `, [req.user.id]);
    
    conn.release();
    
    res.json({ unreadCount: result.unreadCount });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Get unread notification count for customer
router.get('/unread-count', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    const [result] = await conn.query(`
      SELECT COUNT(*) as unreadCount
      FROM notification_customer
      WHERE CustomerId = ? AND IsRead = 'N'
    `, [req.customer.id]);
    
    conn.release();
    
    res.json({ unreadCount: result.unreadCount });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Debug endpoint to check all notifications (temporary)
router.get('/debug/all', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    const [userNotifications] = await conn.query(`
      SELECT * FROM notification_user
      ORDER BY RecordCreationTimeStamp DESC
      LIMIT 20
    `);
    
    const [customerNotifications] = await conn.query(`
      SELECT * FROM notification_customer
      ORDER BY RecordCreationTimeStamp DESC
      LIMIT 20
    `);
    
    conn.release();
    
    res.json({
      userNotifications,
      customerNotifications
    });
  } catch (err) {
    console.error('Error fetching debug notifications:', err);
    res.status(500).json({ error: 'Failed to fetch debug notifications' });
  }
});

// Test endpoint to manually create sample notifications
router.post('/debug/create-sample', async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // Create sample customer notification
    await conn.query(
      `INSERT INTO notification_customer 
       (CustomerId, Type, Message, IsRead, RecordCreationTimeStamp) 
       VALUES (?, ?, ?, 'N', NOW())`,
      [1, 'Test', 'This is a test customer notification']
    );
    
    // Create sample user notifications
    await conn.query(
      `INSERT INTO notification_user 
       (UserId, Type, Message, IsRead, RecordCreationTimeStamp) 
       VALUES (?, ?, ?, 'N', NOW())`,
      [34, 'Test', 'This is a test vendor notification']
    );
    
    await conn.query(
      `INSERT INTO notification_user 
       (UserId, Type, Message, IsRead, RecordCreationTimeStamp) 
       VALUES (?, ?, ?, 'N', NOW())`,
      [35, 'Test', 'This is a test courier notification']
    );
    
    conn.release();
    
    res.json({ message: 'Sample notifications created successfully' });
  } catch (err) {
    console.error('Error creating sample notifications:', err);
    res.status(500).json({ error: 'Failed to create sample notifications' });
  }
});

export default router;