require('dotenv').config(); // charge .env

module.exports = {
  db: {
    host    : process.env.DB_HOST || '185.183.35.80',
    port    : Number(process.env.DB_PORT) || 3307,
    user    : process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'StrongPass123',
    database: process.env.DB_NAME || 'spider_stock'
  },
  jwtSecret: process.env.JWT_SECRET || 'spt@k_secret_key',
  port: process.env.PORT || 3002
};
