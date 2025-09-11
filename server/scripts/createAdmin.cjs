#!/usr/bin/env node
require('dotenv').config();
const { randomUUID } = require('crypto');
const users = require('../models/users.cjs');

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@stockspider.com';
  const name = process.env.ADMIN_NAME || 'Admin User';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await users.getByEmail(email);
  if (existing) {
    console.log(`Admin déjà présent: ${email}`);
    process.exit(0);
  }

  const id = randomUUID();
  await users.create({ id, email, name, password, role: 'admin' });
  console.log(`Admin créé: ${email}`);
}

main().catch((err) => {
  console.error('Erreur création admin:', err);
  process.exit(1);
});


