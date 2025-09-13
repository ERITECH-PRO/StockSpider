const express = require('express');
const db = require('../database.cjs');
const auth = require('../middleware/auth.cjs');

const router = express.Router();

// GET /api/costs/analysis - Analyse des coûts et marges
router.get('/analysis', auth, async (req, res) => {
  try {
    // Coûts totaux des composants
    const componentCosts = await db.query(`
      SELECT 
        SUM(quantity * unit_price) as totalComponentValue,
        COUNT(*) as totalComponents,
        AVG(unit_price) as averageComponentPrice
      FROM components
    `);

    // Coûts de production des produits
    const productCosts = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.production_cost,
        p.selling_price,
        p.quantity,
        (p.selling_price - p.production_cost) as margin,
        CASE 
          WHEN p.selling_price > 0 THEN 
            ((p.selling_price - p.production_cost) / p.selling_price) * 100 
          ELSE 0 
        END as marginPercentage
      FROM products p
      ORDER BY margin DESC
    `);

    // Analyse par catégorie de composants
    const categoryAnalysis = await db.query(`
      SELECT 
        category,
        COUNT(*) as componentCount,
        SUM(quantity) as totalQuantity,
        SUM(quantity * unit_price) as totalValue,
        AVG(unit_price) as averagePrice
      FROM components
      GROUP BY category
      ORDER BY totalValue DESC
    `);

    // Mouvements de coûts récents
    const recentCostMovements = await db.query(`
      SELECT 
        sm.id,
        c.designation,
        sm.type,
        sm.quantity,
        sm.unit_price,
        sm.created_at,
        (sm.quantity * sm.unit_price) as totalCost
      FROM stock_movements sm
      JOIN components c ON sm.component_id = c.id
      WHERE sm.unit_price > 0
      ORDER BY sm.created_at DESC
      LIMIT 20
    `);

    res.json({
      componentCosts: componentCosts[0],
      productCosts,
      categoryAnalysis,
      recentCostMovements
    });
  } catch (error) {
    console.error('Erreur analyse coûts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/costs/profitability - Analyse de rentabilité
router.get('/profitability', auth, async (req, res) => {
  try {
    const profitability = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.production_cost,
        p.selling_price,
        p.quantity as stockQuantity,
        (p.selling_price - p.production_cost) as unitMargin,
        (p.selling_price - p.production_cost) * p.quantity as totalPotentialMargin,
        CASE 
          WHEN p.selling_price > 0 THEN 
            ((p.selling_price - p.production_cost) / p.selling_price) * 100 
          ELSE 0 
        END as marginPercentage,
        CASE 
          WHEN p.production_cost > 0 THEN 
            (p.selling_price / p.production_cost) * 100 
          ELSE 0 
        END as markupPercentage
      FROM products p
      WHERE p.selling_price > 0 AND p.production_cost > 0
      ORDER BY marginPercentage DESC
    `);

    // Statistiques globales
    const globalStats = await db.query(`
      SELECT 
        COUNT(*) as totalProducts,
        AVG(production_cost) as averageProductionCost,
        AVG(selling_price) as averageSellingPrice,
        AVG(selling_price - production_cost) as averageMargin,
        SUM((selling_price - production_cost) * quantity) as totalPotentialProfit
      FROM products
      WHERE selling_price > 0 AND production_cost > 0
    `);

    res.json({
      profitability,
      globalStats: globalStats[0]
    });
  } catch (error) {
    console.error('Erreur analyse rentabilité:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/costs/components - Coûts détaillés par composant
router.get('/components', auth, async (req, res) => {
  try {
    const componentCosts = await db.query(`
      SELECT 
        c.id,
        c.designation,
        c.name,
        c.category,
        c.quantity,
        c.unit_price,
        c.supplier,
        (c.quantity * c.unit_price) as totalValue,
        COUNT(pc.product_id) as usedInProducts
      FROM components c
      LEFT JOIN product_components pc ON c.id = pc.component_id
      GROUP BY c.id
      ORDER BY totalValue DESC
    `);

    res.json(componentCosts);
  } catch (error) {
    console.error('Erreur coûts composants:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
