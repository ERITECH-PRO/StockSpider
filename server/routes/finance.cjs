const express = require('express');
const auth = require('../middleware/auth.cjs');
const { computeFinance, updateCostItems } = require('../services/finance.cjs');

const router = express.Router();

// GET /api/finance/overview - Coûts, marges, valeurs de stock (calcul backend)
router.get('/overview', auth, async (req, res) => {
  try {
    const result = await computeFinance();
    res.json(result);
  } catch (error) {
    console.error('Erreur calcul financier:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/finance/cost-items/:productId - Mettre à jour les postes de coût d'un produit
router.put('/cost-items/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { items } = req.body || {};
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items doit être un tableau' });
    await updateCostItems(productId, items);
    const result = await computeFinance();
    res.json(result);
  } catch (error) {
    console.error('Erreur mise à jour postes de coût:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
