# StockSpider — Rapport technique final (V1.0)

Document de référence de la version 1.0 stable. Décrit l'architecture, la base de données, les API, les services, les écrans et les workflows métier (production, achats, finance).

---

## 1. Architecture générale

Application web full-stack de gestion de stock et de production électronique (modules domotiques « SpiderRoll »).

```
Navigateur (React/Vite SPA)
        │  HTTP/JSON + JWT
        ▼
Backend Express (Node, fichiers .cjs)
        │  mysql2 (requêtes paramétrées)
        ▼
Base MySQL  (spider_stock)
```

- **Frontend** : React 18 + TypeScript, build Vite, style Tailwind CSS, icônes `lucide-react`, notifications `react-hot-toast`. SPA mono-page avec routage interne par état (`currentPage`).
- **Backend** : Node.js + Express, modules CommonJS (`.cjs`). Authentification JWT (`jsonwebtoken`), hash mots de passe `bcryptjs`, upload fichiers `multer`, lecture Excel `xlsx`/`papaparse`.
- **Base de données** : MySQL via `mysql2/promise` (pool de connexions, transactions).
- **Déploiement** : Docker (backend `node:20-alpine`, frontend servi par `nginx:alpine`).

Principe directeur V1 : **toute la logique métier critique est centralisée côté backend/MySQL**. Le `localStorage` ne contient plus que des préférences UI (`currentPage`, `sidebarCollapsed`) et la session (`stockspider_token`, `stockspider_user`).

## 2. Architecture MySQL

Connexion via pool (`server/database.cjs`), initialisation automatique au démarrage : création des tables (`CREATE TABLE IF NOT EXISTS`), migration des colonnes manquantes, insertion de données de test, et ligne unique `app_settings`.

### 2.1 Tables principales

| Table | Rôle |
|---|---|
| `users` | Comptes (rôles admin/manager/reader), mot de passe hashé |
| `suppliers` | Fournisseurs |
| `components` | Composants électroniques (stock, prix, catégorie) |
| `products` | Modules finis + états de production + données financières |
| `product_components` | Nomenclatures (BOM) — relation N-N produit ↔ composant |
| `stock_movements` | Historique des mouvements de stock (in/out/adjustment) |
| `product_cost_items` | Postes de coût non-composant (PCB, assemblage, test, emballage…) |
| `app_settings` | Paramètres société |
| `clients`, `chantiers`, `bons_sortie`, `bons_sortie_items` | Logistique / ventes |
| `assembly_movements`, `products_in_assembly`, `components_to_buy` | Tables héritées (workflow d'assemblage historique — non utilisées par la V1, conservées sans rupture) |

### 2.2 Schéma `components`
```
id VARCHAR(36) PK, designation, name, product_number (UNIQUE), footprint,
quantity INT, unit_price DECIMAL(10,2), supplier, category ENUM(20 valeurs),
min_stock INT, created_at, updated_at,
-- ajoutés par migration finance (fin_01) :
purchase_price DECIMAL(10,4), average_price DECIMAL(10,4), price_source VARCHAR(64)
```
Catégories (ENUM) : condensateur, resistance, relais, microcontroleur, connecteur, inducteur, diode, transistor, capteur, alimentation, bornier, bouton, expanseur, fusible, led, optocoupleur, pcb, regulateur, support, autre.

### 2.3 Schéma `products`
```
id VARCHAR(36) PK, name, description, product_number, production_cost, selling_price,
quantity INT,
-- états de production (migration auto) :
pcb_remaining, in_progress, assembled_finished, sold, defective  (INT),
-- finance (migration fin_01) :
cost_price, recommended_price, margin DECIMAL(10,4), margin_percent DECIMAL(6,2),
created_at, updated_at
```

### 2.4 Relations principales
- `product_components.product_id → products.id` (CASCADE) et `component_id → components.id` (CASCADE) : la BOM.
- `stock_movements.component_id → components.id`, `product_id → products.id`, `user_id → users.id`.
- `product_cost_items.product_id → products.id` (CASCADE), clé unique `(product_id, label)`.
- `bons_sortie_items.bon_sortie_id → bons_sortie.id`.

### 2.5 Volumétrie V1 (production)
123 composants · 11 modules Spider · 320 relations BOM · 1821 modules répartis sur les 5 états.

## 3. API disponibles

Base URL : `/api`. Toutes les routes (sauf login/register) exigent un header `Authorization: Bearer <token>`. Détails complets et exemples dans `API_DOCUMENTATION.md`.

| Domaine | Préfixe | Points clés |
|---|---|---|
| Auth | `/api/auth` | `POST /login`, `POST /register` |
| Composants | `/api/components` | CRUD + `POST /:id/stock`, `POST /upload-image` |
| Produits | `/api/products` | CRUD + `POST /:id/assemble`, `POST /:id/transition` |
| Procurement | `/api/procurement` | `GET /` (composants à acheter, calcul backend) |
| Finance | `/api/finance` | `GET /overview`, `PUT /cost-items/:productId` |
| Dashboard | `/api/dashboard` | `GET /overview`, `GET /stats`, `GET /low-stock` |
| Stock | `/api/stock` | `GET/POST /movements`, `GET /summary` |
| Assembly | `/api/assembly` | `GET /`, `POST /` (héritage) |
| Coûts | `/api/costs` | `GET /analysis`, `/profitability`, `/components` |
| Fournisseurs | `/api/suppliers` | CRUD + `GET /:id/components` |
| Clients/Chantiers/Bons | `/api/clients`, `/api/chantiers`, `/api/bons-sortie` | CRUD |
| Utilisateurs | `/api/users` | CRUD + `GET /profile` |
| Paramètres | `/api/settings` | `GET/PUT /`, `GET /backup` |

## 4. Services backend

- `server/database.cjs` — pool MySQL, `query()`, `transaction()`, init/migration automatique du schéma.
- `server/services/procurement.cjs` — `computeProcurement(plan)` : besoin = Σ BOM × (pcb_remaining + in_progress, ou plan) − stock ; renvoie lignes, résumé, produits bloqués.
- `server/services/finance.cjs` — `computeFinance()` : coût composants, postes, coût A/B, marges, valeurs de stock, agrégats ; `updateCostItems()`.
- `server/middleware/auth.cjs` — vérification JWT.

## 5. Pages frontend

Dashboard · Composants · Stocks Produits finis · Mouvements de stock · Coût de revient · Analyse financière · Coûts & marges · Catalogue Modèles · Assemblage en cours · Réappro. besoins (composants à acheter) · Historique Assemblage · Produits vendus · Produits défectueux · PCB restants · Bons de sortie · Clients · Chantiers · Fournisseurs · Utilisateurs · Paramètres.

## 6. Workflow de production

Chaque module suit 5 états : **PCB nu → En cours → Assemblé → Vendu**, avec branche **Défectueux**. Les transitions passent par `POST /api/products/:id/transition` (transactionnel) :

| Action | Mouvement | Effet annexe |
|---|---|---|
| `start` | pcb_remaining → in_progress | consomme les composants (BOM × qté), écrit mouvements `out` |
| `finish` | in_progress → assembled_finished | — |
| `sell` | assembled_finished → sold | — |
| `defect` | in_progress / assembled_finished → defective | — |

Contrôles : quantité entière positive, vérification de disponibilité (jamais de négatif), transaction unique, `quantity` legacy resynchronisé sur `assembled_finished`. UI : page « Assemblage en cours ».

## 7. Système BOM (nomenclatures)

Chaque produit possède une liste de composants et quantités (`product_components`). 320 relations en V1. La BOM alimente : le calcul des achats, le coût de revient (méthode B), et la consommation de stock au démarrage d'assemblage.

## 8. Calcul des achats (procurement)

`GET /api/procurement` (service `procurement.cjs`) :
```
besoin[composant] = Σ sur produits ( BOM.qté × cible )
cible = plan de production saisi, sinon (pcb_remaining + in_progress)
à acheter = max(0, besoin − stock réel)
```
Renvoie aussi le coût estimé (× purchase_price) et la liste des **produits bloqués** (stock insuffisant pour au moins une unité). UI : page « Réappro. besoins », plan de production optionnel.

## 9. Calcul du coût de revient

Service `finance.cjs`, deux méthodes combinées :
- **Méthode A (référence)** : `cost_price` = « Achat D/TTC » (issu de la grille tarifaire, stocké en base).
- **Méthode B (détaillée)** : `Σ (BOM.qté × components.purchase_price)` + Σ `product_cost_items` (PCB, assemblage, test, emballage, autres — éditables).

## 10. Calcul des marges

```
prix de référence (vente) = recommended_price  (palier « Gros »)
marge          = recommended_price − cost_price
marge %        = marge / recommended_price × 100
bénéfice unit. = marge
valeur stock (coût)  = assembled_finished × cost_price
valeur stock (vente) = assembled_finished × recommended_price
bénéfice potentiel    = assembled_finished × marge
```
KPI agrégés (analyse + dashboard) : valeur stock totale, valeur composants, bénéfice potentiel, marge moyenne, coût moyen/module, produits faible marge / déficitaires, top rentables.

## 11. Historique des migrations

1. **Auto (database.cjs)** : ajout des 5 colonnes d'état (`pcb_remaining`, `in_progress`, `assembled_finished`, `sold`, `defective`) à `products` ; extension de l'ENUM `components.category` (10 → 20 valeurs). Appliquées au démarrage du backend.
2. **`seed_spider_data.sql`** : import des 63 composants SpiderRoll + 11 produits (états) + 254 lignes BOM (idempotent).
3. **`fin_01_migration.sql`** : colonnes finance (`purchase_price`, `average_price`, `price_source` ; `cost_price`, `recommended_price`, `margin`, `margin_percent`) + table `product_cost_items`.
4. **`fin_02_prix_composants.sql`** : 31 prix d'achat composants.
5. **`fin_03_prix_modules.sql`** : 11 modules (coût Achat D/TTC + prix Gros + marges).

## 12. Dépendances

**Runtime** : express, mysql2, jsonwebtoken, bcryptjs, cors, dotenv, multer, papaparse, xlsx, react, react-dom, lucide-react, react-hot-toast, @fontsource/inter.
**Dev/build** : vite, @vitejs/plugin-react, typescript, tailwindcss, postcss, autoprefixer, eslint (+ plugins), concurrently.

## 13. Configuration Docker

`docker-compose.yml` :
- **backend** : build `Dockerfile.backend` (node:20-alpine, `npm ci --only=production`), port `3002`, variables `PORT, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET`.
- **frontend** : build multi-stage `Dockerfile.frontend` (build Vite → `nginx:alpine`), arg `VITE_API_URL`, port `5174:80`, `depends_on: backend`.

## 14. Configuration VPS

- Base MySQL `spider_stock` (conteneur `mysql_central` côté serveur, port interne 3306).
- Backend exposé sur `:3002`, frontend sur `:5174`.
- Variables sensibles via `.env` (clés : `DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, PORT`).
- Mise en service : `git pull` → `docker compose up -d --build` ; migrations SQL manuelles (`fin_*.sql`) appliquées après backup.

> ⚠️ Sécurité : ne pas committer de secrets. Le `docker-compose.yml` versionné contient des identifiants à externaliser dans un `.env` non versionné pour la suite (voir `AUDIT_FINAL_V1.md`).
