const { Sequelize } = require('sequelize');
const {
  DB_DATABASE,
  DB_USERNAME,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT
} = require('./env');

console.log('📊 Database Config:');
console.log(`   Host: ${DB_HOST}`);
console.log(`   Port: ${DB_PORT}`);
console.log(`   Database: ${DB_DATABASE}`);
console.log(`   User: ${DB_USERNAME}`);

const sequelize = new Sequelize(DB_DATABASE, DB_USERNAME, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅✅✅ MariaDB Connected successfully! ✅✅✅');
    
    // Sync all models
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced');
    
    return sequelize;
  } catch (error) {
    console.error('❌❌❌ Database connection failed: ❌❌❌');
    console.error('Error:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };