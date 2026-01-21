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
  let conn;
  try {
    conn = await db.getConnection();
    
    console.log('=== PRODUCT TABLE STRUCTURE ===');
    const productCols = await conn.query('DESCRIBE product');
    productCols.forEach(col => {
      console.log(`${col.Field}: ${col.Type}, ${col.Null}, ${col.Key}, ${col.Extra}`);
    });
    
    console.log('\n=== PRODUCTCATEGORY TABLE STRUCTURE ===');
    const categoryCols = await conn.query('DESCRIBE productcategory');
    categoryCols.forEach(col => {
      console.log(`${col.Field}: ${col.Type}, ${col.Null}, ${col.Key}, ${col.Extra}`);
    });

    console.log('\n=== SAMPLE PRODUCT DATA ===');
    const sampleProducts = await conn.query('SELECT * FROM product LIMIT 3');
    console.log(sampleProducts);

    console.log('\n=== SAMPLE PRODUCTCATEGORY DATA ===');
    const sampleCategories = await conn.query('SELECT * FROM productcategory LIMIT 3');
    console.log(sampleCategories);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

checkSchema();