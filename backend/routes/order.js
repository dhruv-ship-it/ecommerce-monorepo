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
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  try {
    const conn = await db.getConnection();
    // Get all items in cart
    const [cartItems] = await conn.query(
      'SELECT ProductId, Quantity FROM ShoppingCart WHERE CustomerId = ?',
      [req.user.id]
    );
    if (!cartItems || cartItems.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'Cart is empty' });
    }
    // For each item, create a purchase record
    for (const item of cartItems) {
      // You may want to fetch product price, GST, Discount, etc. from Product table here
      // For now, set MRP, GST, Discount = 0, TotalAmount = 0 (to be updated as needed)
      await conn.query(
        'INSERT INTO Purchase (ProductId, CustomerId, OrderStatus, TotalAmount, PaymentStatus, PaymentMode) VALUES (?, ?, ?, ?, ?, ?)',
        [item.ProductId, req.user.id, 'Pending', 0, 'Pending', 'COD']
      );
    }
    // Clear cart
    await conn.query('DELETE FROM ShoppingCart WHERE CustomerId = ?', [req.user.id]);
    conn.release();
    res.json({ message: 'Order placed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// View order history
router.get('/history', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  try {
    const conn = await db.getConnection();
    const [orders] = await conn.query(
      'SELECT * FROM Purchase WHERE CustomerId = ? ORDER BY OrderDate DESC',
      [req.user.id]
    );
    conn.release();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// View order details
router.get('/:orderId', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  try {
    const conn = await db.getConnection();
    const [order] = await conn.query(
      'SELECT * FROM Purchase WHERE PuchaseId = ? AND CustomerId = ?',
      [req.params.orderId, req.user.id]
    );
    conn.release();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 