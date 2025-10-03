const express = require('express');
const { randomUUID } = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database.cjs');
const auth = require('../middleware/auth.cjs');

const router = express.Router();

// Configuration multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/components');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'component-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'), false);
    }
  }
});

// GET /api/components - Récupérer tous les composants
router.get('/', auth, async (req, res) => {
  try {
    const components = await db.query(`
      SELECT 
        id,
        designation,
        name,
        product_number as productNumber,
        footprint,
        quantity,
        unit_price as unitPrice,
        supplier,
        category,
        min_stock as minStock,
        image_url as imageUrl,
        created_at as createdAt,
        updated_at as updatedAt
      FROM components 
      ORDER BY name
    `);
    
    // console.log(`📦 Récupération composants: ${components.length} composants trouvés`);
    res.json(components);
  } catch (error) {
    console.error('Erreur récupération composants:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/components - Créer un nouveau composant
router.post('/', auth, async (req, res) => {
  try {
    const {
      designation,
      name,
      productNumber,
      footprint,
      quantity = 0,
      unitPrice = 0,
      supplier = '',
      category = 'autre',
      minStock = 0
    } = req.body;

    // console.log('🔧 Création composant:', { designation, name, productNumber, footprint });

    if (!designation || !name || !productNumber || !footprint) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    // Vérifier l'unicité du numéro de produit
    const existing = await db.query('SELECT id FROM components WHERE product_number = ?', [productNumber]);
    if (existing.length > 0) {
      // console.log('⚠️ Composant existant trouvé:', productNumber);
      return res.status(409).json({ error: 'Ce numéro de produit existe déjà' });
    }

    // Générer un ID court pour le composant
    const existingComponents = await db.query('SELECT id FROM components WHERE id LIKE "CP%"');
    let maxNumber = 0;
    existingComponents.forEach(comp => {
      const number = parseInt(comp.id.substring(2));
      if (!isNaN(number) && number > maxNumber) {
        maxNumber = number;
      }
    });
    const componentId = `CP${maxNumber + 1}`;
    await db.query(`
      INSERT INTO components 
      (id, designation, name, product_number, footprint, quantity, unit_price, supplier, category, min_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [componentId, designation, name, productNumber, footprint, quantity, unitPrice, supplier, category, minStock]);

    // console.log('✅ Composant créé avec ID:', componentId);

    // Récupérer le composant créé
    const newComponent = await db.query(`
      SELECT 
        id,
        designation,
        name,
        product_number as productNumber,
        footprint,
        quantity,
        unit_price as unitPrice,
        supplier,
        category,
        min_stock as minStock,
        created_at as createdAt,
        updated_at as updatedAt
      FROM components 
      WHERE id = ?
    `, [componentId]);

    res.status(201).json(newComponent[0]);
  } catch (error) {
    console.error('Erreur création composant:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/components/:id - Mettre à jour un composant
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Construire la requête de mise à jour dynamiquement
    const fields = [];
    const values = [];
    
    const allowedFields = {
      designation: 'designation',
      name: 'name',
      productNumber: 'product_number',
      footprint: 'footprint',
      quantity: 'quantity',
      unitPrice: 'unit_price',
      supplier: 'supplier',
      category: 'category',
      minStock: 'min_stock'
    };

    Object.keys(updates).forEach(key => {
      if (allowedFields[key]) {
        fields.push(`${allowedFields[key]} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    values.push(id);
    await db.query(`UPDATE components SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);

    // Récupérer le composant mis à jour
    const updatedComponent = await db.query(`
      SELECT 
        id,
        designation,
        name,
        product_number as productNumber,
        footprint,
        quantity,
        unit_price as unitPrice,
        supplier,
        category,
        min_stock as minStock,
        created_at as createdAt,
        updated_at as updatedAt
      FROM components 
      WHERE id = ?
    `, [id]);

    if (updatedComponent.length === 0) {
      return res.status(404).json({ error: 'Composant non trouvé' });
    }

    res.json(updatedComponent[0]);
  } catch (error) {
    console.error('Erreur mise à jour composant:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/components/:id - Supprimer un composant
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM components WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Composant non trouvé' });
    }

    res.json({ message: 'Composant supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression composant:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/components/:id/stock - Mettre à jour le stock
router.post('/:id/stock', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, reason } = req.body;

    console.log('🔧 Mise à jour stock - Requête reçue:', {
      componentId: id,
      quantity,
      type,
      reason,
      userId: req.user.userId
    });

    if (!quantity || !type || !reason) {
      console.log('❌ Paramètres manquants:', { quantity: !!quantity, type: !!type, reason: !!reason });
      return res.status(400).json({ error: 'Quantité, type et raison requis' });
    }

    await db.transaction(async (connection) => {
      // Récupérer le composant actuel (corriger la lecture des résultats SQL)
      const [rows] = await connection.execute('SELECT quantity FROM components WHERE id = ?', [id]);
      const componentRow = Array.isArray(rows) ? rows[0] : rows;
      
      console.log('📦 Composant trouvé:', componentRow);
      
      if (!componentRow) {
        throw new Error('Composant non trouvé');
      }

      const currentQuantity = Number(componentRow.quantity) || 0;
      const qty = Number(quantity) || 0;

      let newQuantity = currentQuantity;
      let movementQuantity = qty;
      let movementType = type;
      
      console.log('📦 Calcul initial:', {
        currentQuantity,
        quantity: qty,
        type,
        newQuantity,
        movementQuantity,
        movementType
      });
      
      if (type === 'in') {
        newQuantity += qty;
      } else if (type === 'out') {
        newQuantity -= qty;
      } else if (type === 'adjustment') {
        // Pour les ajustements, on calcule la différence
        const difference = qty - currentQuantity;
        newQuantity = qty;
        movementQuantity = Math.abs(difference);
        // On détermine le type de mouvement selon si c'est un ajout ou un retrait
        movementType = difference >= 0 ? 'in' : 'out';
        
        console.log('📦 Ajustement calculé:', {
          difference,
          newQuantity,
          movementQuantity,
          movementType
        });
      }

      newQuantity = Math.max(0, newQuantity);

      console.log('📦 Mise à jour stock:', {
        componentId: id,
        newQuantity
      });

      // Mettre à jour le stock
      await connection.execute('UPDATE components SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newQuantity, id]);

      // Enregistrer le mouvement seulement si il y a un changement
      if (movementQuantity > 0) {
        const movementId = randomUUID();
        console.log('📦 Enregistrement mouvement:', {
          movementId,
          componentId: id,
          type: movementType,
          quantity: movementQuantity,
          reason,
          userId: req.user.userId
        });
        
        await connection.execute(`
          INSERT INTO stock_movements (id, component_id, type, quantity, reason, user_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [movementId, id, movementType, movementQuantity, reason, req.user.userId]);
      }
    });

    res.json({ message: 'Stock mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur mise à jour stock:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/components/upload-image - Upload d'image pour un composant
router.post('/upload-image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image fournie' });
    }

    const { componentId } = req.body;
    
    if (!componentId) {
      // Supprimer le fichier uploadé si pas de componentId
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'ID du composant requis' });
    }

    // Vérifier que le composant existe
    const [component] = await db.query('SELECT id FROM components WHERE id = ?', [componentId]);
    if (!component) {
      // Supprimer le fichier uploadé si le composant n'existe pas
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Composant non trouvé' });
    }

    // Supprimer l'ancienne image si elle existe
    const [existingComponent] = await db.query('SELECT image_url FROM components WHERE id = ?', [componentId]);
    if (existingComponent && existingComponent.image_url) {
      const oldImagePath = path.join(__dirname, '../uploads/components', path.basename(existingComponent.image_url));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Construire l'URL de l'image
    const imageUrl = `http://localhost:3001/uploads/components/${req.file.filename}`;

    // Mettre à jour le composant avec la nouvelle image
    await db.query('UPDATE components SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [imageUrl, componentId]);

    res.json({ 
      success: true, 
      imageUrl: imageUrl,
      message: 'Image uploadée avec succès' 
    });
  } catch (error) {
    console.error('Erreur upload image:', error);
    
    // Supprimer le fichier en cas d'erreur
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Erreur lors de l\'upload de l\'image' });
  }
});

module.exports = router;