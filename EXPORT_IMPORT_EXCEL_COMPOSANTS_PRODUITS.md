# 📊 Export/Import Excel pour Composants et Produits finis - StockSpider

## 📋 Résumé des fonctionnalités

J'ai ajouté les fonctionnalités d'export et d'import Excel pour les pages "Composants" et "Produits finis", permettant de gérer efficacement les données en masse.

---

## ✅ Fonctionnalités implémentées

### **1. Page "Composants"** ✅

#### **A. Export Excel**
- **Format** : Fichier `.xlsx` avec toutes les données des composants
- **Colonnes exportées** :
  - Nom du composant
  - Désignation
  - Numéro de produit
  - Catégorie
  - Footprint
  - Quantité en stock
  - Prix unitaire (€)
  - Valeur totale (€)
  - Fournisseur
  - Lien d'achat
  - Date de création

#### **B. Import Excel**
- **Formats acceptés** : `.xlsx`, `.xls`
- **Colonnes reconnues** (avec variations de noms) :
  - Nom / nom / name
  - Désignation / designation
  - Numéro de produit / numero_produit / productNumber
  - Catégorie / categorie
  - Footprint / footprint
  - Quantité en stock / quantite / quantity
  - Prix unitaire (€) / prix_unitaire / unitPrice
  - Fournisseur / fournisseur / supplier
  - Lien d'achat / lien_achat / purchaseLink

#### **C. Logique d'import**
- **Détection de doublons** : Par numéro de produit ou nom + désignation
- **Mise à jour** : Composants existants mis à jour
- **Création** : Nouveaux composants créés
- **Résumé** : Affichage du nombre d'ajouts, mises à jour et erreurs

### **2. Page "Produits finis"** ✅

#### **A. Export Excel**
- **Format** : Fichier `.xlsx` avec toutes les données des produits
- **Colonnes exportées** :
  - Nom du produit
  - Description
  - Prix de vente (€)
  - Coût d'achat unitaire (€)
  - Coût d'achat total (€)
  - Marge (€)
  - Marge (%)
  - Nombre de composants
  - Liste des composants (désignation x quantité)
  - Date de création

#### **B. Import Excel**
- **Formats acceptés** : `.xlsx`, `.xls`
- **Colonnes reconnues** (avec variations de noms) :
  - Nom du produit / nom_produit / name
  - Description / description
  - Prix de vente (€) / prix_vente / sellingPrice

#### **C. Logique d'import**
- **Détection de doublons** : Par nom du produit
- **Mise à jour** : Produits existants mis à jour
- **Création** : Nouveaux produits créés
- **Composants** : Les composants doivent être ajoutés manuellement après l'import

---

## 🏗️ Architecture technique

### **1. Bibliothèque utilisée**
```typescript
import * as XLSX from 'xlsx';
```

### **2. Fonction d'export Excel**
```typescript
const exportToExcel = () => {
  const exportData = filteredComponents.map(component => ({
    'Nom': component.name,
    'Désignation': component.designation,
    'Numéro de produit': component.productNumber,
    'Catégorie': component.category,
    'Footprint': component.footprint || '',
    'Quantité en stock': component.quantity,
    'Prix unitaire (€)': Number(component.unitPrice || 0),
    'Valeur totale (€)': Number(component.unitPrice || 0) * component.quantity,
    'Fournisseur': component.supplier || '',
    'Lien d\'achat': (component as any).purchaseLink || '',
    'Date de création': new Date(component.createdAt).toLocaleDateString('fr-FR')
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Composants');
  
  // Ajuster la largeur des colonnes
  const colWidths = [
    { wch: 20 }, // Nom
    { wch: 25 }, // Désignation
    { wch: 20 }, // Numéro de produit
    { wch: 15 }, // Catégorie
    { wch: 12 }, // Footprint
    { wch: 12 }, // Quantité en stock
    { wch: 12 }, // Prix unitaire
    { wch: 12 }, // Valeur totale
    { wch: 15 }, // Fournisseur
    { wch: 20 }, // Lien d'achat
    { wch: 12 }  // Date de création
  ];
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `composants-${new Date().toISOString().split('T')[0]}.xlsx`);
  showSuccess('Export réussi', 'Fichier Excel généré avec succès');
};
```

### **3. Fonction d'import Excel**
```typescript
const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let addedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      jsonData.forEach((row: any, index: number) => {
        try {
          const componentData = {
            name: row['Nom'] || row['nom'] || '',
            designation: row['Désignation'] || row['designation'] || '',
            productNumber: row['Numéro de produit'] || row['numero_produit'] || row['productNumber'] || '',
            category: (row['Catégorie'] || row['categorie'] || 'autre') as ComponentCategory,
            footprint: row['Footprint'] || row['footprint'] || '',
            quantity: Number(row['Quantité en stock'] || row['quantite'] || row['quantity'] || 0),
            unitPrice: Number(row['Prix unitaire (€)'] || row['prix_unitaire'] || row['unitPrice'] || 0),
            supplier: row['Fournisseur'] || row['fournisseur'] || row['supplier'] || '',
            purchaseLink: row['Lien d\'achat'] || row['lien_achat'] || row['purchaseLink'] || ''
          };

          if (!componentData.name || !componentData.designation) {
            errorCount++;
            return;
          }

          // Vérifier si le composant existe déjà
          const existingComponent = components.find(c => 
            c.productNumber === componentData.productNumber || 
            (c.name === componentData.name && c.designation === componentData.designation)
          );

          if (existingComponent) {
            // Mettre à jour le composant existant
            const updatedComponent = {
              ...existingComponent,
              ...componentData,
              id: existingComponent.id
            };
            updateComponent(updatedComponent.id, updatedComponent);
            updatedCount++;
          } else {
            // Créer un nouveau composant
            const newComponent: Component = {
              id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              ...componentData,
              minStock: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            addComponent(newComponent);
            addedCount++;
          }
        } catch (error) {
          console.error(`Erreur ligne ${index + 2}:`, error);
          errorCount++;
        }
      });

      // Afficher le résumé
      if (errorCount > 0) {
        showError('Import terminé avec erreurs', `${addedCount} composants ajoutés, ${updatedCount} mis à jour, ${errorCount} erreurs`);
      } else {
        showSuccess('Import réussi', `${addedCount} composants ajoutés, ${updatedCount} mis à jour`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      showError('Erreur d\'import', 'Impossible de lire le fichier Excel');
    }
  };

  reader.readAsArrayBuffer(file);
};
```

---

## 🎨 Interface utilisateur

### **1. Page "Composants"**
- **Emplacement** : Boutons dans la barre de filtres (à droite)
- **Bouton Export** : Icône de téléchargement + "Exporter Excel"
- **Bouton Import** : Icône d'upload + "Importer Excel" (input file caché)

### **2. Page "Produits finis"**
- **Emplacement** : Section dédiée en haut de la page
- **Bouton Export** : Icône de téléchargement + "Exporter Excel"
- **Bouton Import** : Icône d'upload + "Importer Excel" (input file caché)

### **3. Styles**
- **Bouton Export** : Style primaire (bleu)
- **Bouton Import** : Style secondaire (gris)
- **Responsive** : Adaptation aux différentes tailles d'écran

---

## 🔄 Processus d'export/import

### **1. Export Excel**
1. **Clic sur le bouton** : Déclenchement de l'export
2. **Filtrage** : Seuls les composants/produits filtrés sont exportés
3. **Génération** : Création du fichier Excel avec colonnes ajustées
4. **Téléchargement** : Fichier téléchargé automatiquement
5. **Notification** : Confirmation de l'export réussi

### **2. Import Excel**
1. **Sélection du fichier** : Clic sur le bouton d'import
2. **Lecture** : Analyse du fichier Excel
3. **Validation** : Vérification des données
4. **Traitement** : Ajout/mise à jour des composants/produits
5. **Résumé** : Affichage du nombre d'opérations effectuées

---

## 📊 Exemples d'utilisation

### **Exemple 1 : Export des composants**
```
Fichier généré : composants-2025-01-09.xlsx
Contenu :
- 25 composants exportés
- Toutes les colonnes remplies
- Colonnes ajustées automatiquement
- Prêt pour modification et réimport
```

### **Exemple 2 : Import de nouveaux composants**
```
Fichier importé : nouveaux-composants.xlsx
Résultat :
- 15 composants ajoutés
- 3 composants mis à jour
- 0 erreurs
- Notification : "Import réussi : 15 composants ajoutés, 3 mis à jour"
```

### **Exemple 3 : Import avec erreurs**
```
Fichier importé : composants-avec-erreurs.xlsx
Résultat :
- 12 composants ajoutés
- 2 composants mis à jour
- 3 erreurs (données manquantes)
- Notification : "Import terminé avec erreurs : 12 composants ajoutés, 2 mis à jour, 3 erreurs"
```

---

## 🚀 Avantages obtenus

### **1. Gestion en masse**
- ✅ **Import rapide** : Ajout de nombreux composants/produits en une fois
- ✅ **Export complet** : Sauvegarde de toutes les données
- ✅ **Mise à jour** : Modification de données existantes
- ✅ **Sauvegarde** : Export pour sauvegarde externe

### **2. Flexibilité**
- ✅ **Formats multiples** : Support .xlsx et .xls
- ✅ **Colonnes flexibles** : Reconnaissance de différents noms de colonnes
- ✅ **Filtrage** : Export uniquement des données filtrées
- ✅ **Personnalisation** : Colonnes ajustées automatiquement

### **3. Robustesse**
- ✅ **Gestion d'erreurs** : Traitement des erreurs avec résumé
- ✅ **Validation** : Vérification des données obligatoires
- ✅ **Doublons** : Détection et mise à jour des éléments existants
- ✅ **Notifications** : Feedback utilisateur détaillé

---

## 📈 Impact sur l'efficacité

### **Avant l'implémentation :**
- ❌ **Ajout manuel** : Un composant/produit à la fois
- ❌ **Pas de sauvegarde** : Données non exportables
- ❌ **Pas de mise à jour en masse** : Modifications individuelles
- ❌ **Pas d'import** : Saisie manuelle obligatoire

### **Après l'implémentation :**
- ✅ **Import en masse** : Centaines d'éléments en une fois
- ✅ **Export complet** : Sauvegarde de toutes les données
- ✅ **Mise à jour en masse** : Modification de nombreux éléments
- ✅ **Workflow optimisé** : Import/export fluide

---

## 🎉 Résultat final

**Les fonctionnalités d'export/import Excel sont maintenant opérationnelles !**

### **Points clés :**
- ✅ **Export Excel** : Composants et produits finis exportables
- ✅ **Import Excel** : Ajout/mise à jour en masse
- ✅ **Interface intuitive** : Boutons clairs et accessibles
- ✅ **Gestion d'erreurs** : Traitement robuste des erreurs
- ✅ **Notifications** : Feedback utilisateur détaillé
- ✅ **Flexibilité** : Support de différents formats et noms de colonnes

**Les utilisateurs peuvent maintenant gérer efficacement leurs données en masse !** 🚀

---

## 🔮 Évolutions possibles

### **Fonctionnalités avancées :**
1. **Templates** : Modèles Excel pré-remplis
2. **Validation avancée** : Vérification de cohérence des données
3. **Import incrémental** : Mise à jour partielle des données
4. **Export personnalisé** : Sélection des colonnes à exporter

### **Améliorations techniques :**
1. **Compression** : Fichiers Excel optimisés
2. **Cache** : Mise en cache des exports
3. **Scheduling** : Export automatique programmé
4. **API** : Endpoints pour export/import via API

### **Intégrations :**
1. **ERP** : Synchronisation avec systèmes externes
2. **Fournisseurs** : Import direct depuis catalogues fournisseurs
3. **Cloud** : Stockage automatique dans le cloud
4. **Notifications** : Alertes par email des exports/imports

Le système est maintenant prêt pour une gestion professionnelle des données ! ✨
