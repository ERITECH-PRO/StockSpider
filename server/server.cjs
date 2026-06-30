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
const procurementRoutes = require('./routes/procurement.cjs');
const assemblyRoutes = require('./routes/assembly.cjs');
const stockRoutes = require('./routes/stock.cjs');
const costsRoutes = require('./routes/costs.cjs');
const supplierRoutes = require('./routes/suppliers.cjs');
const userRoutes = require('./routes/users.cjs');
const settingsRoutes = require('./routes/settings.cjs');
const clientsRoutes = require('./routes/clients.cjs');
const chantiersRoutes = require('./routes/chantiers.cjs');
const bonsSortieRoutes = require('./routes/bonsSortie.cjs');

const app = express();

// Middleware
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://185.183.35.80:5174',
  'https://stock.spiderhome.org',
  process.env.FRONTEND_ORIGIN || ''
].filter(Boolean));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser clients
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed for origin: ' + origin), false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Gérer explicitement les pré-requêtes CORS (Express 5: éviter '*')
app.options(/^.*$/, cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers statiques (images uploadées)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/assembly', assemblyRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/costs', costsRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/chantiers', chantiersRoutes);
app.use('/api/bons-sortie', bonsSortieRoutes);

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