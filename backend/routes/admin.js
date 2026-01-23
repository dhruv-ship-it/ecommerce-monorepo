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

function adminOnlyMiddleware(req, res, next) {
  if (req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Forbidden' });
}

// View all users
router.get('/users', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    const users = await conn.query('SELECT UserId, User, UserEmail, Gender, UserMobile, PIN, Locality, DoB, UserRank, Address, IsSU, IsAdmin, IsVendor, IsCourier, IsVerified, IsActivated, IsBlackListed, IsDead, IsDeleted FROM User');
    conn.release();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific user by ID
router.get('/user/:id', authMiddleware, adminOnlyMiddleware, async (req, res) => {
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
    console.error('Error in /admin/user/:id:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a specific user by ID
router.put('/user/:id', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  const { name, gender, mobile, email, pin, dob, address, isVerified, isActivated, isBlackListed, isDead, locality, userRank, isAdmin, isVendor, isCourier, isSU } = req.body;
  try {
    const conn = await db.getConnection();
    
    // Check if user exists
    const [existing] = await conn.query('SELECT UserId FROM User WHERE UserId = ?', [req.params.id]);
    if (!existing || existing.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user
    await conn.query(
      `UPDATE User SET User = ?, Gender = ?, UserMobile = ?, UserEmail = ?, PIN = ?, DoB = ?, Address = ?, IsVerified = ?, IsActivated = ?, IsBlackListed = ?, IsDead = ?, Locality = ?, UserRank = ?, IsAdmin = ?, IsVendor = ?, IsCourier = ?, IsSU = ? WHERE UserId = ?`,
      [name, gender, mobile, email, pin, dob, address, isVerified, isActivated, isBlackListed, isDead, locality, userRank, isAdmin || 'N', isVendor || 'N', isCourier || 'N', isSU || 'N', req.params.id]
    );
    
    conn.release();
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new user (admin, vendor, courier)
router.post('/user', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  const { name, gender, mobile, email, pin, dob, address, password, role, isVerified = 'N', isActivated = 'N', locality = 0, userRank = 0 } = req.body;
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'N', ?, ?, ?, ?, 'N', 'N', ?, ?)`
      [name, gender, mobile, email, pin, dob, hashed, address, isAdmin, isVendor, isCourier, locality, userRank, isVerified, isActivated, email.substring(0, 10), email.substring(0, 10)]
    );
    conn.release();
    res.json({ message: 'User created' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// View all customers with pagination
router.get('/customers', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const conn = await db.getConnection();
    const [countResult] = await conn.query('SELECT COUNT(*) as count FROM Customer');
    const total = countResult.count || 0;
    const customers = await conn.query(
      'SELECT CustomerId, Customer, CustomerEmail, CustomerMobile, Gender, DoB, Address, CustomerPIN, CustomerRank, Locality, IsVerified, IsActivated, IsBlackListed, IsDead, IsDeleted FROM Customer LIMIT ? OFFSET ?',
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
    console.error('Error in /admin/customers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific customer by ID
router.get('/customer/:id', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  const customerId = req.params.id;
  try {
    const conn = await db.getConnection();
    const [customer] = await conn.query(
      'SELECT CustomerId, Customer, CustomerEmail, CustomerMobile, Gender, CustomerPIN, Locality, DoB, CustomerRank, Passwd, Address, IsVerified, VerificationTimeStamp, IsActivated, ActivationTimeStamp, IsBlackListed, BlackListTimeStamp, IsDead, DeadTimeStamp, IsDeleted, RecordCreationTimeStamp, RecordCreationLogin, LastUpdationTimeStamp, LastUpdationLogin FROM Customer WHERE CustomerId = ?',
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
    console.error('Error in /admin/customer/:id:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a specific customer by ID
router.put('/customer/:id', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  const { name, gender, mobile, email, pin, dob, address, isVerified, isActivated, isBlackListed, isDead, isDeleted, locality } = req.body;
  try {
    const conn = await db.getConnection();
    
    // Check if customer exists
    const [existing] = await conn.query('SELECT CustomerId FROM Customer WHERE CustomerId = ?', [req.params.id]);
    if (!existing || existing.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Update customer
    await conn.query(
      `UPDATE Customer SET Customer = ?, Gender = ?, CustomerMobile = ?, CustomerEmail = ?, CustomerPIN = ?, DoB = ?, Address = ?, IsVerified = ?, IsActivated = ?, IsBlackListed = ?, IsDead = ?, IsDeleted = ?, Locality = ? WHERE CustomerId = ?`,
      [name, gender, mobile, email, pin, dob, address, isVerified, isActivated, isBlackListed, isDead, isDeleted, locality, req.params.id]
    );
    
    conn.release();
    res.json({ message: 'Customer updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// View all orders with pagination
router.get('/orders', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const conn = await db.getConnection();
    
    // Count total records (active + archived)
    const [countResult] = await conn.query(
      'SELECT (SELECT COUNT(*) FROM VendorProductCustomerCourier) + (SELECT COUNT(*) FROM vendorproductcustomercourier_arch) as count'
    );
    const totalOrders = countResult[0]?.count || 0;
    const totalPages = Math.ceil(totalOrders / limit);
    
    // Get orders with related information (active + archived)
    const orders = await conn.query(
      `SELECT 
        vpc.VendorProductCustomerCourierId,
        vpc.PurchaseId,
        vpc.Customer,
        vpc.Product,
        vpc.Vendor,
        vpc.Courier,
        vpc.MRP_SS,
        vpc.Discount_SS,
        vpc.GST_SS,
        vpc.PurchaseQty,
        vpc.OrderCreationTimeStamp,
        vpc.IsReady_for_Pickup_by_Courier,
        vpc.Ready_for_Pickup_by_CourierTimeStamp,
        vpc.TrackingNo,
        vpc.IsPicked_by_Courier,
        vpc.Picked_by_CourierTimeStamp,
        vpc.IsDispatched,
        vpc.DispatchedTimeStamp,
        vpc.IsOut_for_Delivery,
        vpc.Out_for_DeliveryTimeStamp,
        vpc.IsDelivered,
        vpc.DeliveryTimeStamp,
        vpc.IsReturned,
        vpc.ReturnTimeStamp,
        p.Product as ProductName,
        u.User as VendorName,
        cu.User as CourierName,
        c.Customer as CustomerName,
        c.CustomerEmail,
        c.CustomerMobile,
        'Active' as OrderCategory
      FROM VendorProductCustomerCourier vpc
      LEFT JOIN Product p ON vpc.Product = p.ProductId
      LEFT JOIN User u ON vpc.Vendor = u.UserId
      LEFT JOIN User cu ON vpc.Courier = cu.UserId
      LEFT JOIN Customer c ON vpc.Customer = c.CustomerId
      UNION ALL
      SELECT 
        vpc_arch.VendorProductCustomerCourierId,
        vpc_arch.PurchaseId,
        vpc_arch.Customer,
        vpc_arch.Product,
        vpc_arch.Vendor,
        vpc_arch.Courier,
        vpc_arch.MRP_SS,
        vpc_arch.Discount_SS,
        vpc_arch.GST_SS,
        vpc_arch.PurchaseQty,
        vpc_arch.OrderCreationTimeStamp,
        vpc_arch.IsReady_for_Pickup_by_Courier,
        vpc_arch.Ready_for_Pickup_by_CourierTimeStamp,
        vpc_arch.TrackingNo,
        vpc_arch.IsPicked_by_Courier,
        vpc_arch.Picked_by_CourierTimeStamp,
        vpc_arch.IsDispatched,
        vpc_arch.DispatchedTimeStamp,
        vpc_arch.IsOut_for_Delivery,
        vpc_arch.Out_for_DeliveryTimeStamp,
        vpc_arch.IsDelivered,
        vpc_arch.DeliveryTimeStamp,
        vpc_arch.IsReturned,
        vpc_arch.ReturnTimeStamp,
        p.Product as ProductName,
        u.User as VendorName,
        cu.User as CourierName,
        c.Customer as CustomerName,
        c.CustomerEmail,
        c.CustomerMobile,
        'Archived' as OrderCategory
      FROM vendorproductcustomercourier_arch vpc_arch
      LEFT JOIN Product p ON vpc_arch.Product = p.ProductId
      LEFT JOIN User u ON vpc_arch.Vendor = u.UserId
      LEFT JOIN User cu ON vpc_arch.Courier = cu.UserId
      LEFT JOIN Customer c ON vpc_arch.Customer = c.CustomerId
      ORDER BY OrderCreationTimeStamp DESC
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    conn.release();
    
    res.json({ 
      orders,
      totalPages,
      totalOrders,
      currentPage: page,
      limit
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
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

// Get analytics data
router.get('/analytics', authMiddleware, adminOnlyMiddleware, async (req, res) => {
  try {
    const conn = await db.getConnection();
    
    // Get daily order counts and revenue for the last 30 days (active + archived)
    const dailyOrdersResult = await conn.query(
      `SELECT 
        DATE(OrderCreationTimeStamp) as date,
        COUNT(*) as orderCount,
        SUM(MRP_SS * PurchaseQty) as revenue
      FROM (
        SELECT OrderCreationTimeStamp, MRP_SS, PurchaseQty FROM VendorProductCustomerCourier 
        WHERE OrderCreationTimeStamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        UNION ALL
        SELECT OrderCreationTimeStamp, MRP_SS, PurchaseQty FROM vendorproductcustomercourier_arch 
        WHERE OrderCreationTimeStamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ) AS combined_orders
      GROUP BY DATE(OrderCreationTimeStamp)
      ORDER BY DATE(OrderCreationTimeStamp)`
    );
    let dailyOrders = Array.isArray(dailyOrdersResult) ? dailyOrdersResult[0] : dailyOrdersResult;
    // Convert BigInt values to numbers
    dailyOrders = Array.isArray(dailyOrders) ? dailyOrders.map(row => ({
      ...row,
      orderCount: Number(row.orderCount),
      revenue: row.revenue ? Number(row.revenue) : 0
    })) : [];
    
    // Get top selling products (active + archived)
    const topProductsResult = await conn.query(
      `SELECT 
        p.Product as productName,
        COUNT(*) as orderCount
      FROM (
        SELECT Product FROM VendorProductCustomerCourier
        UNION ALL
        SELECT Product FROM vendorproductcustomercourier_arch
      ) AS combined_products
      JOIN Product p ON combined_products.Product = p.ProductId
      GROUP BY combined_products.Product
      ORDER BY COUNT(*) DESC
      LIMIT 5`
    );
    let topProducts = Array.isArray(topProductsResult) ? topProductsResult[0] : topProductsResult;
    // Convert BigInt values to numbers
    topProducts = Array.isArray(topProducts) ? topProducts.map(row => ({
      ...row,
      orderCount: Number(row.orderCount)
    })) : [];
    
    // Get order status distribution (active + archived)
    const orderStatusResult = await conn.query(
      `SELECT 
        CASE 
          WHEN IsDelivered = 'Y' THEN 'Delivered'
          WHEN IsReturned = 'Y' THEN 'Returned'
          WHEN IsOut_for_Delivery = 'Y' THEN 'Out for Delivery'
          WHEN IsDispatched = 'Y' THEN 'Dispatched'
          WHEN IsReady_for_Pickup_by_Courier = 'Y' THEN 'Ready for Pickup'
          WHEN IsPicked_by_Courier = 'Y' THEN 'Courier Picked Up'
          ELSE 'Order Placed'
        END as status,
        COUNT(*) as count
      FROM (
        SELECT IsDelivered, IsReturned, IsOut_for_Delivery, IsDispatched, IsReady_for_Pickup_by_Courier, IsPicked_by_Courier FROM VendorProductCustomerCourier
        UNION ALL
        SELECT IsDelivered, IsReturned, IsOut_for_Delivery, IsDispatched, IsReady_for_Pickup_by_Courier, IsPicked_by_Courier FROM vendorproductcustomercourier_arch
      ) AS combined_status
      GROUP BY status
      ORDER BY count DESC`
    );
    let orderStatus = Array.isArray(orderStatusResult) ? orderStatusResult[0] : orderStatusResult;
    // Convert BigInt values to numbers
    orderStatus = Array.isArray(orderStatus) ? orderStatus.map(row => ({
      ...row,
      count: Number(row.count)
    })) : [];
    
    conn.release();
    
    res.json({ 
      dailyOrders,
      topProducts,
      orderStatus
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 