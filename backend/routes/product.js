import express from 'express';
import { db } from '../index.js';

const router = express.Router();

// List all products
router.get('/', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [products] = await conn.query('SELECT * FROM Product');
    conn.release();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get product details by id
router.get('/:id', async (req, res) => {
  try {
    const conn = await db.getConnection();
    const [product] = await conn.query('SELECT * FROM Product WHERE ProductId = ?', [req.params.id]);
    conn.release();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 