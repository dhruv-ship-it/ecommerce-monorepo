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

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) return res.status(400).json({ error: 'User ID missing in token' });
    const conn = await db.getConnection();
    const [user] = await conn.query(`SELECT UserId, User, Gender, UserMobile, UserEmail, Address, DoB, IsSU, IsAdmin, IsVendor, IsCourier, IsVerified, IsActivated, IsBlackListed, IsDead, IsDeleted, UserRank, Locality, RecordCreationTimeStamp, LastUpdationTimeStamp, VerificationTimeStamp FROM user WHERE UserId = ?`, [userId]);
    conn.release();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile (name, email, profile image, address, etc.)
router.put('/profile', authMiddleware, async (req, res) => {
  const { name, email, gender, mobile, dob, address, profile_image } = req.body;
  if (!name && !email && !gender && !mobile && !dob && !address && !profile_image) return res.status(400).json({ error: 'No fields to update' });
  try {
    const conn = await db.getConnection();
    if (email) {
      // Check if email is taken by another user
      const [existing] = await conn.query('SELECT UserId FROM user WHERE UserEmail = ? AND UserId != ?', [email, req.user.id]);
      if (existing) {
        conn.release();
        return res.status(400).json({ error: 'Email already in use' });
      }
    }
    await conn.query(
      'UPDATE user SET User = COALESCE(?, User), UserEmail = COALESCE(?, UserEmail), Gender = COALESCE(?, Gender), UserMobile = COALESCE(?, UserMobile), DoB = COALESCE(?, DoB), Address = COALESCE(?, Address), ProfileImage = COALESCE(?, ProfileImage) WHERE UserId = ?',
      [name, email, gender, mobile, dob, address, profile_image, req.user.id]
    );
    conn.release();
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update password
router.put('/password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  try {
    const conn = await db.getConnection();
    const [user] = await conn.query('SELECT Passwd FROM user WHERE UserId = ?', [req.user.id]);
    if (!user) {
      conn.release();
      return res.status(404).json({ error: 'User not found' });
    }
    const valid = await bcrypt.compare(oldPassword, user.Passwd);
    if (!valid) {
      conn.release();
      return res.status(400).json({ error: 'Old password incorrect' });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await conn.query('UPDATE user SET Passwd = ? WHERE UserId = ?', [hashed, req.user.id]);
    conn.release();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (SU/Admin only)
router.delete('/:id', authMiddleware, suOrAdminMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    await conn.query('DELETE FROM user WHERE UserId = ?', [req.params.id]);
    conn.release();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 