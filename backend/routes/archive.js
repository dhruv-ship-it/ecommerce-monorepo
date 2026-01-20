import express from 'express';
import { db } from '../index.js';

const router = express.Router();

// Function to archive old orders (delivered orders older than 7 days)
async function archiveOldOrders() {
  let conn;
  try {
    conn = await db.getConnection();
    
    // Find delivered orders older than 7 days
    const oldOrdersResult = await conn.query(`
      SELECT vpc.PurchaseId 
      FROM VendorProductCustomerCourier vpc
      JOIN Purchase p ON vpc.PurchaseId = p.PuchaseId
      WHERE vpc.IsDelivered = 'Y' 
      AND vpc.DeliveryTimeStamp < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    
    let oldOrders = [];
    if (Array.isArray(oldOrdersResult)) {
      if (Array.isArray(oldOrdersResult[0])) {
        oldOrders = oldOrdersResult[0];
      } else {
        oldOrders = oldOrdersResult;
      }
    } else if (oldOrdersResult) {
      oldOrders = [oldOrdersResult];
    }
    
    if (oldOrders.length === 0) {
      console.log('No orders to archive');
      return { archived: 0 };
    }
    
    console.log(`Found ${oldOrders.length} orders to archive`);
    
    let archivedCount = 0;
    for (const order of oldOrders) {
      const purchaseId = order.PurchaseId;
      
      // Start transaction
      await conn.query('START TRANSACTION');
      
      try {
        // Copy to archive tables
        await conn.query(`
          INSERT INTO purchase_arch 
          SELECT * FROM Purchase 
          WHERE PuchaseId = ?
        `, [purchaseId]);
        
        await conn.query(`
          INSERT INTO vendorproductcustomercourier_arch 
          SELECT * FROM VendorProductCustomerCourier 
          WHERE PurchaseId = ?
        `, [purchaseId]);
        
        // Delete from original tables
        await conn.query('DELETE FROM Purchase WHERE PuchaseId = ?', [purchaseId]);
        await conn.query('DELETE FROM VendorProductCustomerCourier WHERE PurchaseId = ?', [purchaseId]);
        
        // Commit transaction
        await conn.query('COMMIT');
        archivedCount++;
        
        console.log(`Archived order ${purchaseId}`);
      } catch (err) {
        // Rollback on error
        await conn.query('ROLLBACK');
        console.error(`Failed to archive order ${purchaseId}:`, err);
      }
    }
    
    console.log(`Successfully archived ${archivedCount} orders`);
    return { archived: archivedCount };
    
  } catch (err) {
    console.error('Archive error:', err);
    if (conn) {
      try {
        await conn.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr);
      }
    }
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

// Manual trigger endpoint for archiving
router.post('/trigger-archive', async (req, res) => {
  try {
    const result = await archiveOldOrders();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Archive trigger error:', err);
    res.status(500).json({ error: 'Archive failed', details: err.message });
  }
});

// Get archive statistics
router.get('/stats', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    
    // Count active orders
    const [activeCount] = await conn.query('SELECT COUNT(*) as count FROM VendorProductCustomerCourier');
    const activeOrders = activeCount[0].count;
    
    // Count archived orders
    const [archivedCount] = await conn.query('SELECT COUNT(*) as count FROM vendorproductcustomercourier_arch');
    const archivedOrders = archivedCount[0].count;
    
    // Count orders ready for archiving (delivered more than 7 days ago)
    const [readyForArchival] = await conn.query(
      `SELECT COUNT(*) as count 
       FROM VendorProductCustomerCourier vpc
       JOIN Purchase p ON vpc.PurchaseId = p.PuchaseId
       WHERE vpc.IsDelivered = 'Y' 
       AND vpc.DeliveryTimeStamp < DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );
    const ordersReadyForArchival = readyForArchival[0].count;
    
    conn.release();
    
    res.json({
      activeOrders,
      archivedOrders,
      ordersReadyForArchival,
      lastArchiveCheck: new Date().toISOString()
    });
  } catch (err) {
    console.error('Archive stats error:', err);
    if (conn) conn.release();
    res.status(500).json({ error: 'Stats failed', details: err.message });
  }
});

// Schedule automatic archiving every day
setInterval(async () => {
  try {
    console.log('Running scheduled archive check...');
    await archiveOldOrders();
  } catch (err) {
    console.error('Scheduled archive error:', err);
  }
}, 24 * 60 * 60 * 1000); // Every 24 hours

export default router;