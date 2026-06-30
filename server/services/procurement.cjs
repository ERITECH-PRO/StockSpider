const db = require('../database.cjs');

/**
 * Calcul métier centralisé de l'approvisionnement (côté backend).
 * Besoin = pour chaque produit, (pcb_remaining + in_progress) x nomenclature,
 * sauf si un plan de production fournit une quantité explicite par produit.
 * À acheter = max(0, besoin - stock réel).
 *
 * @param {Record<string, number>} planOverride  map productId -> quantité à produire (optionnel)
 * @returns {Promise<{rows: Array, summary: object, blockedProducts: Array}>}
 */
async function computeProcurement(planOverride = {}) {
  // 1) Produits + états de production
  const products = await db.query(`
    SELECT id, name, pcb_remaining AS pcbRemaining, in_progress AS inProgress
    FROM products
  `);

  // 2) Nomenclatures (BOM)
  const bom = await db.query(`
    SELECT product_id AS productId, component_id AS componentId, quantity
    FROM product_components
  `);

  // 3) Composants + stock
  const components = await db.query(`
    SELECT id, designation, name, product_number AS productNumber, category,
           supplier, quantity, unit_price AS unitPrice, min_stock AS minStock
    FROM components
  `);

  const compById = new Map(components.map((c) => [c.id, c]));
  const bomByProduct = new Map();
  for (const line of bom) {
    if (!bomByProduct.has(line.productId)) bomByProduct.set(line.productId, []);
    bomByProduct.get(line.productId).push(line);
  }

  const targetFor = (p) => {
    const ov = planOverride[p.id];
    if (ov !== undefined && ov !== null && ov !== '') return Math.max(0, Number(ov) || 0);
    return Math.max(0, (Number(p.pcbRemaining) || 0) + (Number(p.inProgress) || 0));
  };

  // Besoin agrégé par composant + détection des produits bloqués
  const need = {};
  const blockedProducts = [];
  for (const p of products) {
    const target = targetFor(p);
    if (target <= 0) continue;
    const lines = bomByProduct.get(p.id) || [];
    let blocking = [];
    for (const line of lines) {
      const qty = Number(line.quantity) || 0;
      if (qty <= 0) continue;
      need[line.componentId] = (need[line.componentId] || 0) + qty * target;
      const comp = compById.get(line.componentId);
      const stock = comp ? Number(comp.quantity) || 0 : 0;
      // Bloquant si le stock ne couvre même pas une seule unité produite
      if (stock < qty) blocking.push(comp ? comp.designation : line.componentId);
    }
    if (blocking.length > 0) {
      blockedProducts.push({ productId: p.id, name: p.name, target, missing: blocking });
    }
  }

  // Lignes d'approvisionnement
  const rows = [];
  for (const c of components) {
    const required = need[c.id] || 0;
    if (required <= 0) continue;
    const available = Number(c.quantity) || 0;
    const toBuy = Math.max(0, required - available);
    rows.push({
      componentId: c.id,
      designation: c.designation,
      productNumber: c.productNumber,
      category: c.category,
      supplier: c.supplier || '',
      unitPrice: Number(c.unitPrice) || 0,
      required,
      available,
      toBuy,
      totalCost: toBuy * (Number(c.unitPrice) || 0),
    });
  }
  rows.sort((a, b) => b.toBuy - a.toBuy);

  const toOrder = rows.filter((r) => r.toBuy > 0);
  const summary = {
    refsToOrder: toOrder.length,
    refsSufficient: rows.length - toOrder.length,
    unitsToBuy: toOrder.reduce((s, r) => s + r.toBuy, 0),
    totalCost: toOrder.reduce((s, r) => s + r.totalCost, 0),
    blockedCount: blockedProducts.length,
  };

  return { rows, summary, blockedProducts };
}

module.exports = { computeProcurement };
