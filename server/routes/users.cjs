const express = require('express');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../database.cjs');
const auth = require('../middleware/auth.cjs');

const router = express.Router();

// GET /api/users - Récupérer tous les utilisateurs
router.get('/', auth, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const users = await db.query(`
      SELECT 
        id,
        name,
        email,
        role,
        created_at as createdAt
      FROM users 
      ORDER BY name
    `);
    
    res.json(users);
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/users - Créer un nouvel utilisateur
router.post('/', auth, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const {
      name,
      email,
      password,
      role = 'reader'
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    if (!['admin', 'manager', 'reader'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    // Vérifier si l'email existe déjà
    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const userId = randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(`
      INSERT INTO users (id, name, email, password, role, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [userId, name, email, hashedPassword, role]);

    // Récupérer l'utilisateur créé (sans le mot de passe)
    const [newUser] = await db.query(`
      SELECT 
        id,
        name,
        email,
        role,
        created_at as createdAt
      FROM users 
      WHERE id = ?
    `, [userId]);

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/users/:id - Mettre à jour un utilisateur
router.put('/:id', auth, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin ou modifie son propre profil
    if (req.user.role !== 'admin' && req.user.userId !== req.params.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { id } = req.params;
    const {
      name,
      email,
      password,
      role
    } = req.body;

    // Vérifier si l'utilisateur existe
    const [existingUser] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier les permissions pour le rôle
    if (role && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seuls les administrateurs peuvent modifier les rôles' });
    }

    if (role && !['admin', 'manager', 'reader'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    // Vérifier si l'email existe déjà (pour un autre utilisateur)
    if (email && email !== existingUser.email) {
      const [emailCheck] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (emailCheck) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }
    }

    // Préparer les champs à mettre à jour
    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (email) {
      updates.push('email = ?');
      params.push(email);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (role && req.user.role === 'admin') {
      updates.push('role = ?');
      params.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification à apporter' });
    }

    params.push(id);

    await db.query(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);

    // Récupérer l'utilisateur mis à jour
    const [updatedUser] = await db.query(`
      SELECT 
        id,
        name,
        email,
        role,
        created_at as createdAt
      FROM users 
      WHERE id = ?
    `, [id]);

    res.json(updatedUser);
  } catch (error) {
    console.error('Erreur mise à jour utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/users/:id - Supprimer un utilisateur
router.delete('/:id', auth, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { id } = req.params;

    // Empêcher la suppression de son propre compte
    if (req.user.userId === id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/users/profile - Récupérer le profil de l'utilisateur connecté
router.get('/profile', auth, async (req, res) => {
  try {
    const [user] = await db.query(`
      SELECT 
        id,
        name,
        email,
        role,
        created_at as createdAt
      FROM users 
      WHERE id = ?
    `, [req.user.userId]);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
