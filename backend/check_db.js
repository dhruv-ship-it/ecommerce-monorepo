import dotenv from 'dotenv';
import mariadb from 'mariadb';

dotenv.config();

// Simple direct connection without pool for testing
const connectionConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

(async () => {
  let conn;
  try {
    conn = await mariadb.createConnection(connectionConfig);
    console.log('Connected to database');
    
    // Check vendor products with courier info for vendor ID 34
    console.log('\n=== Checking Vendor Products with Courier Info ===');
    const vendorProducts = await conn.query(`
      SELECT 
        p.ProductId,
        p.Product,
        vp.VendorProductId, 
        vp.Courier as DefaultCourier,
        COALESCE(u.User, 'Not Assigned') as CourierName, 
        u.UserMobile as CourierMobile
      FROM Product p 
      JOIN VendorProduct vp ON p.ProductId = vp.Product 
      LEFT JOIN User u ON vp.Courier = u.UserId AND u.IsCourier = 'Y' AND u.IsActivated = 'Y'
      WHERE vp.Vendor = ? AND vp.IsDeleted != 'Y'
    `, [34]);
    
    console.log('Vendor products result:', vendorProducts);
    console.log('Vendor products type:', typeof vendorProducts);
    console.log('Vendor products is array:', Array.isArray(vendorProducts));
    
    // Check if it's an array of arrays format
    if (Array.isArray(vendorProducts) && vendorProducts.length > 0) {
      console.log('First element type:', typeof vendorProducts[0]);
      console.log('First element is array:', Array.isArray(vendorProducts[0]));
      if (Array.isArray(vendorProducts[0])) {
        console.log('Actual data array length:', vendorProducts[0].length);
        console.log('First product:', vendorProducts[0][0]);
      } else {
        console.log('Single result:', vendorProducts[0]);
      }
    }
    
    // Check couriers
    console.log('\n=== Checking Couriers ===');
    const couriers = await conn.query(
      'SELECT UserId, User, UserMobile, UserEmail FROM User WHERE IsCourier = "Y" AND IsActivated = "Y" AND IsBlackListed != "Y"'
    );
    
    console.log('Couriers result:', couriers);
    console.log('Couriers type:', typeof couriers);
    console.log('Couriers is array:', Array.isArray(couriers));
    
    // Check if it's an array of arrays format
    if (Array.isArray(couriers) && couriers.length > 0) {
      console.log('First element type:', typeof couriers[0]);
      console.log('First element is array:', Array.isArray(couriers[0]));
      if (Array.isArray(couriers[0])) {
        console.log('Actual couriers array length:', couriers[0].length);
        console.log('First courier:', couriers[0][0]);
      } else {
        console.log('Single courier:', couriers[0]);
      }
    }
    
    // Check a specific vendor product to see what courier ID is stored
    console.log('\n=== Checking Specific Vendor Product ===');
    const specificVendorProduct = await conn.query(
      'SELECT VendorProductId, Product, Vendor, Courier FROM VendorProduct WHERE Vendor = ? AND IsDeleted != "Y" LIMIT 1',
      [34]
    );
    
    console.log('Specific vendor product:', specificVendorProduct);
    
    // Check if that courier ID exists in User table
    if (Array.isArray(specificVendorProduct) && specificVendorProduct.length > 0) {
      const vendorProductData = Array.isArray(specificVendorProduct[0]) ? specificVendorProduct[0][0] : specificVendorProduct[0];
      if (vendorProductData && vendorProductData.Courier) {
        console.log('\n=== Checking Courier ID', vendorProductData.Courier, '==='); 
        const courierCheck = await conn.query(
          'SELECT UserId, User, UserMobile, UserEmail, IsCourier, IsActivated, IsBlackListed FROM User WHERE UserId = ?',
          [vendorProductData.Courier]
        );
        console.log('Courier check result:', courierCheck);
      }
    }
    
    await conn.end();
  } catch (err) {
    console.error('Error:', err);
    if (conn) {
      await conn.end();
    }
  }
})();