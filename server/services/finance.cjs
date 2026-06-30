const db = require('../database.cjs');

const num = (v) => Number(v) || 0;

/**
 * Calcul financier centralisé (backend, 100% MySQL).
 * Méthode A (par défaut) : cost_price = Achat D/TTC (stocké), prix de référence = recommended_price (Gros).
 * Méthode B (complémentaire) : coût détaillé = Σ(BOM × purchase_price composants) + postes product_cost_items.
 * Aucune valeur codée en dur : tout vient des colonnes MySQL.
 */
async function computeFinance() {
  const products = await db.query(`
    SELECT id, name, description, quantity,
           pcb_remaining AS pcbRemaining, in_progress AS inProgress,
           assembled_finished AS assembledFinished, sold, defective,
           cost_price AS costPrice, recommended_price AS recommendedPrice,
           margin AS storedMargin, margin_percent AS storedMarginPercent
    FROM products
  `);
  const bom = await db.query(`SELECT product_id AS productId, component_id AS componentId, quantity FROM product_components`);
  const components = await db.query(`SELECT id, purchase_price AS purchasePrice, quantity FROM components`);
  let costItems = [];
  try {
    costItems = await db.query(`SELECT product_id AS productId, label, amount FROM product_cost_items`);
  } catch (e) { costItems = []; } // table absente si migration non appliquée

  const purchaseById = new Map(components.map((c) => [c.id, num(c.purchasePrice)]));
  const bomByProduct = new Map();
  for (const l of bom) {
    if (!bomByProduct.has(l.productId)) bomByProduct.set(l.productId, []);
    bomByProduct.get(l.productId).push(l);
  }
  const itemsByProduct = new Map();
  for (const it of costItems) {
    if (!itemsByProduct.has(it.productId)) itemsByProduct.set(it.productId, []);
    itemsByProduct.get(it.productId).push({ label: it.label, amount: num(it.amount) });
  }

  const rows = products.map((p) => {
    const lines = bomByProduct.get(p.id) || [];
    const componentCost = lines.reduce((s, l) => s + num(l.quantity) * (purchaseById.get(l.componentId) || 0), 0);
    const items = itemsByProduct.get(p.id) || [];
    const costItemsTotal = items.reduce((s, it) => s + it.amount, 0);
    const costDetailB = componentCost + costItemsTotal;

    const costA = num(p.costPrice);                 // Achat D/TTC
    const sellingRef = num(p.recommendedPrice);     // Gros
    const margin = sellingRef > 0 ? sellingRef - costA : 0;
    const marginPercent = sellingRef > 0 ? (margin / sellingRef) * 100 : 0;

    const finishedStock = num(p.assembledFinished);
    const stockValueCost = finishedStock * costA;
    const stockValueSale = finishedStock * sellingRef;
    const potentialBenefit = finishedStock * margin;

    return {
      id: p.id,
      name: p.name,
      pcbRemaining: num(p.pcbRemaining),
      inProgress: num(p.inProgress),
      assembledFinished: finishedStock,
      sold: num(p.sold),
      defective: num(p.defective),
      componentCost: round(componentCost),
      costItems: items,
      costItemsTotal: round(costItemsTotal),
      costDetailB: round(costDetailB),
      costPrice: round(costA),
      recommendedPrice: round(sellingRef),
      margin: round(margin),
      marginPercent: round(marginPercent, 2),
      unitBenefit: round(margin),
      stockValueCost: round(stockValueCost),
      stockValueSale: round(stockValueSale),
      potentialBenefit: round(potentialBenefit),
      priced: sellingRef > 0,
    };
  });

  const priced = rows.filter((r) => r.priced);
  const componentStockValue = components.reduce((s, c) => s + num(c.quantity) * num(c.purchasePrice), 0);

  const summary = {
    componentStockValue: round(componentStockValue),
    finishedGoodsCostValue: round(rows.reduce((s, r) => s + r.stockValueCost, 0)),
    finishedGoodsSaleValue: round(rows.reduce((s, r) => s + r.stockValueSale, 0)),
    potentialBenefit: round(rows.reduce((s, r) => s + r.potentialBenefit, 0)),
    totalStockValue: round(componentStockValue + rows.reduce((s, r) => s + r.stockValueCost, 0)),
    avgMarginPercent: priced.length ? round(priced.reduce((s, r) => s + r.marginPercent, 0) / priced.length, 2) : 0,
    avgCostPerModule: priced.length ? round(priced.reduce((s, r) => s + r.costPrice, 0) / priced.length) : 0,
    pricedCount: priced.length,
    lowMarginCount: priced.filter((r) => r.marginPercent < 30).length,
    deficitCount: priced.filter((r) => r.margin < 0).length,
    mostProfitable: [...priced].sort((a, b) => b.marginPercent - a.marginPercent).slice(0, 5)
      .map((r) => ({ name: r.name, marginPercent: r.marginPercent, margin: r.margin })),
    deficit: priced.filter((r) => r.margin < 0)
      .map((r) => ({ name: r.name, marginPercent: r.marginPercent, margin: r.margin })),
    lowMargin: priced.filter((r) => r.marginPercent < 30)
      .map((r) => ({ name: r.name, marginPercent: r.marginPercent })),
  };

  return { rows, summary };
}

function round(v, d = 3) {
  const f = Math.pow(10, d);
  return Math.round((Number(v) || 0) * f) / f;
}

/**
 * Met à jour les postes de coût (PCB/Assemblage/Test/Emballage/Autres) d'un produit.
 * items: [{label, amount}]
 */
async function updateCostItems(productId, items) {
  await db.transaction(async (conn) => {
    for (const it of items || []) {
      if (!it || !it.label) continue;
      const amount = Number(it.amount) || 0;
      await conn.execute(
        `INSERT INTO product_cost_items (id, product_id, label, amount)
         VALUES (UUID(), ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
        [productId, it.label, amount]
      );
    }
  });
}

module.exports = { computeFinance, updateCostItems };
