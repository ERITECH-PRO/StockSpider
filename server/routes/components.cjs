const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../database.cjs');
const auth = require('../middleware/auth.cjs');

const router = express.Router();

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
      // Récupérer le composant actuel
      const [component] = await connection.execute('SELECT quantity FROM components WHERE id = ?', [id]);
      
      console.log('📦 Composant trouvé:', component);
      
      if (!component) {
        throw new Error('Composant non trouvé');
      }

      let newQuantity = component.quantity;
      let movementQuantity = quantity;
      let movementType = type;
      
      console.log('📦 Calcul initial:', {
        currentQuantity: component.quantity,
        quantity,
        type,
        newQuantity,
        movementQuantity,
        movementType
      });
      
      if (type === 'in') {
        newQuantity += quantity;
      } else if (type === 'out') {
        newQuantity -= quantity;
      } else if (type === 'adjustment') {
        // Pour les ajustements, on calcule la différence
        const difference = quantity - component.quantity;
        newQuantity = quantity;
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

module.exports = router;