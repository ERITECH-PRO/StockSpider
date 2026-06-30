-- fin_01_migration.sql — colonnes financières + table product_cost_items (idempotent)
-- À exécuter APRÈS backup. Aucune donnée écrasée.

SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='components' AND COLUMN_NAME='purchase_price');
SET @s := IF(@c=0,'ALTER TABLE components ADD COLUMN purchase_price DECIMAL(10,4) DEFAULT 0','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='components' AND COLUMN_NAME='average_price');
SET @s := IF(@c=0,'ALTER TABLE components ADD COLUMN average_price DECIMAL(10,4) DEFAULT 0','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='components' AND COLUMN_NAME='price_source');
SET @s := IF(@c=0,'ALTER TABLE components ADD COLUMN price_source VARCHAR(64) DEFAULT NULL','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='cost_price');
SET @s := IF(@c=0,'ALTER TABLE products ADD COLUMN cost_price DECIMAL(10,4) DEFAULT 0','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='recommended_price');
SET @s := IF(@c=0,'ALTER TABLE products ADD COLUMN recommended_price DECIMAL(10,4) DEFAULT 0','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='margin');
SET @s := IF(@c=0,'ALTER TABLE products ADD COLUMN margin DECIMAL(10,4) DEFAULT 0','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @c := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='margin_percent');
SET @s := IF(@c=0,'ALTER TABLE products ADD COLUMN margin_percent DECIMAL(6,2) DEFAULT 0','SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

CREATE TABLE IF NOT EXISTS product_cost_items (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  label VARCHAR(64) NOT NULL,
  amount DECIMAL(10,4) NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_prod_label (product_id, label),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Postes par défaut (PCB/Assemblage/Test/Emballage = 0, modifiables ensuite)
INSERT IGNORE INTO product_cost_items (id,product_id,label,amount) SELECT UUID(),id,'PCB',0 FROM products WHERE description='Module SpiderRoll';
INSERT IGNORE INTO product_cost_items (id,product_id,label,amount) SELECT UUID(),id,'Assemblage',0 FROM products WHERE description='Module SpiderRoll';
INSERT IGNORE INTO product_cost_items (id,product_id,label,amount) SELECT UUID(),id,'Test',0 FROM products WHERE description='Module SpiderRoll';
INSERT IGNORE INTO product_cost_items (id,product_id,label,amount) SELECT UUID(),id,'Emballage',0 FROM products WHERE description='Module SpiderRoll';
INSERT IGNORE INTO product_cost_items (id,product_id,label,amount) SELECT UUID(),id,'Autres',0 FROM products WHERE description='Module SpiderRoll';
