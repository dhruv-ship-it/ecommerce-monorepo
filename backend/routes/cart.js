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

// Get all items in the customer's cart
router.get('/', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  try {
    const conn = await db.getConnection();
    const [items] = await conn.query(
      'SELECT ShoppingCartId, ProductId, Quantity FROM ShoppingCart WHERE CustomerId = ?',
      [req.user.id]
    );
    conn.release();
    res.json({ cart: items });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add item to cart (if exists, update quantity)
router.post('/add', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  const { productId, quantity } = req.body;
  if (!productId || !quantity) return res.status(400).json({ error: 'Missing fields' });
  try {
    const conn = await db.getConnection();
    // Check if item already in cart
    const [existing] = await conn.query(
      'SELECT ShoppingCartId, Quantity FROM ShoppingCart WHERE CustomerId = ? AND ProductId = ?',
      [req.user.id, productId]
    );
    if (existing) {
      // Update quantity
      await conn.query(
        'UPDATE ShoppingCart SET Quantity = Quantity + ? WHERE ShoppingCartId = ?',
        [quantity, existing.ShoppingCartId]
      );
    } else {
      // Insert new item
      await conn.query(
        'INSERT INTO ShoppingCart (CustomerId, ProductId, Quantity) VALUES (?, ?, ?)',
        [req.user.id, productId, quantity]
      );
    }
    conn.release();
    res.json({ message: 'Cart updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update quantity of an item in cart
router.put('/update', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  const { productId, quantity } = req.body;
  if (!productId || !quantity) return res.status(400).json({ error: 'Missing fields' });
  try {
    const conn = await db.getConnection();
    await conn.query(
      'UPDATE ShoppingCart SET Quantity = ? WHERE CustomerId = ? AND ProductId = ?',
      [quantity, req.user.id, productId]
    );
    conn.release();
    res.json({ message: 'Cart item updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove item from cart
router.delete('/remove', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'Missing productId' });
  try {
    const conn = await db.getConnection();
    await conn.query(
      'DELETE FROM ShoppingCart WHERE CustomerId = ? AND ProductId = ?',
      [req.user.id, productId]
    );
    conn.release();
    res.json({ message: 'Item removed from cart' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get cart item count for the logged-in customer
router.get('/count', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  try {
    const conn = await db.getConnection();
    const [result] = await conn.query('SELECT COUNT(*) as count FROM ShoppingCart WHERE CustomerId = ?', [req.user.id]);
    conn.release();
    res.json({ count: result ? result.count : 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 