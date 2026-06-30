const express = require('express');
const auth = require('../middleware/auth.cjs');
const { computeProcurement } = require('../services/procurement.cjs');

const router = express.Router();

// GET /api/procurement - Composants à acheter (calcul métier centralisé)
// Query optionnelle: ?plan={"PR1":500,...} (plan de production, JSON encodé)
router.get('/', auth, async (req, res) => {
  try {
    let plan = {};
    if (req.query.plan) {
      try { plan = JSON.parse(req.query.plan); } catch { plan = {}; }
    }
    const result = await computeProcurement(plan);
    res.json(result);
  } catch (error) {
    console.error('Erreur calcul approvisionnement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
