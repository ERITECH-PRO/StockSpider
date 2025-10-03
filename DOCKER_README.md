# StockSpider - Déploiement Docker

## Prérequis
- Docker Desktop (Windows/macOS) ou Docker Engine (Linux)
- Docker Compose v2

## Services
- api: serveur Express (port interne 3001)
- web: frontend (build Vite) servi par Nginx (port externe 5173)

## Lancer en local
```bash
# Construire et démarrer
docker compose up -d --build

# Voir les logs
docker compose logs -f

# Arrêter
docker compose down
```

Accès:
- Frontend: http://localhost:51734
- API: http://localhost:3002/api

## Variables d'environnement
Ajoutez vos variables DB dans `docker-compose.yml` (service `api`) ou via un fichier `.env` et `env_file`.

## Volumes
- `./server/uploads:/app/server/uploads` pour persister les images
- `./server/config-local.cjs:/app/server/config-local.cjs:ro` pour la config locale (lecture seule)

## Notes
- Le frontend utilise Nginx pour router `/api/` et `/uploads/` vers le service `api`.
- En prod, adaptez les ports et ajoutez TLS en amont (reverse proxy).
