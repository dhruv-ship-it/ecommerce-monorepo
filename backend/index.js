import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mariadb from 'mariadb';
import jwt from 'jsonwebtoken';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import cartRouter from './routes/cart.js';
import orderRouter from './routes/order.js';
import suRouter from './routes/su.js';
import adminRouter from './routes/admin.js';
import vendorRouter from './routes/vendor.js';
import courierRouter from './routes/courier.js';
import productRouter from './routes/product.js';
import customerRouter from './routes/customer.js';

dotenv.config();

const app = express();
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://172.16.0.2:3000',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Explicitly handle preflight
app.options('*', cors());
app.use(express.json());

// Serve static files (images) for both frontends
app.use('/static', express.static('static'));

// MariaDB pool
export const db = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

db.getConnection()
  .then(conn => {
    console.log('Connected to database!');
    conn.release();
  })
  .catch(err => {
    console.error('Failed to connect to database:', err);
  });

// Middleware to check for SU token (from SU table)
function suTokenMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.userType !== 'su' || payload.role !== 'su') {
      return res.status(403).json({ error: 'SU access required' });
    }
    req.su = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware to check for user token (Admin, Vendor, Courier)
function userTokenMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.userType !== 'user') {
      return res.status(403).json({ error: 'User access required' });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware to check for customer token
function customerTokenMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.userType !== 'customer' || payload.role !== 'customer') {
      return res.status(403).json({ error: 'Customer access required' });
    }
    req.customer = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware to check for admin role specifically
function adminRoleMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Middleware to check for vendor role specifically
function vendorRoleMiddleware(req, res, next) {
  if (req.user.role !== 'vendor') {
    return res.status(403).json({ error: 'Vendor access required' });
  }
  next();
}

// Middleware to check for courier role specifically
function courierRoleMiddleware(req, res, next) {
  if (req.user.role !== 'courier') {
    return res.status(403).json({ error: 'Courier access required' });
  }
  next();
}

app.use('/api/auth', authRoutes);
app.use('/api/customer', customerTokenMiddleware, customerRouter);
app.use('/api/user', userTokenMiddleware, userRoutes);
app.use('/cart', customerTokenMiddleware, cartRouter);
app.use('/order', customerTokenMiddleware, orderRouter);
app.use('/su', suTokenMiddleware, suRouter);
app.use('/admin', userTokenMiddleware, adminRoleMiddleware, adminRouter);
app.use('/vendor', userTokenMiddleware, vendorRoleMiddleware, vendorRouter);
app.use('/courier', userTokenMiddleware, courierRoleMiddleware, courierRouter);
app.use('/products', productRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
}); 