const mysql = require('mysql2/promise');
const config = require('./config.cjs');

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  async query(sql, params = []) {
    try {
      const [results] = await this.pool.execute(sql, params);
      return results;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async transaction(callback) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      console.log('✅ Connexion MySQL réussie !');
      connection.release();
      return true;
    } catch (error) {
      console.error('❌ Erreur de connexion MySQL:', error.message);
      return false;
    }
  }

  async initDatabase() {
    try {
      // Création des tables
      await this.createTables();
      console.log('✅ Tables créées avec succès !');

      // Assurer une ligne unique de paramètres (id=1)
      await this.query(`
        INSERT INTO app_settings (id, company_name)
        VALUES (1, '3S IT')
        ON DUPLICATE KEY UPDATE company_name = company_name
      `);
      
      // Migration des tables existantes
      await this.migrateTables();
      console.log('✅ Migration des tables terminée !');
      
      // Insertion des données de test
      await this.insertSampleData();
      console.log('✅ Données de test insérées !');
      
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
      return false;
    }
  }

  async createTables() {
    const tables = [
      // Table users
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'manager', 'reader') DEFAULT 'reader',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Table suppliers
      `CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Table components
      `CREATE TABLE IF NOT EXISTS components (
        id VARCHAR(36) PRIMARY KEY,
        designation VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        product_number VARCHAR(255) UNIQUE NOT NULL,
        footprint VARCHAR(100),
        quantity INT DEFAULT 0,
        unit_price DECIMAL(10,2) DEFAULT 0.00,
        supplier VARCHAR(255),
        category ENUM('condensateur', 'resistance', 'relais', 'microcontroleur', 'connecteur', 'inducteur', 'diode', 'transistor', 'capteur', 'alimentation', 'bornier', 'bouton', 'expanseur', 'fusible', 'led', 'optocoupleur', 'pcb', 'regulateur', 'support', 'autre') DEFAULT 'autre',
        min_stock INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

      // Table products
      `CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        product_number VARCHAR(255) DEFAULT '',
        production_cost DECIMAL(10,2) DEFAULT 0.00,
        selling_price DECIMAL(10,2) DEFAULT 0.00,
        quantity INT DEFAULT 0,
        pcb_remaining INT DEFAULT 0,
        in_progress INT DEFAULT 0,
        assembled_finished INT DEFAULT 0,
        sold INT DEFAULT 0,
        defective INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

      // Table product_components (relation many-to-many)
      `CREATE TABLE IF NOT EXISTS product_components (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        component_id VARCHAR(36) NOT NULL,
        quantity INT NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
        UNIQUE KEY unique_product_component (product_id, component_id)
      )`,

      // Table stock_movements
      `CREATE TABLE IF NOT EXISTS stock_movements (
        id VARCHAR(36) PRIMARY KEY,
        component_id VARCHAR(36),
        product_id VARCHAR(36),
        type ENUM('in', 'out', 'adjustment') NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2),
        reason TEXT,
        user_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE SET NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS assembly_movements (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        assembled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assembled_by VARCHAR(100) NOT NULL,
        total_cost DECIMAL(10,2) DEFAULT 0.00,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS products_in_assembly (
        id VARCHAR(36) PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        product_description TEXT,
        quantity_to_assemble INT NOT NULL DEFAULT 1,
        components_required JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100) NOT NULL,
        status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS components_to_buy (
        id VARCHAR(36) PRIMARY KEY,
        component_id VARCHAR(36) NOT NULL,
        component_name VARCHAR(255) NOT NULL,
        component_designation VARCHAR(255) NOT NULL,
        required_quantity INT NOT NULL,
        available_quantity INT NOT NULL,
        quantity_to_buy INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(10,2) NOT NULL,
        product_in_assembly_id VARCHAR(36) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending', 'ordered', 'received', 'cancelled') DEFAULT 'pending',
        FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE,
        FOREIGN KEY (product_in_assembly_id) REFERENCES products_in_assembly(id) ON DELETE CASCADE
      )`,

      // Paramètres application (logo + infos société)
      `CREATE TABLE IF NOT EXISTS app_settings (
        id INT PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL DEFAULT '3S IT',
        company_address TEXT,
        company_phone VARCHAR(50),
        company_email VARCHAR(255),
        company_logo_url VARCHAR(500),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

      // Clients
      `CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(36) PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        address TEXT,
        phone VARCHAR(50),
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

      // Chantiers (liés à un client, optionnellement)
      `CREATE TABLE IF NOT EXISTS chantiers (
        id VARCHAR(36) PRIMARY KEY,
        client_id VARCHAR(36),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
      )`,

      // Bons de sortie + lignes
      `CREATE TABLE IF NOT EXISTS bons_sortie (
        id VARCHAR(36) PRIMARY KEY,
        client_id VARCHAR(36) NOT NULL,
        chantier_id VARCHAR(36) NOT NULL,
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
        FOREIGN KEY (chantier_id) REFERENCES chantiers(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      )`,

      `CREATE TABLE IF NOT EXISTS bons_sortie_items (
        id VARCHAR(36) PRIMARY KEY,
        bon_sortie_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        product_code VARCHAR(255),
        product_name VARCHAR(255) NOT NULL,
        product_description TEXT,
        quantity INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bon_sortie_id) REFERENCES bons_sortie(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
      )`
    ];

    for (const table of tables) {
      await this.query(table);
    }
  }

  async migrateTables() {
    try {
      // Ajouter la colonne product_number à la table products si elle n'existe pas
      const columns = await this.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = 'product_number'
      `);
      
      if (columns.length === 0) {
        await this.query(`
          ALTER TABLE products 
          ADD COLUMN product_number VARCHAR(255) DEFAULT '' 
          AFTER description
        `);
        console.log('✅ Colonne product_number ajoutée à la table products');
      }

      // Ajouter les colonnes de suivi des 5 états de production aux produits
      const stateColumns = [
        ['pcb_remaining', 'quantity'],
        ['in_progress', 'pcb_remaining'],
        ['assembled_finished', 'in_progress'],
        ['sold', 'assembled_finished'],
        ['defective', 'sold']
      ];
      for (const [col, afterCol] of stateColumns) {
        const exists = await this.query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'products'
          AND COLUMN_NAME = ?
        `, [col]);
        if (exists.length === 0) {
          await this.query(`ALTER TABLE products ADD COLUMN \`${col}\` INT DEFAULT 0 AFTER \`${afterCol}\``);
          console.log(`✅ Colonne ${col} ajoutée à la table products`);
        }
      }

      // Étendre l'ENUM des catégories de composants si nécessaire
      const catCol = await this.query(`
        SELECT COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'components'
        AND COLUMN_NAME = 'category'
      `);
      if (catCol.length > 0 && !String(catCol[0].COLUMN_TYPE).includes("'bornier'")) {
        await this.query(`
          ALTER TABLE components MODIFY COLUMN category
          ENUM('condensateur','resistance','relais','microcontroleur','connecteur','inducteur','diode','transistor','capteur','alimentation','bornier','bouton','expanseur','fusible','led','optocoupleur','pcb','regulateur','support','autre')
          DEFAULT 'autre'
        `);
        console.log('✅ ENUM des catégories de composants étendu');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la migration:', error);
      // Ne pas faire échouer l'initialisation si la migration échoue
    }
  }

  async insertSampleData() {
    // Vérifier si des données existent déjà
    const existingUsers = await this.query('SELECT COUNT(*) as count FROM users');
    if (existingUsers[0].count > 0) {
      console.log('📊 Données existantes détectées, pas d\'insertion de données de test');
      return;
    }

    // Utilisateur admin par défaut
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await this.query(
      'INSERT INTO users (id, email, name, password, role) VALUES (?, ?, ?, ?, ?)',
      ['1', 'admin@stockspider.com', 'Admin User', hashedPassword, 'admin']
    );

    // Fournisseurs
    const suppliers = [
      ['sup1', 'Farnell', 'John Smith', 'orders@farnell.com', '+33 1 23 45 67 89', '123 Electronics Street, Paris'],
      ['sup2', 'Mouser Electronics', 'Sarah Johnson', 'sales@mouser.fr', '+33 1 98 76 54 32', '456 Component Avenue, Lyon']
    ];

    for (const supplier of suppliers) {
      await this.query(
        'INSERT INTO suppliers (id, name, contact, email, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
        supplier
      );
    }

    // Composants
    const components = [
      ['comp1', 'Résistance 10kΩ', 'R10K', 'R10K-0603', '0603', 1500, 0.02, 'Farnell', 'resistance', 100],
      ['comp2', 'Condensateur 100nF', 'C100N', 'C100N-0603', '0603', 50, 0.05, 'Mouser', 'condensateur', 200],
      ['comp3', 'Microcontrôleur STM32', 'STM32F103', 'STM32F103C8T6', 'LQFP48', 25, 3.50, 'STMicroelectronics', 'microcontroleur', 10]
    ];

    for (const component of components) {
      await this.query(
        'INSERT INTO components (id, designation, name, product_number, footprint, quantity, unit_price, supplier, category, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        component
      );
    }

    // Produit
    await this.query(
      'INSERT INTO products (id, name, description, production_cost, selling_price, quantity) VALUES (?, ?, ?, ?, ?, ?)',
      ['prod1', 'Module Spider Basic', 'Module de base avec STM32 et composants essentiels', 15.50, 25.00, 10]
    );

    // Composants du produit
    const productComponents = [
      ['pc1', 'prod1', 'comp1', 4],
      ['pc2', 'prod1', 'comp2', 8],
      ['pc3', 'prod1', 'comp3', 1]
    ];

    for (const pc of productComponents) {
      await this.query(
        'INSERT INTO product_components (id, product_id, component_id, quantity) VALUES (?, ?, ?, ?)',
        pc
      );
    }
  }
}

module.exports = new Database();