const { sequelize, connectDB } = require('./src/config/database');

const testConnection = async () => {
  console.log('🔍 Testing database connection...');
  console.log('='.repeat(50));
  
  try {
    // Test connection
    await connectDB();
    
    // Test query
    console.log('📊 Running test query...');
    const [results] = await sequelize.query('SELECT 1+1 as result');
    console.log('✅ Query result:', results[0].result === 2 ? '2 ✓' : 'Failed');
    
    // Get database info
    const [dbInfo] = await sequelize.query('SELECT DATABASE() as db');
    console.log(`📁 Connected to database: ${dbInfo[0].db}`);
    
    // Show tables
    const [tables] = await sequelize.query('SHOW TABLES');
    console.log(`📋 Tables found: ${tables.length}`);
    
    console.log('='.repeat(50));
    console.log('✅✅✅ DATABASE CONNECTION SUCCESSFUL! ✅✅✅');
    
  } catch (error) {
    console.error('❌❌❌ DATABASE CONNECTION FAILED! ❌❌❌');
    console.error('Error details:', error.message);
    console.error('Make sure:');
    console.error('1. XAMPP MySQL is running');
    console.error('2. Database "glades_warehouse" exists');
    console.error('3. Username/password is correct');
  }
  
  process.exit(0);
};

testConnection();