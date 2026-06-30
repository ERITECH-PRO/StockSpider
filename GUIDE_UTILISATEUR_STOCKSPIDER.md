# StockSpider — Guide utilisateur (V1.0)

Manuel d'utilisation des fonctionnalités quotidiennes. Toutes les données affichées proviennent en temps réel de la base MySQL.

## Connexion
Saisir email + mot de passe. La session reste active (token). Le menu latéral gauche regroupe les écrans par section : Pilotage, Inventaire, Production, Suivi production, Logistique & Ventes, Administration.

---

## 1. Dashboard
Vue d'ensemble de l'activité.

```
┌─────────────────────────────────────────────────────────┐
│ [Composants] [Produits finis] [Alertes stock] [Valeur]  │  ← KPI principaux
├─────────────────────────────────────────────────────────┤
│ Production SpiderRoll : PCB | En cours | Assemblé | …    │  ← 5 états + barre
├─────────────────────────────────────────────────────────┤
│ [Valeur stock][Coût comp.][Bénéf. potentiel][Marge moy.]│  ← KPI financiers
├──────────────────────────┬──────────────────────────────┤
│ Composants par catégorie │ Produits bloqués (manque)    │
│ Stock critique           │ Mouvements récents           │
└──────────────────────────┴──────────────────────────────┘
```
À retenir : les « produits bloqués » sont ceux dont la production est impossible faute de composants ; les KPI financiers n'apparaissent qu'après application des scripts de prix.

## 2. Gestion des composants
Menu *Inventaire → Composants*.
- Liste filtrable par **catégorie**, recherche, tri, badges de stock (Normal / Critique / Rupture).
- Bouton **+ Ajouter** : créer un composant (désignation, référence, catégorie, stock, prix, fournisseur, image).
- **Import Excel/CSV** : charger une nomenclature ou une liste de composants (le format type est téléchargeable).
- Chaque composant affiche stock, seuil minimum, prix unitaire et catégorie.

## 3. Gestion des produits
Menu *Inventaire → Stocks Produits finis* et *Production → Catalogue Modèles*.
- Fiche produit : nom, référence, description, image, **nomenclature (BOM)** et les **5 états** de production.
- Édition de la BOM : ajout manuel de composants ou import d'une BOM.
- Le coût de production est recalculé automatiquement à partir de la BOM.

## 4. Production & 5. Assemblage
Menu *Production → Assemblage en cours*.
Chaque produit affiche son cycle de vie (PCB / En cours / Assemblé / Vendu / Panne) et 4 actions :

| Bouton | Effet |
|---|---|
| **Démarrer** | passe des PCB en « en cours » et **consomme les composants** (échoue si stock insuffisant) |
| **Terminer** | passe « en cours » en « assemblé » |
| **Vendre** | passe « assemblé » en « vendu » |
| **Panne** | déclasse en « défectueux » (depuis en cours ou assemblé) |

Une fenêtre demande la **quantité** (bornée au stock disponible). La base est mise à jour immédiatement et un message confirme (ou explique l'erreur).

Le suivi détaillé est consultable via *Suivi production → Produits vendus / défectueux / PCB restants* : chaque vue propose recherche, statistiques et **export Excel**.

## 6. Achats (réapprovisionnement)
Menu *Production → Réappro. besoins*.
- La liste des **composants à acheter** est calculée automatiquement : `besoin (BOM × modules à produire) − stock`.
- Indicateurs : références à commander, pièces, coût estimé.
- **Plan de production** (optionnel) : saisir une quantité par module pour simuler un besoin ; sinon la base = PCB + en cours.
- Bouton **Valider l'achat** : réceptionne le composant (incrémente le stock + mouvement).
- **Export Excel** de la liste.

## 7. Finances — Coût de revient
Menu *Pilotage → Coût de revient*.
Pour chaque module : coût composants (depuis la BOM), postes éditables **PCB / Assemblage / Test / Emballage / Autres**, total détaillé (méthode B), coût « Achat D/TTC » (méthode A), prix **Gros**, **marge** et **marge %**. Modifier un poste puis **Enregistrer** met à jour la base et recalcule.

## 8. Analyse financière
Menu *Pilotage → Analyse financière*.
- KPI : valeur stock totale, valeur composants, bénéfice potentiel, marge moyenne, coût moyen/module, produits faible marge, déficitaires.
- Graphique **marge % par produit**.
- Listes **produits les plus rentables** et **déficitaires**.

## Mouvements de stock
Menu *Inventaire → Mouvements*.
- Historique complet (entrées / sorties / ajustements) depuis MySQL.
- Formulaire pour enregistrer un mouvement (composant, type, quantité, raison, prix) : le stock est mis à jour côté serveur.

## Logistique & Ventes
Bons de sortie (impression), Clients, Chantiers, Fournisseurs : gestion CRUD classique.

## Conseils d'usage
- Toujours **Rafraîchir** une page après une action concurrente (boutons dédiés).
- Les exports Excel servent aux commandes fournisseurs et au reporting.
- Les valeurs financières dépendent des prix saisis ; un composant sans prix compte pour 0.
