const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../database.cjs');
const auth = require('../middleware/auth.cjs');

const router = express.Router();

// GET /api/products - Récupérer tous les produits avec leurs composants
router.get('/', auth, async (req, res) => {
  try {
    const products = await db.query(`
      SELECT 
        id,
        name,
        description,
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
      components = [],
      productionCost = 0,
      sellingPrice = 0,
      quantity = 0
    } = req.body;

    if (!name || sellingPrice === undefined || sellingPrice === null) {
      return res.status(400).json({ error: 'Nom et prix de vente requis' });
    }

    // Générer un ID court pour le produit
    const existingProducts = await db.query('SELECT id FROM products WHERE id LIKE "PR%"');
    let maxNumber = 0;
    existingProducts.forEach(prod => {
      const number = parseInt(prod.id.substring(2));
      if (!isNaN(number) && number > maxNumber) {
        maxNumber = number;
      }
    });
    const productId = `PR${maxNumber + 1}`;

    await db.transaction(async (connection) => {
      // Créer le produit
      await connection.execute(`
        INSERT INTO products (id, name, description, production_cost, selling_price, quantity)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [productId, name, description, productionCost, sellingPrice, quantity]);

      // Ajouter les composants (grouper par component_id pour éviter les doublons)
      if (components.length > 0) {
        // Grouper les composants par component_id et additionner les quantités
        const componentMap = new Map();
        for (const component of components) {
          if (!component.componentId || !component.quantity) {
            continue;
          }
          
          const existing = componentMap.get(component.componentId);
          if (existing) {
            existing.quantity += component.quantity;
          } else {
            componentMap.set(component.componentId, {
              componentId: component.componentId,
              quantity: component.quantity
            });
          }
        }
        
        // Insérer les composants groupés
        for (const [componentId, data] of componentMap) {
          const pcId = randomUUID();
          await connection.execute(`
            INSERT INTO product_components (id, product_id, component_id, quantity)
            VALUES (?, ?, ?, ?)
          `, [pcId, productId, componentId, data.quantity]);
        }
      }
    });

    // Récupérer le produit créé avec ses composants
    const newProduct = await db.query(`
      SELECT 
        id,
        name,
        description,
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
    console.error('❌ Erreur création produit:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/products/:id - Mettre à jour un produit
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const {
      name,
      description,
      productNumber,
      components,
      productionCost,
      sellingPrice,
      quantity
    } = req.body;

    // Charger l'état actuel du produit pour supporter les mises à jour partielles
    const existingRows = await db.query(
      'SELECT name, description, product_number, production_cost, selling_price, quantity FROM products WHERE id = ?',
      [id]
    );
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    const existing = existingRows[0];

    // Fusionner les valeurs fournies avec les valeurs existantes
    const merged = {
      name: name ?? existing.name,
      description: description ?? existing.description ?? '',
      productNumber: productNumber ?? existing.product_number ?? '',
      productionCost: productionCost ?? existing.production_cost ?? 0,
      sellingPrice: sellingPrice ?? existing.selling_price,
      quantity: quantity ?? existing.quantity ?? 0,
    };

    if (!merged.name || merged.sellingPrice === undefined || merged.sellingPrice === null) {
      return res.status(400).json({ error: 'Nom et prix de vente requis' });
    }

    await db.transaction(async (connection) => {
      // Mettre à jour le produit (avec valeurs fusionnées)
      await connection.execute(`
        UPDATE products 
        SET name = ?, description = ?, product_number = ?, production_cost = ?, selling_price = ?, quantity = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [merged.name, merged.description, merged.productNumber, merged.productionCost, merged.sellingPrice, merged.quantity, id]);

      // Si une liste de composants est fournie, alors remplacer; sinon ne pas toucher
      if (Array.isArray(components)) {
        // Supprimer les anciens composants
        await connection.execute('DELETE FROM product_components WHERE product_id = ?', [id]);

        // Ajouter les nouveaux composants
        if (components.length > 0) {
        // Grouper les composants par component_id et additionner les quantités
        const componentMap = new Map();
        for (const component of components) {
          if (!component.componentId || !component.quantity) {
            continue;
          }
          
          const existing = componentMap.get(component.componentId);
          if (existing) {
            existing.quantity += component.quantity;
          } else {
            componentMap.set(component.componentId, {
              componentId: component.componentId,
              quantity: component.quantity
            });
          }
        }
        
        // Insérer les composants groupés
        for (const [componentId, data] of componentMap) {
          const pcId = randomUUID();
          await connection.execute(`
            INSERT INTO product_components (id, product_id, component_id, quantity)
            VALUES (?, ?, ?, ?)
          `, [pcId, id, componentId, data.quantity]);
        }
        }
      }
    });

    // Récupérer le produit mis à jour avec ses composants
    const updatedProduct = await db.query(`
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
    `, [id]);

    if (updatedProduct.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const productComponents = await db.query(`
      SELECT 
        pc.component_id as componentId,
        pc.quantity
      FROM product_components pc
      WHERE pc.product_id = ?
    `, [id]);

    updatedProduct[0].components = productComponents;

    res.json(updatedProduct[0]);
  } catch (error) {
    console.error('❌ Erreur mise à jour produit:', error.message);
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
        const movementId = randomUUID();
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

// DELETE /api/products/:id - Supprimer un produit
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    await db.transaction(async (connection) => {
      // Supprimer d'abord les relations dans product_components
      await connection.execute('DELETE FROM product_components WHERE product_id = ?', [id]);
      
      // Puis supprimer le produit
      const [result] = await connection.execute('DELETE FROM products WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        throw new Error('Produit non trouvé');
      }
    });

    res.json({ message: 'Produit supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression produit:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

module.exports = router;