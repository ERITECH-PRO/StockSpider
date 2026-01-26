const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../database.cjs');
const auth = require('../middleware/auth.cjs');

const router = express.Router();

// GET /api/suppliers - Récupérer tous les fournisseurs
router.get('/', auth, async (req, res) => {
  try {
    const suppliers = await db.query(`
      SELECT 
        id,
        name,
        contact,
        email,
        phone,
        address,
        created_at as createdAt
      FROM suppliers 
      ORDER BY name
    `);

    res.json(suppliers);
  } catch (error) {
    console.error('Erreur récupération fournisseurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/suppliers - Créer un nouveau fournisseur
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      contact = '',
      email = '',
      phone = '',
      address = ''
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nom du fournisseur requis' });
    }

    const supplierId = randomUUID();

    await db.query(`
      INSERT INTO suppliers (id, name, contact, email, phone, address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [supplierId, name, contact, email, phone, address]);

    // Récupérer le fournisseur créé
    const [newSupplier] = await db.query(`
      SELECT 
        id,
        name,
        contact,
        email,
        phone,
        address,
        created_at as createdAt
      FROM suppliers 
      WHERE id = ?
    `, [supplierId]);

    res.status(201).json(newSupplier);
  } catch (error) {
    console.error('Erreur création fournisseur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/suppliers/:id - Mettre à jour un fournisseur
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      contact,
      email,
      phone,
      address
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nom du fournisseur requis' });
    }

    const result = await db.query(`
      UPDATE suppliers 
      SET name = ?, contact = ?, email = ?, phone = ?, address = ?
      WHERE id = ?
    `, [name, contact, email, phone, address, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }

    // Récupérer le fournisseur mis à jour
    const [updatedSupplier] = await db.query(`
      SELECT 
        id,
        name,
        contact,
        email,
        phone,
        address,
        created_at as createdAt
      FROM suppliers 
      WHERE id = ?
    `, [id]);

    res.json(updatedSupplier);
  } catch (error) {
    console.error('Erreur mise à jour fournisseur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/suppliers/:id - Supprimer un fournisseur
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le fournisseur est utilisé par des composants
    const [usage] = await db.query(`
      SELECT COUNT(*) as count 
      FROM components 
      WHERE supplier = (SELECT name FROM suppliers WHERE id = ?)
    `, [id]);

    if (usage && usage.count > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer ce fournisseur car il est utilisé par des composants'
      });
    }

    const result = await db.query('DELETE FROM suppliers WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }

    res.json({ message: 'Fournisseur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression fournisseur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/suppliers/:id/components - Récupérer les composants d'un fournisseur
router.get('/:id/components', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer le nom du fournisseur
    const [supplier] = await db.query('SELECT name FROM suppliers WHERE id = ?', [id]);
    if (!supplier) {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }

    // Récupérer les composants de ce fournisseur
    const components = await db.query(`
      SELECT 
        id,
        designation,
        name,
        product_number as productNumber,
        category,
        quantity,
        unit_price as unitPrice,
        created_at as createdAt
      FROM components 
      WHERE supplier = ?
      ORDER BY designation
    `, [supplier.name]);

    res.json({
      supplier: supplier.name,
      components
    });
  } catch (error) {
    console.error('Erreur récupération composants fournisseur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
