import express from 'express';
import { db } from '../index.js';

const router = express.Router();

// Get all localities
router.get('/localities', async (req, res) => {
  try {
    console.log('Fetching localities...');
    const conn = await db.getConnection();
    console.log('Connection acquired');
    
    const [localities] = await conn.query(
      'SELECT LocalityId as id, Locality as name FROM Locality WHERE IsDeleted != ? ORDER BY Locality', ['Y']
    );
    
    console.log('Query executed, results:', localities);
    conn.release();
    
    // Convert BigInt values to numbers if needed
    const processedLocalities = localities && Array.isArray(localities) ? localities.map(loc => ({
      ...loc,
      id: typeof loc.id === 'bigint' ? Number(loc.id) : loc.id
    })) : [];
    
    console.log('Sending response with', processedLocalities.length, 'localities');
    res.json({ localities: processedLocalities });
  } catch (err) {
    console.error('Error fetching localities:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;