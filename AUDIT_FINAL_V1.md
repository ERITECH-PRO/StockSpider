# StockSpider — Audit final V1.0

Audit de clôture de la phase 1. État réel du code et de la base après les développements (architecture MySQL, production, achats, finance).

## 1. Fonctionnalités validées ✅

### Base de données
- Migration MySQL complète ; init/migration automatique au démarrage (5 colonnes d'état, ENUM catégories 20 valeurs).
- 123 composants, 11 modules, 320 relations BOM, 1821 modules répartis sur les 5 états.
- Scripts financiers appliqués : colonnes prix + `product_cost_items`, 31 prix composants, 11 modules chiffrés.

### Backend (100 % MySQL)
- Logique métier critique centralisée (services `procurement.cjs`, `finance.cjs`).
- Transitions de production transactionnelles avec contrôles de stock (`/products/:id/transition`).
- API procurement (calcul backend), API finance (coûts/marges), dashboard agrégé en SQL.
- Mouvements de stock branchés sur la table `stock_movements`.

### Frontend
Écrans validés : Dashboard, Composants, Produits, Mouvements de stock, Assemblage en cours, Produits assemblés/vendus/défectueux, PCB restants, Composants à acheter, Coût de revient, Analyse financière. Plus aucune donnée métier en `localStorage` (uniquement session + préférences UI).

### Module financier
31 composants avec prix d'achat, 11 modules avec coût (Achat D/TTC), prix recommandé (Gros), marge, marge %, KPI financiers. Mapping complété (Duo→2R, S10→1R MF 10A, S16→PFC 16A).

## 2. Fonctionnalités restant à améliorer 🟠
- **Prix composants incomplets** : 32 composants restent à 0 (28 absents des arrivages + 4 références douteuses laissées à confirmer). La méthode B (coût détaillé) est donc partielle tant que ces prix manquent.
- **Périmètre de matching prix** limité aux 63 références SpiderRoll ; les ~60 autres composants de la base n'ont pas encore de prix.
- **Historique d'assemblage** (`AssemblyList`) : repose encore sur l'état mémoire `assembledProducts` (non persistant). À brancher sur une route MySQL.
- **Pagination** : les listes (composants, mouvements) chargent l'ensemble ; pagination serveur souhaitable au-delà de quelques milliers de lignes.
- **Cohérence `quantity` legacy** : conservé et resynchronisé sur `assembled_finished`, mais à terme remplaçable par les 5 colonnes.

## 3. Bugs connus
- Aucun bug bloquant connu en V1. Le bug `Incorrect arguments to mysqld_stmt_execute` (typage de paramètres) est **corrigé**.
- Les valeurs « publique » de la grille tarifaire contiennent des `#DIV/0!` pour les lignes vides (14R) — sans impact, ces lignes ne sont pas mappées.

## 4. Dette technique
- **Secrets versionnés** : `docker-compose.yml` contient des identifiants en clair (DB, JWT) → à externaliser dans un `.env` non versionné (priorité sécurité).
- **Tables héritées** non utilisées (`products_in_assembly`, `components_to_buy`, `assembly_movements`) : conservées sans rupture ; à supprimer ou réutiliser proprement.
- **Migrations mixtes** : 5 états migrés automatiquement (code) mais finance en SQL manuel → unifier dans un système de migrations versionnées.
- **Pas de tests automatisés** (unitaires/intégration). Vérifications faites par `node --check` + transpilation TypeScript.
- **`react-hot-toast` + toast maison** coexistent ; uniformiser.

## 5. Optimisations possibles
- Index SQL sur `product_components(product_id)`, `stock_movements(component_id, created_at)`, `components(category)`.
- Mise en cache des agrégats dashboard/finance (recalcul à chaque appel actuellement).
- Calcul du procurement/finance en une seule requête SQL agrégée plutôt qu'en agrégation JS (gain à grande échelle).
- Build frontend : code-splitting par page.
- Externaliser le `price_source` et l'historique des prix (multi-arrivages) dans une table dédiée.

## 6. Recommandations pour V2
1. Compléter les prix des composants manquants et étendre le matching aux 123 composants.
2. Mettre en place un vrai système de **migrations versionnées** (dossier `migrations/` horodaté, exécution contrôlée).
3. Ajouter des **tests** (Jest/Vitest backend, tests de rendu frontend) et un pipeline CI.
4. Sécuriser : secrets hors repo, rotation JWT, rôles appliqués par route.
5. Persister l'historique d'assemblage et les ordres de fabrication (voir `ROADMAP_V2.md`).
6. Sauvegardes automatiques planifiées + supervision (logs, alertes).

## 7. Verdict
La version **V1.0 est stable et fonctionnelle** : architecture homogène MySQL-only, workflows de production/achats/finance opérationnels, données réelles sur le VPS. Les points listés en §2–5 ne sont pas bloquants et constituent la base de la V2.
