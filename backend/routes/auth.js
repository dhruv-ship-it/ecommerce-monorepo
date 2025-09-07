import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../index.js';

const router = express.Router();

// Customer Login Only
router.post('/customer-login', async (req, res) => {
  const { email, username, password } = req.body;
  const loginId = email || username;
  if (!loginId || !password) return res.status(400).json({ error: 'Missing fields' });
  let conn;
  try {
    conn = await db.getConnection();
    console.log('DB connection acquired for customer login', { body: { email: !!email, username: !!username } });
    
    // Check customer table by email or username (Customer name)
    let customer;
    if (email) {
      const customers = await conn.query('SELECT * FROM customer WHERE CustomerEmail = ?', [email]);
      customer = customers[0];
    } else if (username) {
      const customers = await conn.query('SELECT * FROM customer WHERE Customer = ?', [username]);
      customer = customers[0];
    }
    if (customer) {
      const valid = await bcrypt.compare(password, customer.Passwd);
      if (!valid) {
        conn.release();
        console.log('DB connection released (customer login, invalid password)');
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ 
        id: customer.CustomerId, 
        email: customer.CustomerEmail, 
        role: 'customer', 
        userType: 'customer' 
      }, process.env.JWT_SECRET, { expiresIn: '6h' });
      conn.release();
      console.log('DB connection released (customer login, success)');
      return res.json({ 
        token, 
        user: { 
          id: customer.CustomerId, 
          name: customer.Customer, 
          email: customer.CustomerEmail, 
          role: 'customer', 
          userType: 'customer' 
        } 
      });
    }
    conn.release();
    console.log('DB connection released (customer login, not found)');
    return res.status(400).json({ error: 'Invalid credentials' });
  } catch (err) {
    if (conn) {
      conn.release();
      console.log('DB connection released (customer login, error)');
    }
    console.error('Customer login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// User Login Only (Admin, Vendor, Courier)
router.post('/user-login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  let conn;
  try {
    conn = await db.getConnection();
    console.log('DB connection acquired for user login');
    
    // Check user table only
    const [user] = await conn.query('SELECT * FROM user WHERE UserEmail = ?', [email]);
    if (user) {
      const valid = await bcrypt.compare(password, user.Passwd);
      if (!valid) {
        conn.release();
        console.log('DB connection released (user login, invalid password)');
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      // Determine role
      let role = 'user';
      if (user.IsSU === 'Y') role = 'su';
      else if (user.IsAdmin === 'Y') role = 'admin';
      else if (user.IsVendor === 'Y') role = 'vendor';
      else if (user.IsCourier === 'Y') role = 'courier';
      
      const token = jwt.sign({ 
        id: user.UserId, 
        email: user.UserEmail, 
        role, 
        userType: 'user' 
      }, process.env.JWT_SECRET, { expiresIn: '6h' });
      conn.release();
      console.log('DB connection released (user login, success)');
      return res.json({ 
        token, 
        user: { 
          id: user.UserId, 
          name: user.User, 
          email: user.UserEmail, 
          role, 
          userType: 'user' 
        } 
      });
    }
    conn.release();
    console.log('DB connection released (user login, not found)');
    return res.status(400).json({ error: 'Invalid credentials' });
  } catch (err) {
    if (conn) {
      conn.release();
      console.log('DB connection released (user login, error)');
    }
    console.error('User login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// SU Login (from SU table)
router.post('/su-login', async (req, res) => {
  const { username, email, password } = req.body;
  const suName = username || email;
  if (!suName || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const conn = await db.getConnection();
    const [su] = await conn.query('SELECT * FROM SU WHERE SU = ?', [suName]);
    if (!su) {
      conn.release();
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, su.Passwd);
    if (!valid) {
      conn.release();
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ 
      id: su.SUId, 
      username: su.SU, 
      role: 'su', 
      userType: 'su' 
    }, process.env.JWT_SECRET, { expiresIn: '6h' });
    conn.release();
    return res.json({ 
      token, 
      user: { 
        id: su.SUId, 
        username: su.SU, 
        role: 'su', 
        userType: 'su' 
      } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Customer Signup
router.post('/signup', async (req, res) => {
  const { name, gender, mobile, email, password, address, dob, pin } = req.body;
  if (!name || !gender || !mobile || !email || !password || !address || !dob || !pin) return res.status(400).json({ error: 'Missing fields' });
  let conn;
  try {
    conn = await db.getConnection();
    console.log('DB connection acquired for signup');
    const [existing] = await conn.query('SELECT CustomerId FROM Customer WHERE CustomerEmail = ?', [email]);
    if (existing) {
      conn.release();
      console.log('DB connection released (signup, already exists)');
      return res.status(400).json({ error: 'Customer already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    await conn.query(
      `INSERT INTO Customer 
        (Customer, Gender, CustomerMobile, CustomerEmail, CustomerPIN, DoB, Passwd, Address, RecordCreationLogin, LastUpdationLogin) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, gender, mobile, email, pin, dob, hashed, address, name.substring(0, 10), name.substring(0, 10)]
    );
    conn.release();
    console.log('DB connection released (signup, success)');
    res.json({ message: 'Customer created' });
  } catch (err) {
    if (conn) {
      conn.release();
      console.log('DB connection released (signup, error)');
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 