import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mariadb from 'mariadb';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import cartRouter from './routes/cart.js';
import orderRouter from './routes/order.js';
import suRouter from './routes/su.js';
import adminRouter from './routes/admin.js';
import vendorRouter from './routes/vendor.js';
import courierRouter from './routes/courier.js';
import productRouter from './routes/product.js';
import modelRouter from './routes/model.js';
import customerRouter from './routes/customer.js';
import archiveRouter from './routes/archive.js';
import adminTablesRouter from './routes/admin-tables.js';
import productImagesRouter from './routes/product-images.js';  // Add this line
import generalRouter from './routes/general.js';  // Add general routes

// Get the current filename and directory for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create directory structure based on product ID if provided
    const productId = req.body.productId || req.params.productId || req.query.productId;
    if (productId) {
      const uploadDir = path.join(__dirname, '..', 'static', 'images', 'products', `product-${productId}`);
      // Create directory if it doesn't exist
      import('fs').then(fs => {
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
      }).catch(err => {
        console.error('Error creating upload directory:', err);
        cb(null, path.join(__dirname, '..', 'static', 'images', 'products', 'temp'));
      });
    } else {
      cb(null, path.join(__dirname, '..', 'static', 'images', 'products', 'temp'));
    }
  },
  filename: (req, file, cb) => {
    // Get image type from request
    const imageType = req.body.imageType || req.query.imageType || 'gallery';
    const productId = req.body.productId || req.params.productId || req.query.productId;
    
    // Generate filename based on type and product
    const ext = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    
    if (imageType === 'thumbnail') {
      cb(null, `thumb_${productId}_${timestamp}${ext}`);
    } else if (imageType === 'main') {
      cb(null, `main_${productId}_${timestamp}${ext}`);
    } else {
      // For gallery images, add an index if provided
      const galleryIndex = req.body.galleryIndex || req.query.galleryIndex || '1';
      cb(null, `gallery_${productId}_${galleryIndex}_${timestamp}${ext}`);
    }
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

app.use(express.json());

// Serve static files (images) for both frontends
app.use('/static', express.static(path.join(__dirname, '..', 'static')));

// Add middleware to handle image uploads
app.use('/api/upload', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ error: 'Upload error: ' + err.message });
    } else if (err) {
      return res.status(400).json({ error: 'Upload error: ' + err.message });
    }
    next();
  });
}, (req, res) => {
  // Handle the uploaded file
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Return the file path
  const filePath = req.file.path.substring(req.file.path.indexOf('/static'));
  res.json({ 
    message: 'File uploaded successfully', 
    filePath: filePath,
    originalName: req.file.originalname,
    size: req.file.size
  });
});

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
app.use('/models', modelRouter);
app.use('/admin-tables', userTokenMiddleware, adminRoleMiddleware, adminTablesRouter);
app.use('/archive', suTokenMiddleware, archiveRouter);
app.use('/product-images', userTokenMiddleware, adminRoleMiddleware, productImagesRouter); // Add this line
app.use('/api', generalRouter); // Add general API routes

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});