import express from 'express';
import { db } from '../index.js';

const router = express.Router();

// Get all localities
router.get('/localities', async (req, res) => {
  try {
    console.log('Fetching localities...');
    const conn = await db.getConnection();
    console.log('Connection acquired');
    
    const result = await conn.query(
      'SELECT LocalityId as id, Locality as name FROM Locality WHERE IsDeleted != ? ORDER BY Locality', ['Y']
    );
    
    // Handle the MariaDB result - it might return the actual rows in different positions
    let localities;
    if (Array.isArray(result) && result.length > 0) {
      // Standard array result
      localities = result;
    } else if (Array.isArray(result[0])) {
      // MariaDB might return [rows, metadata] - take the first element
      localities = result[0];
    } else if (result && typeof result === 'object' && !Array.isArray(result)) {
      // If it's an object that's not an array, it might be a single record
      // But first check if this might be the array-of-arrays issue
      const keys = Object.keys(result);
      if (keys.length > 0 && !isNaN(keys[0])) {
        // Numeric keys suggest it's an array masquerading as an object
        localities = Object.values(result);
      } else {
        // Single record object
        localities = [result];
      }
    } else {
      localities = [];
    }
    
    // Convert BigInt values to numbers if needed
    let processedLocalities = localities.map(loc => {
      return {
        ...loc,
        id: typeof loc.id === 'bigint' ? Number(loc.id) : loc.id
      };
    });
    
    conn.release();
    
    res.json({ localities: processedLocalities });
  } catch (err) {
    console.error('Error fetching localities:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;