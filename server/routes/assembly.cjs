const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../database.cjs');
const auth = require('../middleware/auth.cjs');

const router = express.Router();

// GET /api/assembly - Récupérer les assemblages récents
router.get('/', auth, async (req, res) => {
  try {
    const assemblies = await db.query(`
      SELECT 
        am.id,
        am.product_id as productId,
        p.name as productName,
        am.quantity,
        am.assembled_at as assembledAt,
        am.assembled_by as assembledBy,
        am.total_cost as totalCost
      FROM assembly_movements am
      JOIN products p ON am.product_id = p.id
      ORDER BY am.assembled_at DESC
      LIMIT 100
    `);
    
    res.json(assemblies);
  } catch (error) {
    console.error('Erreur récupération assemblages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/assembly - Enregistrer un assemblage
router.post('/', auth, async (req, res) => {
  try {
    const {
      productId,
      quantity = 1,
      assembledBy = 'current_user'
    } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'ID produit requis' });
    }

    // Récupérer le produit et calculer le coût total
    const [product] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const totalCost = (product.production_cost || 0) * quantity;

    const assemblyId = randomUUID();

    await db.transaction(async (connection) => {
      // Enregistrer l'assemblage
      await connection.execute(`
        INSERT INTO assembly_movements (id, product_id, quantity, assembled_at, assembled_by, total_cost)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
      `, [assemblyId, productId, quantity, assembledBy, totalCost]);

      // Mettre à jour le stock du produit
      await connection.execute(`
        UPDATE products 
        SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [quantity, productId]);
    });

    res.status(201).json({ 
      message: 'Assemblage enregistré avec succès',
      assemblyId,
      totalCost 
    });
  } catch (error) {
    console.error('Erreur enregistrement assemblage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
