import mariadb from 'mariadb';
import dotenv from 'dotenv';
dotenv.config();

const db = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

async function checkSchema() {
  try {
    const conn = await db.getConnection();
    
    // Check Purchase table structure
    const [purchaseColumns] = await conn.query('DESCRIBE Purchase');
    console.log('Purchase table columns:');
    purchaseColumns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type}`);
    });
    
    // Check VendorProductCustomerCourier table structure
    const [vpcColumns] = await conn.query('DESCRIBE VendorProductCustomerCourier');
    console.log('\nVendorProductCustomerCourier table columns:');
    vpcColumns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type}`);
    });
    
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('Error checking schema:', err);
    process.exit(1);
  }
}

checkSchema();