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

// Get all items in the customer's cart with vendor details
router.get('/', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  try {
    const conn = await db.getConnection();
    const items = await conn.query(`
      SELECT 
        sc.ShoppingCartId,
        sc.ProductId,
        sc.VendorProductId,
        sc.Quantity,
        p.Product AS ProductName,
        vp.MRP_SS,
        vp.Discount,
        vp.GST_SS,
        vp.StockQty,
        v.User AS VendorName,
        c.User AS CourierName,
        col.Color AS ColorName,
        s.Size AS SizeName,
        m.Model AS ModelName
      FROM ShoppingCart sc
      LEFT JOIN Product p ON sc.ProductId = p.ProductId
      LEFT JOIN VendorProduct vp ON sc.VendorProductId = vp.VendorProductId
      LEFT JOIN user v ON vp.Vendor = v.UserId AND v.IsVendor = 'Y'
      LEFT JOIN user c ON vp.Courier = c.UserId AND c.IsCourier = 'Y'
      LEFT JOIN Color col ON p.Color = col.ColorId
      LEFT JOIN Size s ON p.Size = s.SizeId
      LEFT JOIN Model m ON p.Model = m.ModelId
      WHERE sc.CustomerId = ?
      ORDER BY sc.RecordCreationTimeStamp DESC
    `, [req.user.id]);
    conn.release();
    res.json({ cart: items || [] });
  } catch (err) {
    console.error('Cart fetch error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Add item to cart (if exists, update quantity)
router.post('/add', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  const { vendorProductId, productId, quantity } = req.body;
  if (!vendorProductId || !productId || !quantity) {
    return res.status(400).json({ error: 'Missing required fields: vendorProductId, productId, quantity' });
  }
  
  try {
    const conn = await db.getConnection();
    
    // Verify vendor product exists and has stock
    const vendorProduct = await conn.query(
      'SELECT StockQty FROM VendorProduct WHERE VendorProductId = ? AND Product = ? AND (IsDeleted != "Y" OR IsDeleted IS NULL) AND (IsNotAvailable != "Y" OR IsNotAvailable IS NULL)',
      [vendorProductId, productId]
    );
    
    if (!vendorProduct || vendorProduct.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'Vendor product not found or unavailable' });
    }
    
    if (vendorProduct[0].StockQty < quantity) {
      conn.release();
      return res.status(400).json({ error: 'Insufficient stock available' });
    }
    
    // Check if item already in cart (same vendor product)
    const existing = await conn.query(
      'SELECT ShoppingCartId, Quantity FROM ShoppingCart WHERE CustomerId = ? AND VendorProductId = ?',
      [req.user.id, vendorProductId]
    );
    
    if (existing && existing.length > 0) {
      // Update quantity
      const newQuantity = Number(existing[0].Quantity) + Number(quantity);
      if (newQuantity > vendorProduct[0].StockQty) {
        conn.release();
        return res.status(400).json({ error: `Cannot add ${quantity} more. Maximum available: ${vendorProduct[0].StockQty - existing[0].Quantity}` });
      }
      
      await conn.query(
        'UPDATE ShoppingCart SET Quantity = ? WHERE ShoppingCartId = ?',
        [newQuantity, existing[0].ShoppingCartId]
      );
    } else {
      // Insert new item
      await conn.query(
        'INSERT INTO ShoppingCart (CustomerId, ProductId, VendorProductId, Quantity, RecordCreationLogin) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, productId, vendorProductId, quantity, req.user.username || 'customer']
      );
    }
    
    conn.release();
    res.json({ message: 'Cart updated successfully' });
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Update quantity of an item in cart
router.put('/update', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  const { vendorProductId, quantity } = req.body;
  if (!vendorProductId || !quantity) return res.status(400).json({ error: 'Missing vendorProductId or quantity' });
  
  try {
    const conn = await db.getConnection();
    
    // Verify stock availability
    const vendorProduct = await conn.query(
      'SELECT StockQty FROM VendorProduct WHERE VendorProductId = ?',
      [vendorProductId]
    );
    
    if (!vendorProduct || vendorProduct.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'Vendor product not found' });
    }
    
    if (vendorProduct[0].StockQty < quantity) {
      conn.release();
      return res.status(400).json({ error: 'Insufficient stock available' });
    }
    
    await conn.query(
      'UPDATE ShoppingCart SET Quantity = ? WHERE CustomerId = ? AND VendorProductId = ?',
      [quantity, req.user.id, vendorProductId]
    );
    conn.release();
    res.json({ message: 'Cart item updated' });
  } catch (err) {
    console.error('Update cart error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Remove item from cart
router.delete('/remove', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  const { vendorProductId } = req.body;
  if (!vendorProductId) return res.status(400).json({ error: 'Missing vendorProductId' });
  try {
    const conn = await db.getConnection();
    await conn.query(
      'DELETE FROM ShoppingCart WHERE CustomerId = ? AND VendorProductId = ?',
      [req.user.id, vendorProductId]
    );
    conn.release();
    res.json({ message: 'Item removed from cart' });
  } catch (err) {
    console.error('Remove from cart error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get cart item count for the logged-in customer
router.get('/count', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  try {
    const conn = await db.getConnection();
    const [result] = await conn.query('SELECT COUNT(*) as count FROM ShoppingCart WHERE CustomerId = ?', [req.user.id]);
    conn.release();
    res.json({ count: result ? result.count : 0 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 