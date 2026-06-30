# StockSpider — Roadmap V2

Évolutions envisagées après la V1.0 stable. Priorisation indicative (P1 = prioritaire). Aucune n'est engagée à ce stade.

## Vue d'ensemble par priorité

| Priorité | Thème |
|---|---|
| P1 | Ordres de fabrication · Gestion des achats · Réception fournisseurs · Sauvegardes automatiques |
| P2 | Bons de commande · Gestion fournisseurs avancée · Inventaire · Multi-utilisateurs (rôles fins) |
| P3 | Numéros de série · Gestion SAV · Multi-entrepôts · Notifications |
| P4 | Comptabilité · Statistiques avancées |

---

## 1. Ordres de fabrication (P1)
Formaliser un OF : produit, quantité cible, échéance, statut. Génère automatiquement la réservation des composants, le besoin d'achat, et pilote les transitions de production. Table `manufacturing_orders` + liaison aux mouvements.

## 2. Gestion des achats (P1)
Cycle d'achat complet : du besoin (procurement) → demande d'achat → validation → commande. Suivi des quantités commandées vs reçues.

## 3. Réception fournisseurs (P1)
Écran de réception : pointer les quantités reçues d'une commande, mise à jour automatique du stock + mouvements `in`, gestion des écarts.

## 4. Sauvegardes automatiques (P1)
`mysqldump` planifié (cron) avec rotation et stockage externe ; bouton d'export manuel ; restauration guidée. Supervision (alerte si échec).

## 5. Bons de commande (P2)
Génération de bons de commande fournisseurs (PDF), à partir de la liste « composants à acheter », avec coordonnées fournisseur et conditions.

## 6. Gestion fournisseurs avancée (P2)
Multi-fournisseurs par composant, prix et délais par fournisseur, historique des prix (multi-arrivages), choix du meilleur fournisseur.

## 7. Inventaire (P2)
Campagnes d'inventaire physique : comptage, écarts, ajustements groupés tracés dans `stock_movements`.

## 8. Multi-utilisateurs / rôles fins (P2)
Permissions par écran et par action (lecture/écriture/validation), journal d'audit des actions utilisateurs.

## 9. Numéros de série (P3)
Traçabilité unitaire des modules assemblés (numéro de série, date, lot, composants), recherche par n° de série.

## 10. Gestion SAV (P3)
Suivi des retours/pannes : ticket SAV lié à un module (n° de série), diagnostic, réparation/remplacement, statistiques de fiabilité (complète la colonne `defective`).

## 11. Multi-entrepôts (P3)
Stock par emplacement/entrepôt, transferts inter-entrepôts, visibilité consolidée.

## 12. Notifications (P3)
Alertes (stock critique, rupture, OF en retard, marge faible) par email/in-app, centre de notifications.

## 13. Comptabilité (P4)
Export comptable, valorisation du stock (FIFO/CMUP), intégration facturation, journal des ventes.

## 14. Statistiques avancées (P4)
Tableaux de bord analytiques : tendances de production, rotation des stocks, prévisions de besoin, rentabilité dans le temps, comparaison périodes.

---

## Chantiers techniques transverses (préalables recommandés)
- Système de **migrations versionnées** + CI/CD.
- **Tests** automatisés (backend + frontend).
- **Sécurité** : secrets hors repo, durcissement JWT, HTTPS.
- **Performance** : index SQL, pagination serveur, cache des agrégats.
- Nettoyage des **tables héritées** non utilisées.
