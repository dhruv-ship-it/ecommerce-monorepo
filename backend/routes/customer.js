import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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

function suOrAdminMiddleware(req, res, next) {
  if (req.user.role === 'su' || req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Forbidden' });
}

// Get customer profile
router.get('/profile', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  try {
    const conn = await db.getConnection();
    const [customer] = await conn.query('SELECT CustomerId, Customer, CustomerEmail, CustomerMobile, Gender, DoB, Address, CustomerPIN FROM customer WHERE CustomerId = ?', [req.user.id]);
    conn.release();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update customer profile
router.put('/profile', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  const { name, email, mobile, gender, dob, address, profile_image } = req.body;
  if (!name && !email && !mobile && !gender && !dob && !address && !profile_image) return res.status(400).json({ error: 'No fields to update' });
  try {
    const conn = await db.getConnection();
    if (email) {
      // Check if email is taken by another customer
      const [existing] = await conn.query('SELECT CustomerId FROM customer WHERE CustomerEmail = ? AND CustomerId != ?', [email, req.user.id]);
      if (existing) {
        conn.release();
        return res.status(400).json({ error: 'Email already in use' });
      }
    }
    await conn.query(
      'UPDATE customer SET CustomerName = COALESCE(?, CustomerName), CustomerEmail = COALESCE(?, CustomerEmail), CustomerMobile = COALESCE(?, CustomerMobile), CustomerGender = COALESCE(?, CustomerGender), CustomerDoB = COALESCE(?, CustomerDoB), CustomerAddress = COALESCE(?, CustomerAddress), ProfileImage = COALESCE(?, ProfileImage) WHERE CustomerId = ?',
      [name, email, mobile, gender, dob, address, profile_image, req.user.id]
    );
    conn.release();
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update password
router.put('/password', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  try {
    const conn = await db.getConnection();
    const [customer] = await conn.query('SELECT CustomerPasswd FROM customer WHERE CustomerId = ?', [req.user.id]);
    if (!customer) {
      conn.release();
      return res.status(404).json({ error: 'Customer not found' });
    }
    const valid = await bcrypt.compare(oldPassword, customer.CustomerPasswd);
    if (!valid) {
      conn.release();
      return res.status(400).json({ error: 'Old password incorrect' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await conn.query('UPDATE customer SET CustomerPasswd = ? WHERE CustomerId = ?', [hashed, req.user.id]);
    conn.release();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete customer (SU/Admin only)
router.delete('/:id', authMiddleware, suOrAdminMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    await conn.query('DELETE FROM customer WHERE CustomerId = ?', [req.params.id]);
    conn.release();
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 