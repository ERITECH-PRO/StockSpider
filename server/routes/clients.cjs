const express = require('express');
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

// GET /api/clients - liste des clients
router.get('/', auth, async (req, res) => {
  try {
    // admin/manager/reader peuvent lire (utile pour sélection)
    const clients = await db.query(`
      SELECT
        id,
        company_name as companyName,
        matricule_fiscal as matriculeFiscal,
        address,
        phone,
        email,
        created_at as createdAt,
        updated_at as updatedAt
      FROM clients
      ORDER BY company_name
    `);
    res.json(clients);
  } catch (error) {
    console.error('Erreur récupération clients:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/clients - créer un client (admin)
router.post('/', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { companyName, matriculeFiscal = '', address = '', phone = '', email = '' } = req.body || {};
    if (!companyName || !String(companyName).trim()) {
      return res.status(400).json({ error: 'Nom de l’entreprise requis' });
    }

    // Générer un ID court CL{n}
    const rows = await db.query('SELECT id FROM clients WHERE id LIKE "CL%"');
    let maxNumber = 0;
    rows.forEach((r) => {
      const num = parseInt(String(r.id).substring(2), 10);
      if (!isNaN(num) && num > maxNumber) maxNumber = num;
    });
    const id = `CL${maxNumber + 1}`;

    await db.query(
      `INSERT INTO clients (id, company_name, matricule_fiscal, address, phone, email)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, companyName, matriculeFiscal, address, phone, email]
    );

    const [created] = await db.query(
      `SELECT id, company_name as companyName, matricule_fiscal as matriculeFiscal, address, phone, email, created_at as createdAt, updated_at as updatedAt
       FROM clients WHERE id = ?`,
      [id]
    );

    res.status(201).json(created);
  } catch (error) {
    console.error('Erreur création client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/clients/:id - modifier un client (admin)
router.put('/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const { companyName, matriculeFiscal, address, phone, email } = req.body || {};

    const fields = [];
    const values = [];
    if (companyName !== undefined) {
      fields.push('company_name = ?');
      values.push(companyName);
    }
    if (matriculeFiscal !== undefined) {
      fields.push('matricule_fiscal = ?');
      values.push(matriculeFiscal);
    }
    if (address !== undefined) {
      fields.push('address = ?');
      values.push(address);
    }
    if (phone !== undefined) {
      fields.push('phone = ?');
      values.push(phone);
    }
    if (email !== undefined) {
      fields.push('email = ?');
      values.push(email);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    values.push(id);
    await db.query(`UPDATE clients SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);

    const [updated] = await db.query(
      `SELECT id, company_name as companyName, matricule_fiscal as matriculeFiscal, address, phone, email, created_at as createdAt, updated_at as updatedAt
       FROM clients WHERE id = ?`,
      [id]
    );
    if (!updated) return res.status(404).json({ error: 'Client non trouvé' });

    res.json(updated);
  } catch (error) {
    console.error('Erreur mise à jour client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/clients/:id - supprimer un client (admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const result = await db.query('DELETE FROM clients WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    res.json({ message: 'Client supprimé avec succès' });
  } catch (error) {
    // cas FK restriction
    if (error && (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED')) {
      return res.status(409).json({ error: 'Impossible de supprimer ce client (lié à des chantiers ou des bons de sortie)' });
    }
    console.error('Erreur suppression client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;


