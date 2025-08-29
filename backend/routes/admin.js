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

function adminOnlyMiddleware(req, res, next) {
  if (req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Forbidden' });
}

// View all customers
router.get('/customers', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [customers] = await conn.query('SELECT * FROM Customer');
    conn.release();
    res.json({ customers });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// View all orders
router.get('/orders', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [orders] = await conn.query('SELECT * FROM Purchase');
    conn.release();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// View all products
router.get('/products', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [products] = await conn.query('SELECT * FROM Product');
    conn.release();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// (Optional) Manage users/customers: activate/deactivate/delete
// Example: Delete a customer
router.delete('/customer/:id', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    await conn.query('DELETE FROM Customer WHERE CustomerId = ?', [req.params.id]);
    conn.release();
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 