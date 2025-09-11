const bcrypt = require('bcryptjs');
const db = require('../database.cjs');

/**
 * Transforme un enregistrement DB utilisateur en objet public (sans mot de passe)
 * @param {object} userRow
 */
function toPublicUser(userRow) {
  if (!userRow) return null;
  const { password, created_at, ...rest } = userRow;
  return {
    ...rest,
    createdAt: created_at
  };
}

async function getByEmail(email) {
  const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  return users[0] || null;
}

async function getById(id) {
  const users = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  return users[0] || null;
}

async function list() {
  const users = await db.query(`
    SELECT 
      id,
      email,
      name,
      role,
      created_at as createdAt
    FROM users
    ORDER BY created_at DESC
  `);
  return users;
}

async function create({ id, email, name, password, role = 'reader' }) {
  const hashed = await bcrypt.hash(password, 10);
  await db.query(
    'INSERT INTO users (id, email, name, password, role) VALUES (?, ?, ?, ?, ?)',
    [id, email, name, hashed, role]
  );
  return getById(id);
}

async function update(id, updates) {
  const allowed = { email: 'email', name: 'name', role: 'role', password: 'password' };
  const setParts = [];
  const values = [];

  for (const key of Object.keys(updates)) {
    if (!allowed[key]) continue;
    if (key === 'password') {
      const hashed = await bcrypt.hash(updates[key], 10);
      setParts.push('password = ?');
      values.push(hashed);
    } else {
      setParts.push(`${allowed[key]} = ?`);
      values.push(updates[key]);
    }
  }

  if (setParts.length === 0) return getById(id);

  values.push(id);
  await db.query(`UPDATE users SET ${setParts.join(', ')} WHERE id = ?`, values);
  return getById(id);
}

async function remove(id) {
  const res = await db.query('DELETE FROM users WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

async function verifyPassword(userRow, plain) {
  if (!userRow) return false;
  return bcrypt.compare(plain, userRow.password);
}

module.exports = {
  toPublicUser,
  getByEmail,
  getById,
  list,
  create,
  update,
  remove,
  verifyPassword
};


