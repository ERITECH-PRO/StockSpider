-- Pré-vérification : à lancer AVANT le seed pour voir l'existant
SELECT COUNT(*) AS nb_composants FROM components;
SELECT COUNT(*) AS nb_produits FROM products;
-- Vos produits existants (vérifier que les noms correspondent à ceux du seed) :
SELECT id, name, product_number FROM products ORDER BY name;
-- Références composants déjà présentes qui matcheront le seed :
SELECT id, designation, product_number, quantity, category FROM components ORDER BY product_number;
