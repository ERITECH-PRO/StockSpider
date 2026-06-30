# StockSpider — Documentation API (V1.0)

Base URL : `http://<host>:3002/api`

**Authentification** : toutes les routes sauf `/auth/login` et `/auth/register` exigent l'en-tête :
```
Authorization: Bearer <JWT>
Content-Type: application/json
```
Codes d'erreur usuels : `400` (requête invalide), `401` (non authentifié), `404` (introuvable), `409` (conflit métier, ex. stock insuffisant), `500` (erreur serveur). Réponse d'erreur : `{ "error": "message" }`.

---

## Auth — `/api/auth`

### POST /login
```json
// Requête
{ "email": "admin@stockspider.com", "password": "••••••" }
// Réponse 200
{ "token": "eyJhbGci...", "user": { "id": "1", "email": "admin@stockspider.com", "name": "Admin User", "role": "admin" } }
```

### POST /register
```json
// Requête
{ "name": "Jean", "email": "jean@ste.com", "password": "••••••", "role": "manager" }
// Réponse 201 : { "id": "...", "email": "...", "name": "...", "role": "manager" }
```

---

## Components — `/api/components`

### GET /
Liste tous les composants.
```json
// Réponse 200
[ { "id": "CMP1", "designation": "10kΩ", "name": "10kΩ", "productNumber": "RS-06K103JT",
    "footprint": "", "quantity": 10000, "unitPrice": 0, "purchasePrice": 0.0941,
    "supplier": "", "category": "resistance", "minStock": 1000 } ]
```

### POST /  — créer
```json
{ "designation": "100nF", "name": "100nF", "productNumber": "CC0603KRX7R9BB104",
  "footprint": "0603", "quantity": 5000, "unitPrice": 0, "supplier": "", "category": "condensateur", "minStock": 500 }
```

### PUT /:id — modifier · DELETE /:id — supprimer

### POST /:id/stock — mouvement de stock direct
```json
// Requête
{ "quantity": 100, "type": "in", "reason": "Réception commande #42" }
// type ∈ in | out | adjustment
```

### POST /upload-image — `multipart/form-data` (champ `image`)

---

## Products — `/api/products`

### GET /
Renvoie les produits avec leur BOM et les 5 états.
```json
[ { "id": "PR2", "name": "Spider S10", "productNumber": "S_10", "quantity": 40,
    "pcbRemaining": 40, "inProgress": 93, "assembledFinished": 40, "sold": 213, "defective": 14,
    "costPrice": 34.19, "recommendedPrice": 64.7, "margin": 30.51, "marginPercent": 47.16,
    "components": [ { "componentId": "CMP9", "quantity": 2, "designation": "100nF" } ] } ]
```

### POST / — créer (avec BOM)
```json
{ "name": "SpiderRoll 9X", "description": "Module", "productNumber": "9X",
  "components": [ { "componentId": "CMP9", "quantity": 2 } ],
  "pcbRemaining": 0, "inProgress": 0, "assembledFinished": 0, "sold": 0, "defective": 0 }
```

### PUT /:id — modifier (mise à jour partielle supportée) · DELETE /:id

### POST /:id/transition — transition d'état (transactionnel)
```json
// Requête
{ "action": "start", "quantity": 5 }
// action ∈ start | finish | sell | defect
// pour defect : { "action": "defect", "quantity": 2, "from": "assembled_finished" }

// Réponse 200 : le produit mis à jour (5 états recalculés)
{ "id": "PR2", "name": "Spider S10", "pcbRemaining": 35, "inProgress": 98, ... }
// Réponse 409 : { "error": "PCB restants insuffisants (40 disponible(s))" }
//             ou { "error": "Stock insuffisant : 100nF (besoin 10, dispo 4)" }
```

### POST /:id/assemble — assemblage direct (héritage, +1 produit fini)

---

## Procurement — `/api/procurement`

### GET / — composants à acheter (calcul backend)
Query optionnelle : `?plan={"PR2":500}` (plan de production, JSON encodé).
```json
// Réponse 200
{
  "rows": [ { "componentId": "CMP18", "designation": "1N4007W", "productNumber": "1N4007W",
              "category": "diode", "required": 14240, "available": 360, "toBuy": 13880,
              "unitPrice": 0.0937, "totalCost": 1300.6 } ],
  "summary": { "refsToOrder": 47, "refsSufficient": 13, "unitsToBuy": 158043, "totalCost": 0, "blockedCount": 9 },
  "blockedProducts": [ { "productId": "PR2", "name": "Spider S10", "target": 133, "missing": ["1uF","100nF"] } ]
}
```

---

## Finance — `/api/finance`

### GET /overview — coûts, marges, valeurs (calcul backend)
```json
{
  "rows": [ { "id": "PR2", "name": "Spider S10",
              "componentCost": 1.23, "costItems": [ { "label": "PCB", "amount": 0 } ], "costItemsTotal": 0,
              "costDetailB": 1.23, "costPrice": 34.19, "recommendedPrice": 64.7,
              "margin": 30.51, "marginPercent": 47.16, "assembledFinished": 40,
              "stockValueCost": 1367.6, "stockValueSale": 2588, "potentialBenefit": 1220.4, "priced": true } ],
  "summary": { "componentStockValue": 0, "finishedGoodsCostValue": 0, "finishedGoodsSaleValue": 0,
               "potentialBenefit": 0, "totalStockValue": 0, "avgMarginPercent": 60.3, "avgCostPerModule": 0,
               "pricedCount": 11, "lowMarginCount": 0, "deficitCount": 0,
               "mostProfitable": [ { "name": "SpiderRoll 6X V1", "marginPercent": 76.67, "margin": 396.85 } ],
               "deficit": [], "lowMargin": [] }
}
```

### PUT /cost-items/:productId — mettre à jour les postes de coût
```json
// Requête
{ "items": [ { "label": "PCB", "amount": 2.5 }, { "label": "Assemblage", "amount": 1.0 } ] }
// Réponse 200 : { "rows": [...], "summary": {...} }  (overview recalculé)
```

---

## Dashboard — `/api/dashboard`

### GET /overview — vue d'ensemble agrégée
```json
{
  "counts": { "totalComponents": 123, "totalProducts": 11, "lowStockAlerts": 30, "outOfStock": 5, "totalValue": 0 },
  "production": { "pcbRemaining": 585, "inProgress": 101, "assembledFinished": 91, "sold": 981, "defective": 62 },
  "categoryDistribution": [ { "category": "pcb", "count": 12 } ],
  "criticalComponents": [ { "id": "CMP8", "designation": "1000uF", "quantity": 0, "minStock": 1 } ],
  "recentMovements": [ { "id": "...", "type": "out", "quantity": 10, "reason": "...", "createdAt": "...", "componentName": "100nF" } ],
  "procurement": { "refsToOrder": 47, "unitsToBuy": 158043, "totalCost": 0, "blockedCount": 9 },
  "blockedProducts": [ { "productId": "PR2", "name": "Spider S10", "target": 133, "missing": ["..."] } ]
}
```

### GET /stats — KPI simples · GET /low-stock — composants critiques

---

## Stock — `/api/stock`

### GET /movements — historique (query : `limit`, `componentId`, `type`)
```json
[ { "id": "...", "componentId": "CMP9", "componentDesignation": "100nF", "type": "in",
    "quantity": 100, "unitPrice": 0, "reason": "Réception", "userId": "1", "userName": "Admin", "createdAt": "2026-..." } ]
```

### POST /movements — créer un mouvement (met à jour le stock)
```json
{ "componentId": "CMP9", "type": "in", "quantity": 100, "unitPrice": 0.02, "reason": "Réception commande #42" }
```

### GET /summary — agrégats stock + mouvements 7 jours

---

## Assembly — `/api/assembly` (héritage)
- `GET /` — liste des assemblages (table héritée).
- `POST /` — créer un enregistrement d'assemblage.
> Le workflow d'assemblage V1 passe désormais par `POST /api/products/:id/transition` (voir Products).

---

## Autres domaines (CRUD standard)

| Domaine | Routes |
|---|---|
| `/api/costs` | `GET /analysis`, `GET /profitability`, `GET /components` |
| `/api/suppliers` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `GET /:id/components` |
| `/api/clients` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` |
| `/api/chantiers` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` |
| `/api/bons-sortie` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` |
| `/api/users` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `GET /profile` |
| `/api/settings` | `GET /`, `PUT /`, `POST /upload-logo`, `GET /backup`, `GET /stats` |
