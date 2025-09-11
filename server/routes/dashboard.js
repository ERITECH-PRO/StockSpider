const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats - Statistiques du tableau de bord
router.get('/stats', auth, async (req, res) => {
  try {
    // Nombre total de composants
    const [totalComponents] = await db.query('SELECT COUNT(*) as count FROM components');
    
    // Nombre total de produits
    const [totalProducts] = await db.query('SELECT COUNT(*) as count FROM products');
    
    // Composants en stock critique
    const [lowStockAlerts] = await db.query('SELECT COUNT(*) as count FROM components WHERE quantity <= min_stock');
    
    // Valeur totale du stock
    const [totalValue] = await db.query('SELECT SUM(quantity * unit_price) as total FROM components');
    
    // Mouvements récents
    const recentMovements = await db.query(`
      SELECT 
        sm.id,
        sm.type,
        sm.quantity,
        sm.reason,
        sm.created_at as createdAt,
        c.designation as componentName
      FROM stock_movements sm
      LEFT JOIN components c ON sm.component_id = c.id
      ORDER BY sm.created_at DESC
      LIMIT 5
    `);

    res.json({
      totalComponents: totalComponents.count,
      totalProducts: totalProducts.count,
      lowStockAlerts: lowStockAlerts.count,
      totalValue: totalValue.total || 0,
      recentMovements
    });
  } catch (error) {
    console.error('Erreur statistiques dashboard:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/dashboard/low-stock - Composants en stock critique
router.get('/low-stock', auth, async (req, res) => {
  try {
    const lowStockComponents = await db.query(`
      SELECT 
        id,
        designation,
        name,
        quantity,
        min_stock as minStock,
        unit_price as unitPrice
      FROM components 
      WHERE quantity <= min_stock
      ORDER BY quantity ASC
    `);

    res.json(lowStockComponents);
  } catch (error) {
    console.error('Erreur composants stock critique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;