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

function suOnlyMiddleware(req, res, next) {
  if (req.user.role === 'su') return next();
  return res.status(403).json({ error: 'Forbidden' });
}

// Create a new user (admin, vendor, courier)
router.post('/user', authMiddleware, suOnlyMiddleware, async (req, res) => {
  const { name, gender, mobile, email, pin, dob, address, password, role, locality = 0, rank = 0, isVerified = 'N', isActivated = 'N' } = req.body;
  if (!name || !gender || !mobile || !email || !pin || !dob || !address || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  if (!['admin', 'vendor', 'courier'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const conn = await db.getConnection();
    // Check if email already exists
    const [existing] = await conn.query('SELECT UserId FROM User WHERE UserEmail = ?', [email]);
    if (existing) {
      conn.release();
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    // Set role flags
    let isAdmin = 'N', isVendor = 'N', isCourier = 'N';
    if (role === 'admin') isAdmin = 'Y';
    if (role === 'vendor') isVendor = 'Y';
    if (role === 'courier') isCourier = 'Y';
    // Insert all required fields, provide defaults for others
    await conn.query(
      `INSERT INTO User (User, Gender, UserMobile, UserEmail, PIN, DoB, Passwd, Address, IsAdmin, IsVendor, IsCourier, IsSU, Locality, UserRank, IsVerified, IsActivated, IsBlackListed, IsDead, RecordCreationLogin, LastUpdationLogin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'N', ?, ?, ?, ?, 'N', 'N', ?, ?)`,
      [name, gender, mobile, email, pin, dob, hashed, address, isAdmin, isVendor, isCourier, locality, rank, isVerified, isActivated, email.substring(0, 10), email.substring(0, 10)]
    );
    conn.release();
    res.json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific user by ID
router.get('/user/:id', authMiddleware, suOnlyMiddleware, async (req, res) => {
  const userId = req.params.id;
  try {
    const conn = await db.getConnection();
    const [user] = await conn.query(
      'SELECT UserId, User, UserEmail, UserMobile, Gender, PIN, Locality, DoB, UserRank, Passwd, Address, IsSU, IsAdmin, IsVendor, IsCourier, IsVerified, VerificationTimeStamp, IsActivated, ActivationTimeStamp, IsBlackListed, BlackListTimeStamp, IsDead, DeadTimeStamp, IsDeleted, RecordCreationTimeStamp, RecordCreationLogin, LastUpdationTimeStamp, LastUpdationLogin FROM User WHERE UserId = ?',
      [userId]
    );
    console.log('Fetching user with ID:', userId, 'Result:', user);
    conn.release();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Use JSON.stringify with a replacer to convert all BigInts to numbers
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(user, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    ));
  } catch (err) {
    console.error('Error in /su/user/:id:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List all users
router.get('/users', authMiddleware, suOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    const users = await conn.query('SELECT UserId, User, UserEmail, Gender, UserMobile, PIN, Locality, DoB, UserRank, Address, IsSU, IsAdmin, IsVendor, IsCourier, IsVerified, IsActivated, IsBlackListed, IsDead, IsDeleted FROM User');
    conn.release();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific customer by ID
router.get('/customer/:id', authMiddleware, suOnlyMiddleware, async (req, res) => {
  const customerId = req.params.id;
  try {
    const conn = await db.getConnection();
    const [customer] = await conn.query(
      'SELECT CustomerId, Customer, CustomerEmail, CustomerMobile, Gender, CustomerPIN, Locality, DoB, CustomerRank, Passwd, Address, IsVerified, VerificationTimeStamp, IsActivated, ActivationTimeStamp, IsBlackListed, BlackListTimeStamp, IsDead, DeadTimeStamp, IsDeleted, RecordCreationTimeStamp, RecordCreationLogin, LastUpdationTimeStamp, LastUpdationLogin FROM customer WHERE CustomerId = ?',
      [customerId]
    );
    console.log('Fetching customer with ID:', customerId, 'Result:', customer);
    conn.release();
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    // Use JSON.stringify with a replacer to convert all BigInts to numbers
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(customer, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    ));
  } catch (err) {
    console.error('Error in /su/customer/:id:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List all customers with pagination
router.get('/customers', authMiddleware, suOnlyMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const conn = await db.getConnection();
    const [countResult] = await conn.query('SELECT COUNT(*) as count FROM customer');
    const total = countResult.count || 0;
    const customers = await conn.query(
      'SELECT CustomerId, Customer, CustomerEmail, CustomerMobile, Gender, DoB, Address, CustomerPIN, CustomerRank, Locality, IsVerified, IsActivated, IsBlackListed, IsDead, IsDeleted FROM customer LIMIT ? OFFSET ?',
      [limit, offset]
    );
    console.log('Fetched customers:', customers);
    conn.release();
    // Use JSON.stringify with a replacer to convert all BigInts to numbers
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ customers, total, page, limit }, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    ));
  } catch (err) {
    console.error('Error in /su/customers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a user (SU only)
router.put('/user/:id', authMiddleware, suOnlyMiddleware, async (req, res) => {
  const userId = req.params.id;
  const {
    name, gender, mobile, email, pin, locality, dob, rank, passwd, address,
    isSU, isAdmin, isVendor, isCourier, isVerified, isActivated, isBlackListed, isDead
  } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing user id' });
  try {
    const conn = await db.getConnection();
    // Check for unique email/mobile if changed
    if (email) {
      const [existing] = await conn.query('SELECT UserId FROM User WHERE UserEmail = ? AND UserId != ?', [email, userId]);
      if (existing) {
        conn.release();
        return res.status(400).json({ error: 'Email already in use' });
      }
    }
    if (mobile) {
      const [existing] = await conn.query('SELECT UserId FROM User WHERE UserMobile = ? AND UserId != ?', [mobile, userId]);
      if (existing) {
        conn.release();
        return res.status(400).json({ error: 'Mobile already in use' });
      }
    }
    // Build update query
    await conn.query(
      `UPDATE User SET
        User = COALESCE(?, User),
        Gender = COALESCE(?, Gender),
        UserMobile = COALESCE(?, UserMobile),
        UserEmail = COALESCE(?, UserEmail),
        PIN = COALESCE(?, PIN),
        Locality = COALESCE(?, Locality),
        DoB = COALESCE(?, DoB),
        UserRank = COALESCE(?, UserRank),
        Passwd = COALESCE(?, Passwd),
        Address = COALESCE(?, Address),
        IsSU = COALESCE(?, IsSU),
        IsAdmin = COALESCE(?, IsAdmin),
        IsVendor = COALESCE(?, IsVendor),
        IsCourier = COALESCE(?, IsCourier),
        IsVerified = COALESCE(?, IsVerified),
        IsActivated = COALESCE(?, IsActivated),
        IsBlackListed = COALESCE(?, IsBlackListed),
        IsDead = COALESCE(?, IsDead)
      WHERE UserId = ?`,
      [name, gender, mobile, email, pin, locality, dob, rank, passwd, address,
        isSU, isAdmin, isVendor, isCourier, isVerified, isActivated, isBlackListed, isDead, userId]
    );
    conn.release();
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a customer (SU only)
router.put('/customer/:id', authMiddleware, suOnlyMiddleware, async (req, res) => {
  const customerId = req.params.id;
  const {
    Customer, Gender, CustomerMobile, CustomerEmail, CustomerPIN, Locality, DoB, CustomerRank, Address,
    IsVerified, IsActivated, IsBlackListed, IsDead, IsDeleted
  } = req.body;
  if (!customerId) return res.status(400).json({ error: 'Missing customer id' });
  try {
    const conn = await db.getConnection();
    // Check for unique email/mobile if changed
    if (CustomerEmail) {
      const [existing] = await conn.query('SELECT CustomerId FROM customer WHERE CustomerEmail = ? AND CustomerId != ?', [CustomerEmail, customerId]);
      if (existing) {
        conn.release();
        return res.status(400).json({ error: 'Email already in use' });
      }
    }
    if (CustomerMobile) {
      const [existing] = await conn.query('SELECT CustomerId FROM customer WHERE CustomerMobile = ? AND CustomerId != ?', [CustomerMobile, customerId]);
      if (existing) {
        conn.release();
        return res.status(400).json({ error: 'Mobile already in use' });
      }
    }
    // Build update query
    await conn.query(
      `UPDATE customer SET
        Customer = COALESCE(?, Customer),
        Gender = COALESCE(?, Gender),
        CustomerMobile = COALESCE(?, CustomerMobile),
        CustomerEmail = COALESCE(?, CustomerEmail),
        CustomerPIN = COALESCE(?, CustomerPIN),
        Locality = COALESCE(?, Locality),
        DoB = COALESCE(?, DoB),
        CustomerRank = COALESCE(?, CustomerRank),
        Address = COALESCE(?, Address),
        IsVerified = COALESCE(?, IsVerified),
        IsActivated = COALESCE(?, IsActivated),
        IsBlackListed = COALESCE(?, IsBlackListed),
        IsDead = COALESCE(?, IsDead),
        IsDeleted = COALESCE(?, IsDeleted)
      WHERE CustomerId = ?`,
      [Customer, Gender, CustomerMobile, CustomerEmail, CustomerPIN, Locality, DoB, CustomerRank, Address,
        IsVerified, IsActivated, IsBlackListed, IsDead, IsDeleted, customerId]
    );
    console.log('Updated customer with ID:', customerId);
    conn.release();
    res.json({ message: 'Customer updated' });
  } catch (err) {
    console.error('Error in /su/customer/:id PUT:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 