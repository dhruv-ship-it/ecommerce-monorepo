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

// View own products
router.get('/products', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [products] = await conn.query('SELECT * FROM Product WHERE VendorId = ?', [req.user.id]);
    conn.release();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new product
router.post('/product', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  const { name, description, price } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Missing fields' });
  try {
    const conn = await db.getConnection();
    await conn.query('INSERT INTO Product (Product, VendorId, Description, Price) VALUES (?, ?, ?, ?)', [name, req.user.id, description || '', price]);
    conn.release();
    res.json({ message: 'Product added' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product
router.put('/product/:id', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  const { name, description, price } = req.body;
  try {
    const conn = await db.getConnection();
    await conn.query('UPDATE Product SET Product = COALESCE(?, Product), Description = COALESCE(?, Description), Price = COALESCE(?, Price) WHERE ProductId = ? AND VendorId = ?', [name, description, price, req.params.id, req.user.id]);
    conn.release();
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product
router.delete('/product/:id', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    await conn.query('DELETE FROM Product WHERE ProductId = ? AND VendorId = ?', [req.params.id, req.user.id]);
    conn.release();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// View orders for vendor's products
router.get('/orders', authMiddleware, vendorOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [orders] = await conn.query('SELECT * FROM Purchase WHERE ProductId IN (SELECT ProductId FROM Product WHERE VendorId = ?)', [req.user.id]);
    conn.release();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 