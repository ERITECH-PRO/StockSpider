const db = require('../database.cjs');

async function checkImageColumn() {
  try {
    console.log('🔍 Vérification de la colonne image_url...');
    
    // Vérifier la structure de la table components
    const [columns] = await db.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'spider_stock' 
      AND TABLE_NAME = 'components'
      ORDER BY ORDINAL_POSITION;
    `);
    
    console.log('📋 Colonnes de la table components:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Vérifier spécifiquement si image_url existe
    const hasImageUrl = columns.some(col => col.COLUMN_NAME === 'image_url');
    
    if (hasImageUrl) {
      console.log('✅ La colonne image_url existe !');
    } else {
      console.log('❌ La colonne image_url n\'existe pas.');
      console.log('💡 Vous devez l\'ajouter avec cette commande SQL:');
      console.log('   ALTER TABLE components ADD COLUMN image_url VARCHAR(500) NULL AFTER min_stock;');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  } finally {
    process.exit();
  }
}

checkImageColumn();
