const express = require('express');
const db = require('../database.cjs');
const auth = require('../middleware/auth.cjs');
const { computeProcurement } = require('../services/procurement.cjs');

const router = express.Router();

// GET /api/dashboard/overview - Vue d'ensemble ERP (tout calculé côté MySQL/backend)
router.get('/overview', auth, async (req, res) => {
  try {
    const [counts] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM components) AS totalComponents,
        (SELECT COUNT(*) FROM products) AS totalProducts,
        (SELECT COUNT(*) FROM components WHERE quantity <= min_stock) AS lowStockAlerts,
        (SELECT COUNT(*) FROM components WHERE quantity = 0) AS outOfStock,
        (SELECT IFNULL(SUM(quantity * unit_price), 0) FROM components) AS totalValue
    `);

    // 5 états de production agrégés
    const [production] = await db.query(`
      SELECT
        IFNULL(SUM(pcb_remaining),0)      AS pcbRemaining,
        IFNULL(SUM(in_progress),0)        AS inProgress,
        IFNULL(SUM(assembled_finished),0) AS assembledFinished,
        IFNULL(SUM(sold),0)               AS sold,
        IFNULL(SUM(defective),0)          AS defective
      FROM products
    `);

    // Répartition des composants par catégorie (pour graphique)
    const categoryDistribution = await db.query(`
      SELECT category, COUNT(*) AS count
      FROM components
      GROUP BY category
      ORDER BY count DESC
    `);

    // Composants critiques (stock <= min)
    const criticalComponents = await db.query(`
      SELECT id, designation, name, quantity, min_stock AS minStock
      FROM components
      WHERE quantity <= min_stock
      ORDER BY quantity ASC
      LIMIT 8
    `);

    // Mouvements récents
    const recentMovements = await db.query(`
      SELECT sm.id, sm.type, sm.quantity, sm.reason, sm.created_at AS createdAt,
             c.designation AS componentName
      FROM stock_movements sm
      LEFT JOIN components c ON sm.component_id = c.id
      ORDER BY sm.created_at DESC
      LIMIT 5
    `);

    // Approvisionnement + produits bloqués (logique métier centralisée)
    const { summary, blockedProducts } = await computeProcurement({});

    res.json({
      counts,
      production,
      categoryDistribution,
      criticalComponents,
      recentMovements,
      procurement: summary,
      blockedProducts,
    });
  } catch (error) {
    console.error('Erreur overview dashboard:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

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