const db = require('../database.cjs');

async function addImageColumn() {
  try {
    console.log('🔄 Ajout de la colonne image_url à la table components...');
    
    // Vérifier si la colonne existe déjà
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'components' 
      AND COLUMN_NAME = 'image_url'
    `);
    
    if (columns.length > 0) {
      console.log('✅ La colonne image_url existe déjà');
      return;
    }
    
    // Ajouter la colonne image_url
    await db.query(`
      ALTER TABLE components 
      ADD COLUMN image_url VARCHAR(500) NULL 
      AFTER min_stock
    `);
    
    console.log('✅ Colonne image_url ajoutée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de la colonne:', error);
  } finally {
    process.exit(0);
  }
}

addImageColumn();
