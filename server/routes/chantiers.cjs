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

// GET /api/chantiers?clientId=CL1 - liste des chantiers
router.get('/', auth, async (req, res) => {
  try {
    const { clientId } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (clientId) {
      where += ' AND c.client_id = ?';
      params.push(String(clientId));
    }

    const chantiers = await db.query(
      `
      SELECT
        c.id,
        c.client_id as clientId,
        cl.company_name as clientCompanyName,
        c.name,
        c.address,
        c.created_at as createdAt,
        c.updated_at as updatedAt
      FROM chantiers c
      LEFT JOIN clients cl ON c.client_id = cl.id
      ${where}
      ORDER BY c.name
      `,
      params
    );
    res.json(chantiers);
  } catch (error) {
    console.error('Erreur récupération chantiers:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/chantiers - créer (admin)
router.post('/', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { clientId = null, name, address = '' } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Nom du chantier requis' });
    }

    // Générer un ID court CH{n}
    const rows = await db.query('SELECT id FROM chantiers WHERE id LIKE "CH%"');
    let maxNumber = 0;
    rows.forEach((r) => {
      const num = parseInt(String(r.id).substring(2), 10);
      if (!isNaN(num) && num > maxNumber) maxNumber = num;
    });
    const id = `CH${maxNumber + 1}`;

    await db.query(
      `INSERT INTO chantiers (id, client_id, name, address)
       VALUES (?, ?, ?, ?)`,
      [id, clientId || null, name, address]
    );

    const [created] = await db.query(
      `
      SELECT
        c.id,
        c.client_id as clientId,
        cl.company_name as clientCompanyName,
        c.name,
        c.address,
        c.created_at as createdAt,
        c.updated_at as updatedAt
      FROM chantiers c
      LEFT JOIN clients cl ON c.client_id = cl.id
      WHERE c.id = ?
      `,
      [id]
    );
    res.status(201).json(created);
  } catch (error) {
    console.error('Erreur création chantier:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/chantiers/:id - modifier (admin)
router.put('/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const { clientId, name, address } = req.body || {};

    const fields = [];
    const values = [];
    if (clientId !== undefined) {
      fields.push('client_id = ?');
      values.push(clientId || null);
    }
    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (address !== undefined) {
      fields.push('address = ?');
      values.push(address);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
    }

    values.push(id);
    await db.query(`UPDATE chantiers SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);

    const [updated] = await db.query(
      `
      SELECT
        c.id,
        c.client_id as clientId,
        cl.company_name as clientCompanyName,
        c.name,
        c.address,
        c.created_at as createdAt,
        c.updated_at as updatedAt
      FROM chantiers c
      LEFT JOIN clients cl ON c.client_id = cl.id
      WHERE c.id = ?
      `,
      [id]
    );
    if (!updated) return res.status(404).json({ error: 'Chantier non trouvé' });

    res.json(updated);
  } catch (error) {
    console.error('Erreur mise à jour chantier:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/chantiers/:id - supprimer (admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { id } = req.params;
    const result = await db.query('DELETE FROM chantiers WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Chantier non trouvé' });
    }
    res.json({ message: 'Chantier supprimé avec succès' });
  } catch (error) {
    if (error && (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED')) {
      return res.status(409).json({ error: 'Impossible de supprimer ce chantier (lié à des bons de sortie)' });
    }
    console.error('Erreur suppression chantier:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;


