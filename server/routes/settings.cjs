const express = require('express');
const db = require('../database.cjs');
const auth = require('../middleware/auth.cjs');

const router = express.Router();

// GET /api/settings - Récupérer les paramètres de l'application
router.get('/', auth, async (req, res) => {
  try {
    // Pour l'instant, retourner des paramètres par défaut
    // Plus tard, on pourra stocker ces paramètres en base de données
    const settings = {
      company: {
        name: '3S IT',
        address: '',
        phone: '',
        email: ''
      },
      inventory: {
        lowStockThreshold: 10,
        autoReorder: false,
        currency: 'EUR'
      },
      notifications: {
        lowStock: true,
        newMovements: true,
        emailAlerts: false
      },
      system: {
        timezone: 'Europe/Paris',
        dateFormat: 'DD/MM/YYYY',
        language: 'fr'
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Erreur récupération paramètres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/settings - Mettre à jour les paramètres
router.put('/', auth, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin ou manager
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const {
      company,
      inventory,
      notifications,
      system
    } = req.body;

    // Ici, on pourrait sauvegarder les paramètres en base de données
    // Pour l'instant, on retourne juste les paramètres reçus
    const updatedSettings = {
      company: company || {},
      inventory: inventory || {},
      notifications: notifications || {},
      system: system || {}
    };

    res.json({
      message: 'Paramètres mis à jour avec succès',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Erreur mise à jour paramètres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/settings/backup - Créer une sauvegarde des données
router.get('/backup', auth, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Récupérer toutes les données importantes
    const backup = {
      timestamp: new Date().toISOString(),
      components: await db.query('SELECT * FROM components'),
      products: await db.query('SELECT * FROM products'),
      productComponents: await db.query('SELECT * FROM product_components'),
      stockMovements: await db.query('SELECT * FROM stock_movements'),
      suppliers: await db.query('SELECT * FROM suppliers'),
      users: await db.query('SELECT id, name, email, role, created_at FROM users')
    };

    res.json(backup);
  } catch (error) {
    console.error('Erreur création sauvegarde:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/settings/stats - Statistiques système
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = {
      database: {
        components: await db.query('SELECT COUNT(*) as count FROM components').then(r => r[0].count),
        products: await db.query('SELECT COUNT(*) as count FROM products').then(r => r[0].count),
        suppliers: await db.query('SELECT COUNT(*) as count FROM suppliers').then(r => r[0].count),
        users: await db.query('SELECT COUNT(*) as count FROM users').then(r => r[0].count),
        stockMovements: await db.query('SELECT COUNT(*) as count FROM stock_movements').then(r => r[0].count)
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        platform: process.platform
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Erreur récupération statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
