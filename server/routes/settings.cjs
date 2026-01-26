const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database.cjs');
const auth = require('../middleware/auth.cjs');

const router = express.Router();

const requireManagerOrAdmin = (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    res.status(403).json({ error: 'Accès refusé' });
    return false;
  }
  return true;
};

const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

// Configuration multer pour logo société
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/company');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'company-logo-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont autorisées'), false);
  },
});

// GET /api/settings - Récupérer les paramètres de l'application
router.get('/', auth, async (req, res) => {
  try {
    // Charger depuis la base (fallback valeurs par défaut)
    const [row] = await db.query('SELECT * FROM app_settings WHERE id = 1');
    const settings = {
      company: {
        name: row?.company_name ?? '3S IT',
        address: row?.company_address ?? '',
        phone: row?.company_phone ?? '',
        email: row?.company_email ?? '',
        matriculeFiscal: row?.company_matricule_fiscal ?? '',
        logoUrl: row?.company_logo_url ?? ''
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
    if (!requireManagerOrAdmin(req, res)) return;

    const {
      company,
      inventory,
      notifications,
      system
    } = req.body;

    // Sauvegarder au moins la section company en DB
    if (company) {
      const name = company.name ?? company.companyName ?? undefined;
      const address = company.address ?? undefined;
      const phone = company.phone ?? undefined;
      const email = company.email ?? undefined;
      const matriculeFiscal = company.matriculeFiscal ?? undefined;

      const fields = [];
      const values = [];
      if (name !== undefined) {
        fields.push('company_name = ?');
        values.push(name);
      }
      if (address !== undefined) {
        fields.push('company_address = ?');
        values.push(address);
      }
      if (phone !== undefined) {
        fields.push('company_phone = ?');
        values.push(phone);
      }
      if (email !== undefined) {
        fields.push('company_email = ?');
        values.push(email);
      }
      if (matriculeFiscal !== undefined) {
        fields.push('company_matricule_fiscal = ?');
        values.push(matriculeFiscal);
      }

      if (fields.length > 0) {
        await db.query(`UPDATE app_settings SET ${fields.join(', ')} WHERE id = 1`, values);
      }
    }

    // Retourner settings complets
    const [row] = await db.query('SELECT * FROM app_settings WHERE id = 1');
    const updatedSettings = {
      company: {
        name: row?.company_name ?? '3S IT',
        address: row?.company_address ?? '',
        phone: row?.company_phone ?? '',
        email: row?.company_email ?? '',
        matriculeFiscal: row?.company_matricule_fiscal ?? '',
        logoUrl: row?.company_logo_url ?? '',
      },
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

// POST /api/settings/upload-logo - Upload logo société
router.post('/upload-logo', auth, upload.single('image'), async (req, res) => {
  try {
    if (!requireManagerOrAdmin(req, res)) return;

    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image fournie' });
    }

    // Supprimer l'ancien logo si existant
    const [row] = await db.query('SELECT company_logo_url FROM app_settings WHERE id = 1');
    const existingUrl = row?.company_logo_url;
    if (existingUrl) {
      const oldPath = path.join(__dirname, '../uploads/company', path.basename(existingUrl));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const logoUrl = `${getBaseUrl(req)}/uploads/company/${req.file.filename}`;
    await db.query('UPDATE app_settings SET company_logo_url = ? WHERE id = 1', [logoUrl]);

    res.json({ success: true, logoUrl });
  } catch (error) {
    console.error('Erreur upload logo:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Erreur lors de l\'upload du logo' });
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
