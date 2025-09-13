const express = require('express');
const { v4: uuidv4 } = require('crypto');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/products - Récupérer tous les produits avec leurs composants
router.get('/', auth, async (req, res) => {
  try {
    const products = await db.query(`
      SELECT 
        id,
        name,
        description,
        product_number as productNumber,
        production_cost as productionCost,
        selling_price as sellingPrice,
        quantity,
        created_at as createdAt,
        updated_at as updatedAt
      FROM products 
      ORDER BY name
    `);

    // Récupérer les composants pour chaque produit
    for (let product of products) {
      const components = await db.query(`
        SELECT 
          pc.component_id as componentId,
          pc.quantity,
          c.designation,
          c.name as componentName
        FROM product_components pc
        JOIN components c ON pc.component_id = c.id
        WHERE pc.product_id = ?
      `, [product.id]);
      
      product.components = components;
    }
    
    res.json(products);
  } catch (error) {
    console.error('Erreur récupération produits:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/products - Créer un nouveau produit
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      description = '',
      productNumber = '',
      components = [],
      productionCost = 0,
      sellingPrice = 0,
      quantity = 0
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nom requis' });
    }

    const productId = uuidv4();

    await db.transaction(async (connection) => {
      // Créer le produit
      await connection.execute(`
        INSERT INTO products (id, name, description, product_number, production_cost, selling_price, quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [productId, name, description, productNumber, productionCost, sellingPrice, quantity]);

      // Ajouter les composants
      for (const component of components) {
        const componentId = uuidv4();
        await connection.execute(`
          INSERT INTO product_components (id, product_id, component_id, quantity)
          VALUES (?, ?, ?, ?)
        `, [componentId, productId, component.componentId, component.quantity]);
      }
    });

    // Récupérer le produit créé avec ses composants
    const newProduct = await db.query(`
      SELECT 
        id,
        name,
        description,
        product_number as productNumber,
        production_cost as productionCost,
        selling_price as sellingPrice,
        quantity,
        created_at as createdAt,
        updated_at as updatedAt
      FROM products 
      WHERE id = ?
    `, [productId]);

    const productComponents = await db.query(`
      SELECT 
        pc.component_id as componentId,
        pc.quantity
      FROM product_components pc
      WHERE pc.product_id = ?
    `, [productId]);

    newProduct[0].components = productComponents;

    res.status(201).json(newProduct[0]);
  } catch (error) {
    console.error('Erreur création produit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/products/:id/assemble - Assembler un produit
router.post('/:id/assemble', auth, async (req, res) => {
  try {
    const { id } = req.params;

    await db.transaction(async (connection) => {
      // Récupérer le produit et ses composants
      const [product] = await connection.execute('SELECT * FROM products WHERE id = ?', [id]);
      if (!product) {
        throw new Error('Produit non trouvé');
      }

      const components = await connection.execute(`
        SELECT pc.component_id, pc.quantity, c.quantity as stock
        FROM product_components pc
        JOIN components c ON pc.component_id = c.id
        WHERE pc.product_id = ?
      `, [id]);

      // Vérifier si l'assemblage est possible
      for (const comp of components[0]) {
        if (comp.stock < comp.quantity) {
          throw new Error(`Stock insuffisant pour le composant ${comp.component_id}`);
        }
      }

      // Décrémenter le stock des composants
      for (const comp of components[0]) {
        await connection.execute(
          'UPDATE components SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [comp.quantity, comp.component_id]
        );

        // Enregistrer le mouvement
        const movementId = uuidv4();
        await connection.execute(`
          INSERT INTO stock_movements (id, component_id, type, quantity, reason, user_id)
          VALUES (?, ?, 'out', ?, ?, ?)
        `, [movementId, comp.component_id, comp.quantity, `Assemblage produit: ${product.name}`, req.user.userId]);
      }

      // Incrémenter le stock du produit
      await connection.execute(
        'UPDATE products SET quantity = quantity + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
    });

    res.json({ message: 'Produit assemblé avec succès' });
  } catch (error) {
    console.error('Erreur assemblage produit:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

module.exports = router;