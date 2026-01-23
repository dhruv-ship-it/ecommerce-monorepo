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
    const [customer] = await conn.query('SELECT CustomerId, Customer, CustomerEmail, CustomerMobile, Gender, DoB, Address, CustomerPIN, Locality, CustomerRank, IsVerified, IsActivated, IsBlackListed, IsDead, IsDeleted, RecordCreationTimeStamp, LastUpdationTimeStamp FROM customer WHERE CustomerId = ?', [req.user.id]);
    conn.release();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get customer info for checkout
router.get('/info', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  try {
    const conn = await db.getConnection();
    const [customer] = await conn.query('SELECT CustomerId, Customer, CustomerEmail, CustomerMobile, Address, Locality FROM customer WHERE CustomerId = ?', [req.user.id]);
    conn.release();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get address hierarchy by locality ID
router.get('/address-hierarchy/:localityId', async (req, res) => {
  try {
    const { localityId } = req.params;
    
    // Handle case where localityId is 0 or invalid
    if (!localityId || localityId === '0' || isNaN(localityId)) {
      return res.json({
        locality: "",
        district: "",
        state: "",
        country: "",
        continent: ""
      });
    }
    
    const conn = await db.getConnection();
    
    // Get locality info
    const [localityRow] = await conn.query('SELECT Locality, District FROM locality WHERE LocalityId = ? AND IsDeleted != "Y"', [localityId]);
    
    // If locality doesn't exist, return empty hierarchy
    if (!localityRow) {
      conn.release();
      return res.json({
        locality: "",
        district: "",
        state: "",
        country: "",
        continent: ""
      });
    }
    
    const locality = localityRow.Locality || "";
    const districtId = localityRow.District;
    
    // Get district info
    let district = "";
    let stateId = 0;
    if (districtId && districtId !== 0 && !isNaN(districtId)) {
      const [districtRow] = await conn.query('SELECT District, State FROM district WHERE DistrictId = ? AND IsDeleted != "Y"', [districtId]);
      if (districtRow && districtRow.District) {
        district = districtRow.District || "";
        stateId = districtRow.State;
      }
    }
    
    // Get state info
    let state = "";
    let countryId = 0;
    if (stateId && stateId !== 0 && !isNaN(stateId)) {
      const [stateRow] = await conn.query('SELECT State, Country FROM state WHERE StateId = ? AND IsDeleted != "Y"', [stateId]);
      if (stateRow && stateRow.State) {
        state = stateRow.State || "";
        countryId = stateRow.Country;
      }
    }
    
    // Get country info
    let country = "";
    let continentId = 0;
    if (countryId && countryId !== 0 && !isNaN(countryId)) {
      const [countryRow] = await conn.query('SELECT Country, Continent FROM country WHERE CountryId = ? AND IsDeleted != "Y"', [countryId]);
      if (countryRow && countryRow.Country) {
        country = countryRow.Country || "";
        continentId = countryRow.Continent;
      }
    }
    
    // Get continent info
    let continent = "";
    if (continentId && continentId !== 0 && !isNaN(continentId)) {
      const [continentRow] = await conn.query('SELECT Continent FROM continent WHERE ContinentId = ? AND IsDeleted != "Y"', [continentId]);
      if (continentRow && continentRow.Continent) {
        continent = continentRow.Continent || "";
      }
    }
    
    conn.release();
    
    res.json({
      locality,
      district,
      state,
      country,
      continent
    });
  } catch (err) {
    console.error('Address hierarchy error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update customer profile
router.put('/profile', authMiddleware, async (req, res) => {
  if (req.user.userType !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  const { name, email, mobile, gender, dob, address, pin, locality, rank } = req.body;
  if (!name && !email && !mobile && !gender && !dob && !address && !pin && !locality && !rank) return res.status(400).json({ error: 'No fields to update' });
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
    if (mobile) {
      // Check if mobile is taken by another customer
      const [existing] = await conn.query('SELECT CustomerId FROM customer WHERE CustomerMobile = ? AND CustomerId != ?', [mobile, req.user.id]);
      if (existing) {
        conn.release();
        return res.status(400).json({ error: 'Mobile already in use' });
      }
    }
    await conn.query(
      'UPDATE customer SET Customer = COALESCE(?, Customer), CustomerEmail = COALESCE(?, CustomerEmail), CustomerMobile = COALESCE(?, CustomerMobile), Gender = COALESCE(?, Gender), DoB = COALESCE(?, DoB), Address = COALESCE(?, Address), CustomerPIN = COALESCE(?, CustomerPIN), Locality = COALESCE(?, Locality), CustomerRank = COALESCE(?, CustomerRank) WHERE CustomerId = ?',
      [name, email, mobile, gender, dob, address, pin, locality, rank, req.user.id]
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