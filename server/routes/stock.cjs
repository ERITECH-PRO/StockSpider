const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../database.cjs');
const auth = require('../middleware/auth.cjs');

const router = express.Router();

// GET /api/stock/movements - Récupérer les mouvements de stock
router.get('/movements', auth, async (req, res) => {
  try {
    const { limit = 100, offset = 0, componentId, type } = req.query;
    
    let query = `
      SELECT 
        sm.id,
        sm.component_id as componentId,
        c.designation as componentDesignation,
        c.name as componentName,
        sm.type,
        sm.quantity,
        sm.unit_price as unitPrice,
        sm.reason,
        sm.user_id as userId,
        u.name as userName,
        sm.created_at as createdAt
      FROM stock_movements sm
      LEFT JOIN components c ON sm.component_id = c.id
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (componentId) {
      query += ' AND sm.component_id = ?';
      params.push(componentId);
    }
    
    if (type) {
      query += ' AND sm.type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY sm.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const movements = await db.query(query, params);
    
    res.json(movements);
  } catch (error) {
    console.error('Erreur récupération mouvements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/stock/summary - Récupérer le résumé des stocks
router.get('/summary', auth, async (req, res) => {
  try {
    const summary = await db.query(`
      SELECT 
        COUNT(*) as totalComponents,
        SUM(quantity) as totalQuantity,
        SUM(quantity * unit_price) as totalValue,
        COUNT(CASE WHEN quantity <= min_stock THEN 1 END) as lowStockCount
      FROM components
    `);
    
    const recentMovements = await db.query(`
      SELECT 
        sm.type,
        COUNT(*) as count,
        SUM(sm.quantity) as totalQuantity
      FROM stock_movements sm
      WHERE sm.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY sm.type
    `);
    
    res.json({
      summary: summary[0],
      recentMovements
    });
  } catch (error) {
    console.error('Erreur récupération résumé stock:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/stock/movements - Créer un mouvement de stock
router.post('/movements', auth, async (req, res) => {
  try {
    const {
      componentId,
      type,
      quantity,
      unitPrice = 0,
      reason
    } = req.body;

    if (!componentId || !type || !quantity || !reason) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    if (!['in', 'out', 'adjustment'].includes(type)) {
      return res.status(400).json({ error: 'Type de mouvement invalide' });
    }

    const movementId = randomUUID();

    await db.transaction(async (connection) => {
      // Créer le mouvement
      await connection.execute(`
        INSERT INTO stock_movements (id, component_id, type, quantity, unit_price, reason, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [movementId, componentId, type, quantity, unitPrice, reason, req.user.userId]);

      // Mettre à jour le stock du composant
      let newQuantity;
      const [component] = await connection.execute('SELECT quantity FROM components WHERE id = ?', [componentId]);
      
      if (component.length === 0) {
        throw new Error('Composant non trouvé');
      }
      
      const currentQuantity = component[0].quantity;
      
      if (type === 'in') {
        newQuantity = currentQuantity + quantity;
      } else if (type === 'out') {
        newQuantity = Math.max(0, currentQuantity - quantity);
      } else if (type === 'adjustment') {
        newQuantity = quantity;
      }
      
      await connection.execute(`
        UPDATE components 
        SET quantity = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [newQuantity, componentId]);
    });

    res.status(201).json({ 
      message: 'Mouvement de stock enregistré avec succès',
      movementId 
    });
  } catch (error) {
    console.error('Erreur création mouvement:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

module.exports = router;
