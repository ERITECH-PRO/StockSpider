const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./database');

// Routes
const authRoutes = require('./routes/auth');
const componentRoutes = require('./routes/components');
const productRoutes = require('./routes/products');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'StockSpider API is running',
    timestamp: new Date().toISOString()
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrage du serveur
const startServer = async () => {
  try {
    // Test de connexion à la base de données
    const isConnected = await db.testConnection();
    if (!isConnected) {
      console.error('❌ Impossible de se connecter à la base de données');
      process.exit(1);
    }

    // Initialisation de la base de données
    await db.initDatabase();

    // Démarrage du serveur
    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`🚀 Serveur StockSpider démarré sur le port ${PORT}`);
      console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
      console.log(`🔗 Frontend sur http://localhost:5173`);
    });
  } catch (error) {
    console.error('❌ Erreur au démarrage du serveur:', error);
    process.exit(1);
  }
};

startServer();