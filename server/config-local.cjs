require('dotenv').config(); // charge .env

module.exports = {
  db: {
    host    : 'localhost',
    port    : 3306 || 3307,
    user    : 'root',
    password: '', // ou votre mot de passe local
    database: 'spider_stock' 
  },
  jwtSecret: 'spt@k_secret_key',
  port: 3002
};
