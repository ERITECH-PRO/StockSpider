# Guide — Appliquer les données SpiderRoll à ta base StockSpider (déjà peuplée)

Tout le code est déjà modifié dans le projet StockSpider (rien de caché). Il te reste à lancer la migration puis le seed sur ton VPS. Le script seed est **sûr et idempotent** : il ne crée pas de doublon et ne touche aucun ID existant.

## 1. Sauvegarde (obligatoire)
```bash
mysqldump -u <USER> -p <NOM_BASE> > backup_avant_seed.sql
```

## 2. Lancer la migration (crée les colonnes + étend l'ENUM)
Les changements de schéma s'appliquent automatiquement au démarrage du serveur :
```bash
npm run dev:server     # ou: node server/server.cjs
```
Au démarrage tu dois voir dans les logs :
```
✅ Colonne pcb_remaining ajoutée à la table products
✅ Colonne in_progress ajoutée ...
✅ ENUM des catégories de composants étendu
```

## 3. Pré-vérification (recommandé)
Exécute `precheck_avant_seed.sql` pour voir l'existant et surtout **vérifier que les noms de tes produits correspondent** à ceux du seed :
```bash
mysql -u <USER> -p <NOM_BASE> < precheck_avant_seed.sql
```
Les noms attendus côté seed : `Spider S16`, `Spider S10`, `SpiderRoll 1X`, `Spider Duo`, `SpiderRoll 2X/3X/4X V1/5X V1/6X V1/8X V1`, `Spider 1R5`.
- Si un produit existe déjà sous un **nom différent** → renomme-le pour qu'il corresponde, sinon le seed créera une 2ᵉ fiche.

## 4. Exécuter le seed
```bash
mysql -u <USER> -p <NOM_BASE> < seed_spider_data.sql
```

## 5. Vérifier le résultat
```sql
SELECT name, pcb_remaining, in_progress, assembled_finished, sold, defective,
       (pcb_remaining+in_progress+assembled_finished+sold+defective) AS total
FROM products WHERE description='Module SpiderRoll' ORDER BY name;
-- Total attendu toutes lignes : 1821 (dont l'anomalie 3X = 101, voir plus bas)
SELECT COUNT(*) FROM product_components;  -- +254 liaisons SpiderRoll
```

## Comment le seed évite les conflits
- **Composants** : appariés par `product_number` (référence fabricant, clé UNIQUE). Si la référence existe déjà, sa **quantité et sa catégorie** sont mises à jour et l'ID d'origine est conservé (aucune nouvelle ligne).
- **Produits** : appariés par **nom**. S'ils existent, seuls les 5 états (+ `quantity`) sont mis à jour ; aucun ID produit existant n'est écrasé. S'ils n'existent pas, ils sont créés avec un ID `SPDR_*` (sans collision).
- **Nomenclatures** : liées dynamiquement (`JOIN` sur le nom du produit et la référence du composant), donc elles pointent toujours vers les bonnes lignes, quels que soient les IDs réels. La contrainte `UNIQUE(product_id, component_id)` rend l'opération ré-exécutable sans doublon.

## Rollback si besoin
```bash
mysql -u <USER> -p <NOM_BASE> < backup_avant_seed.sql
```

## Points à connaître
- **`quantity` produit** = nombre d'assemblés finis (état « assemblé »). Le seed écrase l'ancienne valeur de `quantity` pour les produits concernés.
- **Catégorie composant** : mise à jour vers la catégorie source (alimentation, bornier, pcb, etc.). Si tu avais classé certains composants manuellement, ils sont réalignés.
- **Prix unitaires à 0** (absents de la source) — à compléter pour le calcul des coûts.
- **Anomalie 3X** : SpiderRoll 3X totalise 101 (21 assemblés + 80 vendus). Ta source forçait 100 via un PCB à -1 ; corrigé à 0.
- **3 composants ajoutés** (présents en nomenclature, absents de ta feuille Stock) : 22µF (CL31A226KPHNNNE), relais G2RL-1-E DC5, connecteur 1x5P — créés à stock 0.

## Si tu préfères une réconciliation parfaite
Envoie-moi un `mysqldump` (schéma + données). J'aligne le seed sur tes vrais noms/références/IDs et je te rends un script garanti sans aucun doublon.

## Validation déjà effectuée
- 339 instructions SQL, guillemets équilibrés, dialecte MySQL.
- 0 clé étrangère invalide (254 liaisons résolues), 0 catégorie hors ENUM.
- Backend `node --check` OK ; frontend (6 fichiers) transpilés sans erreur.
