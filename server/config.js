require('dotenv').config(); // charge .env

module.exports = {
  db: {
    host    : process.env.DB_HOST || 'mysql-central',
    port    : Number(process.env.DB_PORT) || 3306,
    user    : process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'spider_stock' 
  },
  jwtSecret: process.env.JWT_SECRET || 'spt@k_secret_key',
  port: process.env.PORT || 3001
};