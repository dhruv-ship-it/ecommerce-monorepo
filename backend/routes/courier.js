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

// View assigned deliveries/orders
router.get('/orders', authMiddleware, courierOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    // Assuming a VendorProductCustomerCourier or similar assignment table exists
    const [orders] = await conn.query('SELECT * FROM Purchase WHERE PuchaseId IN (SELECT PurchaseId FROM VendorProductCustomerCourier WHERE CourierId = ?)', [req.user.id]);
    conn.release();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update delivery status
router.put('/order/:id/status', authMiddleware, courierOnlyMiddleware, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Missing status' });
  try {
    const conn = await db.getConnection();
    await conn.query('UPDATE Purchase SET OrderStatus = ? WHERE PuchaseId = ?', [status, req.params.id]);
    conn.release();
    res.json({ message: 'Order status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 