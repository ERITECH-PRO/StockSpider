# StockSpider — Guide administrateur (V1.0)

Procédures d'exploitation : sauvegarde, restauration, mises à jour, migrations, dépannage. Réservé aux administrateurs système.

## Pré-requis
- Accès SSH au VPS.
- Docker + Docker Compose installés.
- Accès au dépôt `ERITECH-PRO/StockSpider` (clé SSH ou token).
- Identifiants MySQL de la base `spider_stock`.

## Architecture déployée
- Conteneur `stockspider-backend` (Express, port 3002).
- Conteneur `stockspider-frontend` (nginx, port 5174).
- Base MySQL `spider_stock` (conteneur `mysql_central`, port interne 3306).

---

## 1. Sauvegarde

### Base de données (à faire avant TOUTE migration)
```bash
mkdir -p /root/mysql_backups
mysqldump -u <USER> -p <BASE> > /root/mysql_backups/backup_$(date +%F_%H-%M).sql
```
Pour une base dans un conteneur :
```bash
docker exec mysql_central mysqldump -u <USER> -p<PASS> spider_stock > backup_$(date +%F).sql
```

### Images uploadées
Sauvegarder le dossier `server/uploads/` (logos société + images composants).

## 2. Restauration MySQL
```bash
mysql -u <USER> -p <BASE> < /root/mysql_backups/backup_AAAA-MM-JJ.sql
# ou dans le conteneur :
docker exec -i mysql_central mysql -u <USER> -p<PASS> spider_stock < backup.sql
```

## 3. Mises à jour Git
```bash
cd <chemin>/StockSpider
git pull origin main
```
En cas de conflit local sur des fichiers générés : `git stash` puis `git pull`, ou `git reset --hard origin/main` (⚠️ écrase les modifications locales).

## 4. Rebuild Docker
```bash
cd <chemin>/StockSpider
docker compose up -d --build            # rebuild + redémarre backend + frontend
docker compose logs -f backend          # suivre les logs (migration auto au démarrage)
docker compose ps                       # état des conteneurs
```
Au démarrage du backend, vérifier les logs :
```
✅ Connexion MySQL réussie !
✅ Migration des tables terminée !
🚀 Serveur StockSpider démarré sur le port 3002
```

## 5. Migrations SQL
Les colonnes d'état (5 états) et l'ENUM catégories sont migrés **automatiquement** au démarrage du backend. Les scripts financiers sont **manuels** et idempotents — à exécuter dans l'ordre, après backup :
```bash
mysql -u <USER> -p <BASE> < fin_01_migration.sql        # colonnes finance + product_cost_items
mysql -u <USER> -p <BASE> < fin_02_prix_composants.sql  # 31 prix composants
mysql -u <USER> -p <BASE> < fin_03_prix_modules.sql     # 11 modules (coût/Gros/marge)
```
Le seed initial (`seed_spider_data.sql`) est également idempotent (UPDATE par référence/nom).

### Vérifications post-migration
```sql
SELECT name, cost_price, recommended_price, margin, margin_percent
FROM products WHERE description='Module SpiderRoll' ORDER BY name;

SELECT COUNT(*) FROM components WHERE purchase_price > 0;   -- attendu : 31
SELECT COUNT(*) FROM product_components;                    -- attendu : 320
```

## 6. Procédure de déploiement complète (résumé)
```bash
cd <chemin>/StockSpider
mysqldump -u <USER> -p <BASE> > backup_$(date +%F).sql   # 1. backup
git pull origin main                                      # 2. code
docker compose up -d --build                              # 3. rebuild (migration auto)
mysql -u <USER> -p <BASE> < fin_03_prix_modules.sql       # 4. migrations manuelles si besoin
```

## 7. Bonnes pratiques
- **Toujours** sauvegarder avant migration ou rebuild.
- Externaliser les secrets dans un `.env` **non versionné** (ne pas committer `DB_PASSWORD`, `JWT_SECRET`).
- Programmer un `mysqldump` quotidien (cron) avec rotation.
- Tester les migrations sur une copie avant la production.
- Versionner toute nouvelle migration SQL dans le repo (fichier daté).
- Surveiller l'espace disque (images uploadées, logs Docker).

## 8. Dépannage

| Symptôme | Cause probable | Action |
|---|---|---|
| `connect ECONNREFUSED` au démarrage | `.env` pointe sur le mauvais host/port | utiliser la config du conteneur (`DB_HOST=mysql_central`, port 3306) |
| `Incorrect arguments to mysqld_stmt_execute` | type de paramètre incohérent dans une requête | vérifier les `?` (entiers vs chaînes) ; déjà corrigé en V1 |
| Pages finance vides / KPI masqués | migrations `fin_*.sql` non appliquées | exécuter `fin_01` → `fin_02` → `fin_03` |
| Colonne inconnue (`Unknown column`) | migration partielle | relancer la migration concernée |
| Frontend ne joint pas l'API | `VITE_API_URL` erroné au build | rebuild frontend avec le bon `VITE_API_URL` |
| 401 sur toutes les routes | token expiré/absent | se reconnecter |
| Migration ENUM échoue | ancienne version MySQL | vérifier la version, appliquer l'ALTER manuellement |

## 9. Comptes & rôles
Rôles : `admin` (tout), `manager` (gestion), `reader` (lecture). Création/gestion via *Administration → Utilisateurs* (réservé admin). Mots de passe hashés (bcrypt).
