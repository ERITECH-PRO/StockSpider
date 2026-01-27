-- Ajouter le champ personnel à la table bons_sortie
ALTER TABLE bons_sortie ADD COLUMN personnel VARCHAR(255) DEFAULT NULL AFTER chantier_id;
