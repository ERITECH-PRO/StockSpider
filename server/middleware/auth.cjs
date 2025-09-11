const jwt = require('jsonwebtoken');
const config = require('../config.cjs');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token d\'authentification requis' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Erreur authentification:', error.message);
    res.status(401).json({ error: 'Token invalide' });
  }
};

module.exports = auth;