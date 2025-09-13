const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config.cjs');
const db = require('./database.cjs');

// Routes
const authRoutes = require('./routes/auth.cjs');
const componentRoutes = require('./routes/components.cjs');
const productRoutes = require('./routes/products.cjs');
const dashboardRoutes = require('./routes/dashboard.cjs');
const assemblyRoutes = require('./routes/assembly.cjs');
const stockRoutes = require('./routes/stock.cjs');
const costsRoutes = require('./routes/costs.cjs');
const supplierRoutes = require('./routes/suppliers.cjs');
const userRoutes = require('./routes/users.cjs');
const settingsRoutes = require('./routes/settings.cjs');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/assembly', assemblyRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/costs', costsRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);

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

// Route 404 (Express 5: utiliser un middleware sans chemin)
app.use((req, res) => {
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
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur StockSpider démarré sur le port ${PORT}`);
      console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
      console.log(`🔗 Frontend sur http://localhost:5173`);
      console.log(`🔍 Health check: http://localhost:${PORT}/health`);
    });
    
    server.on('error', (err) => {
      console.error('❌ Erreur serveur:', err);
    });
  } catch (error) {
    console.error('❌ Erreur au démarrage du serveur:', error);
    process.exit(1);
  }
};

startServer();