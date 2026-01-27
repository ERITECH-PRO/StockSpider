const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../database.cjs');
const auth = require('../middleware/auth.cjs');

const router = express.Router();

const requireAdmin = (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Accès refusé' });
    return false;
  }
  return true;
};

const generateBonId = async (connection) => {
  const yearSuffix = new Date().getFullYear().toString().substring(2); // e.g. "26"
  const prefix = `BS${yearSuffix}/`;

  const [rows] = await connection.execute(
    `SELECT id FROM bons_sortie WHERE id LIKE ?`,
    [`${prefix}%`]
  );

  let maxNumber = 0;
  (rows || []).forEach((r) => {
    const parts = r.id.split('/');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num) && num > maxNumber) maxNumber = num;
    }
  });

  const nextNumber = (maxNumber + 1).toString().padStart(6, '0');
  return `${prefix}${nextNumber}`;
};

// GET /api/bons-sortie - liste
router.get('/', auth, async (req, res) => {
  try {
    const bons = await db.query(`
      SELECT
        b.id,
        b.client_id as clientId,
        cl.company_name as clientCompanyName,
        b.chantier_id as chantierId,
        ch.name as chantierName,
        b.personnel,
        b.created_by as createdBy,
        u.name as createdByName,
        b.created_at as createdAt
      FROM bons_sortie b
      JOIN clients cl ON b.client_id = cl.id
      JOIN chantiers ch ON b.chantier_id = ch.id
      JOIN users u ON b.created_by = u.id
      ORDER BY b.created_at DESC
      LIMIT 200
    `);
    res.json(bons);
  } catch (error) {
    console.error('Erreur récupération bons de sortie:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/bons-sortie/:id - détail + lignes
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const [bon] = await db.query(
      `
      SELECT
        b.id,
        b.client_id as clientId,
        cl.company_name as clientCompanyName,
        cl.matricule_fiscal as clientMatriculeFiscal,
        cl.address as clientAddress,
        cl.phone as clientPhone,
        cl.email as clientEmail,
        b.chantier_id as chantierId,
        ch.name as chantierName,
        ch.address as chantierAddress,
        b.personnel,
        b.created_by as createdBy,
        u.name as createdByName,
        b.created_at as createdAt
      FROM bons_sortie b
      JOIN clients cl ON b.client_id = cl.id
      JOIN chantiers ch ON b.chantier_id = ch.id
      JOIN users u ON b.created_by = u.id
      WHERE b.id = ?
      `,
      [id]
    );

    if (!bon) return res.status(404).json({ error: 'Bon de sortie non trouvé' });

    const items = await db.query(
      `
      SELECT
        id,
        bon_sortie_id as bonSortieId,
        product_id as productId,
        product_code as productCode,
        product_name as productName,
        product_description as productDescription,
        quantity
      FROM bons_sortie_items
      WHERE bon_sortie_id = ?
      ORDER BY created_at ASC
      `,
      [id]
    );

    res.json({ ...bon, items });
  } catch (error) {
    console.error('Erreur récupération bon de sortie:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/bons-sortie - créer (admin) + décrément stock produits
router.post('/', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { clientId, chantierId, personnel, items } = req.body || {};
    if (!clientId || !chantierId) {
      return res.status(400).json({ error: 'Client et chantier requis' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Au moins un produit requis' });
    }

    const sanitizedItems = items
      .map((it) => ({
        productId: it?.productId,
        quantity: Number(it?.quantity || 0),
      }))
      .filter((it) => it.productId && it.quantity > 0);

    if (sanitizedItems.length === 0) {
      return res.status(400).json({ error: 'Liste produits invalide' });
    }

    const result = await db.transaction(async (connection) => {
      const bonId = await generateBonId(connection);

      await connection.execute(
        `INSERT INTO bons_sortie (id, client_id, chantier_id, personnel, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [bonId, clientId, chantierId, personnel || null, req.user.userId]
      );

      for (const it of sanitizedItems) {
        const [prodRows] = await connection.execute(
          `SELECT id, name, description, product_number, quantity
           FROM products WHERE id = ?`,
          [it.productId]
        );
        const product = Array.isArray(prodRows) ? prodRows[0] : prodRows;
        if (!product) {
          throw new Error(`Produit non trouvé: ${it.productId}`);
        }

        const currentQty = Number(product.quantity || 0);
        if (currentQty < it.quantity) {
          throw new Error(`Stock insuffisant pour ${product.name} (dispo: ${currentQty}, demandé: ${it.quantity})`);
        }

        await connection.execute(
          `UPDATE products SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [it.quantity, it.productId]
        );

        // Mouvement de stock (produit)
        const movementId = randomUUID();
        await connection.execute(
          `INSERT INTO stock_movements (id, product_id, type, quantity, reason, user_id)
           VALUES (?, ?, 'out', ?, ?, ?)`,
          [movementId, it.productId, it.quantity, `Bon de sortie: ${bonId}`, req.user.userId]
        );

        // Snapshot ligne bon de sortie
        const itemId = randomUUID();
        const productCode = product.product_number || product.id;
        await connection.execute(
          `INSERT INTO bons_sortie_items
           (id, bon_sortie_id, product_id, product_code, product_name, product_description, quantity)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            bonId,
            it.productId,
            productCode,
            product.name,
            product.description || '',
            it.quantity,
          ]
        );
      }

      return bonId;
    });

    res.status(201).json({ id: result, message: 'Bon de sortie créé avec succès' });
  } catch (error) {
    console.error('Erreur création bon de sortie:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// DELETE /api/bons-sortie/:id - supprimer (admin) + restauration stock
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { id } = req.params;

    await db.transaction(async (connection) => {
      // 1. Vérifier existence
      const [bonRows] = await connection.execute('SELECT id FROM bons_sortie WHERE id = ?', [id]);
      if (!bonRows || bonRows.length === 0) throw new Error('Bon de sortie non trouvé');

      // 2. Récupérer les items pour restaurer le stock
      const [items] = await connection.execute(
        'SELECT product_id, quantity FROM bons_sortie_items WHERE bon_sortie_id = ?',
        [id]
      );

      for (const it of items) {
        await connection.execute(
          'UPDATE products SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [it.quantity, it.product_id]
        );
      }

      // 3. Supprimer les mouvements de stock associés
      await connection.execute(
        'DELETE FROM stock_movements WHERE reason = ?',
        [`Bon de sortie: ${id}`]
      );

      // 4. Supprimer les items et le bon
      await connection.execute('DELETE FROM bons_sortie_items WHERE bon_sortie_id = ?', [id]);
      await connection.execute('DELETE FROM bons_sortie WHERE id = ?', [id]);
    });

    res.json({ message: 'Bon de sortie supprimé et stock restauré' });
  } catch (error) {
    console.error('Erreur suppression bon de sortie:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// PUT /api/bons-sortie/:id - modifier (admin) + gestion stock
router.put('/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { id } = req.params;
    const { clientId, chantierId, personnel, items } = req.body || {};

    if (!clientId || !chantierId) {
      return res.status(400).json({ error: 'Client et chantier requis' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Au moins un produit requis' });
    }

    const sanitizedItems = items
      .map((it) => ({
        productId: it?.productId,
        quantity: Number(it?.quantity || 0),
      }))
      .filter((it) => it.productId && it.quantity > 0);

    if (sanitizedItems.length === 0) {
      return res.status(400).json({ error: 'Liste produits invalide' });
    }

    await db.transaction(async (connection) => {
      // 1. Restaurer l'ancien stock
      const [oldItems] = await connection.execute(
        'SELECT product_id, quantity FROM bons_sortie_items WHERE bon_sortie_id = ?',
        [id]
      );

      for (const it of oldItems) {
        await connection.execute(
          'UPDATE products SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [it.quantity, it.product_id]
        );
      }

      // 2. Nettoyer les anciens items et mouvements
      await connection.execute('DELETE FROM bons_sortie_items WHERE bon_sortie_id = ?', [id]);
      await connection.execute('DELETE FROM stock_movements WHERE reason = ?', [`Bon de sortie: ${id}`]);

      // 3. Mettre à jour l'entête
      await connection.execute(
        'UPDATE bons_sortie SET client_id = ?, chantier_id = ?, personnel = ? WHERE id = ?',
        [clientId, chantierId, personnel || null, id]
      );

      // 4. Appliquer les nouveaux items et décrémenter le stock
      for (const it of sanitizedItems) {
        const [prodRows] = await connection.execute(
          'SELECT id, name, description, product_number, quantity FROM products WHERE id = ?',
          [it.productId]
        );
        const product = Array.isArray(prodRows) ? prodRows[0] : prodRows;
        if (!product) throw new Error(`Produit non trouvé: ${it.productId}`);

        const currentQty = Number(product.quantity || 0);
        if (currentQty < it.quantity) {
          throw new Error(`Stock insuffisant pour ${product.name} (dispo: ${currentQty}, demandé: ${it.quantity})`);
        }

        await connection.execute(
          'UPDATE products SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [it.quantity, it.productId]
        );

        // Nouveau mouvement
        const movementId = randomUUID();
        await connection.execute(
          `INSERT INTO stock_movements (id, product_id, type, quantity, reason, user_id)
           VALUES (?, ?, 'out', ?, ?, ?)`,
          [movementId, it.productId, it.quantity, `Bon de sortie: ${id}`, req.user.userId]
        );

        // Nouvel item
        const itemId = randomUUID();
        const productCode = product.product_number || product.id;
        await connection.execute(
          `INSERT INTO bons_sortie_items
           (id, bon_sortie_id, product_id, product_code, product_name, product_description, quantity)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, it.productId, productCode, product.name, product.description || '', it.quantity]
        );
      }
    });

    res.json({ id, message: 'Bon de sortie mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur modification bon de sortie:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

module.exports = router;


