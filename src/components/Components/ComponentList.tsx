import React, { useState, useRef } from 'react';
import { Edit2, Trash2, AlertTriangle, Package, Plus, Minus, Download, Upload } from 'lucide-react';
import { Component, ComponentCategory } from '../../types';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import { getImageUrl } from '../../services/api';
import ConfirmDialog from '../UI/ConfirmDialog';
import ComponentModal from './ComponentModal';
import * as XLSX from 'xlsx';
import { formatPrice } from '../../utils/priceFormatter';

interface ComponentListProps {
  searchQuery: string;
}

const ComponentList = ({ searchQuery }: ComponentListProps) => {
  const { components, deleteComponent, updateStock, addComponent, updateComponent } = useData();
  const { showSuccess, showError } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price'>('name');
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; componentId: string; componentName: string }>({
    show: false,
    componentId: '',
    componentName: ''
  });
  const [editModal, setEditModal] = useState<{ show: boolean; component: Component | null }>({
    show: false,
    component: null
  });
  const [stockAdjustments, setStockAdjustments] = useState<Record<string, number>>({});
  const [updatingStocks, setUpdatingStocks] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: (ComponentCategory | 'all')[] = [
    'all', 'condensateur', 'resistance', 'relais', 'microcontroleur', 
    'connecteur', 'inducteur', 'diode', 'transistor', 'capteur', 'autre'
  ];

  // Fonction pour générer un ID court pour les composants
  const generateShortComponentId = (existingComponents: Component[]): string => {
    // Trouver le plus grand numéro existant
    let maxNumber = 0;
    existingComponents.forEach(comp => {
      if (comp.id.startsWith('CP')) {
        const number = parseInt(comp.id.substring(2));
        if (!isNaN(number) && number > maxNumber) {
          maxNumber = number;
        }
      }
    });
    
    // Retourner le prochain ID disponible
    return `CP${maxNumber + 1}`;
  };

  // Fonction d'export Excel
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

  // Fonction d'import Excel
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
                id: existingComponent.id // Garder l'ID existant
              };
              updateComponent(updatedComponent.id, updatedComponent);
              updatedCount++;
            } else {
              // Créer un nouveau composant avec ID court
              const newId = generateShortComponentId(components);
              const newComponent: Component = {
                id: newId,
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

        // Réinitialiser l'input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Erreur lors de l\'import:', error);
        showError('Erreur d\'import', 'Impossible de lire le fichier Excel');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const filteredComponents = components
    .filter(component => {
      const matchesSearch = component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           component.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           component.productNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || component.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'quantity':
          return b.quantity - a.quantity;
        case 'price':
          return Number(b.unitPrice) - Number(a.unitPrice);
        default:
          return 0;
      }
    });

  const getCategoryLabel = (category: ComponentCategory | 'all') => {
    const labels = {
      'all': 'Toutes',
      'condensateur': 'Condensateurs',
      'resistance': 'Résistances',
      'relais': 'Relais',
      'microcontroleur': 'Microcontrôleurs',
      'connecteur': 'Connecteurs',
      'inducteur': 'Inducteurs',
      'diode': 'Diodes',
      'transistor': 'Transistors',
      'capteur': 'Capteurs',
      'autre': 'Autres'
    };
    return labels[category];
  };

  const getStockStatus = (component: Component) => {
    if (component.quantity === 0) return { color: 'text-red-600', bg: 'bg-red-100', label: 'Rupture' };
    if (component.quantity <= component.minStock) return { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Critique' };
    return { color: 'text-green-600', bg: 'bg-green-100', label: 'Normal' };
  };

  const handleDeleteClick = (component: Component) => {
    setDeleteConfirm({
      show: true,
      componentId: component.id,
      componentName: component.designation
    });
  };

  const handleDeleteConfirm = () => {
    deleteComponent(deleteConfirm.componentId);
    showSuccess('Composant supprimé', `${deleteConfirm.componentName} a été supprimé avec succès`);
    setDeleteConfirm({ show: false, componentId: '', componentName: '' });
  };

  const handleEditComponent = (component: Component) => {
    setEditModal({ show: true, component });
  };

  const handleCloseEditModal = () => {
    setEditModal({ show: false, component: null });
  };

  const handleStockAdjustment = async (componentId: string, adjustment: number) => {
    const component = components.find(c => c.id === componentId);
    if (!component) return;

    console.log('🔧 Ajustement stock:', {
      componentId,
      componentName: component.designation,
      currentStock: component.quantity,
      adjustment,
      newStock: component.quantity + adjustment
    });

    setUpdatingStocks(prev => new Set(prev).add(componentId));
    
    try {
      const reason = adjustment > 0 ? `Ajout manuel (+${adjustment})` : `Retrait manuel (${adjustment})`;
      
      await updateStock(componentId, Math.abs(adjustment), adjustment > 0 ? 'in' : 'out', reason);
      
      if (adjustment > 0) {
        showSuccess('Stock mis à jour', `+${adjustment} ${component.designation}`);
      } else {
        showSuccess('Stock mis à jour', `${adjustment} ${component.designation}`);
      }
    } catch (error) {
      console.error('❌ Erreur ajustement stock:', error);
      showError('Erreur', 'Impossible de mettre à jour le stock');
    } finally {
      setUpdatingStocks(prev => {
        const newSet = new Set(prev);
        newSet.delete(componentId);
        return newSet;
      });
    }
  };

  const handleQuickStockChange = (componentId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setStockAdjustments(prev => ({ ...prev, [componentId]: numValue }));
  };

  const applyStockAdjustment = async (componentId: string) => {
    const newValue = stockAdjustments[componentId];
    if (newValue === undefined || newValue < 0) {
      showError('Erreur', 'Veuillez saisir une valeur valide (nombre entier ≥ 0)');
      return;
    }

    const component = components.find(c => c.id === componentId);
    if (!component) return;

    const currentStock = component.quantity;
    
    if (newValue === 0) {
      showError('Information', 'Veuillez saisir une valeur à ajouter (supérieure à 0)');
      setStockAdjustments(prev => ({ ...prev, [componentId]: 0 }));
      return;
    }

    setUpdatingStocks(prev => new Set(prev).add(componentId));
    
    try {
      const reason = `Ajout manuel (+${newValue})`;
      
      // Utiliser le type 'in' pour ajouter la valeur au stock existant
      await updateStock(componentId, newValue, 'in', reason);
      showSuccess('Stock mis à jour', `${component.designation}: ${currentStock} + ${newValue} = ${currentStock + newValue}`);
      
      // Réinitialiser le champ
      setStockAdjustments(prev => ({ ...prev, [componentId]: 0 }));
    } finally {
      setUpdatingStocks(prev => {
        const newSet = new Set(prev);
        newSet.delete(componentId);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-6 p-6 bg-3s-gray-light min-h-full">
      {/* Filters */}
      <div className="card-3s p-4 animate-fade-in">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-3s-black mb-1 font-inter">Catégorie</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ComponentCategory | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {getCategoryLabel(category)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-3s-black mb-1 font-inter">Trier par</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'quantity' | 'price')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200"
            >
              <option value="name">Nom</option>
              <option value="quantity">Quantité</option>
              <option value="price">Prix</option>
            </select>
          </div>

          {/* Boutons d'export/import */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={exportToExcel}
              className="btn-3s-primary px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="font-inter">Exporter Excel</span>
            </button>
            
            <label className="btn-3s-secondary px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span className="font-inter">Importer Excel</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredComponents.map((component) => {
          const stockStatus = getStockStatus(component);
          
          return (
            <div key={component.id} className="card-3s p-6 animate-fade-in hover:shadow-card-hover transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-3s-blue/10 rounded-lg relative w-12 h-12 flex items-center justify-center">
                    {component.imageUrl ? (
                      <img
                        src={getImageUrl(component.imageUrl)}
                        alt={component.designation}
                        className="w-8 h-8 object-cover rounded border border-gray-200"
                        onError={(e) => {
                          // Fallback vers l'icône si l'image ne charge pas
                          e.currentTarget.style.display = 'none';
                          const fallbackIcon = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallbackIcon) {
                            fallbackIcon.style.display = 'block';
                          }
                        }}
                      />
                    ) : null}
                    <Package 
                      className={`w-5 h-5 text-3s-blue ${component.imageUrl ? 'hidden' : 'block'}`} 
                      style={{ display: component.imageUrl ? 'none' : 'block' }}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-3s-black font-inter">{component.name}</h3>
                    <p className="text-sm text-3s-gray-medium font-inter">{component.designation}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleEditComponent(component)}
                    className="p-1 text-gray-400 hover:text-3s-blue hover:bg-blue-50 rounded transition-all duration-200"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(component)}
                    className="p-1 text-gray-400 hover:text-3s-red hover:bg-red-50 rounded transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-3s-gray-medium font-inter">N° produit:</span>
                  <span className="text-sm font-medium font-inter">{component.productNumber}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-3s-gray-medium font-inter">Footprint:</span>
                  <span className="text-sm font-medium font-inter">{component.footprint}</span>
                </div>
                
                {/* Stock Management */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-3s-gray-medium font-inter">Stock actuel:</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold font-inter ${
                        component.quantity <= component.minStock ? 'text-3s-red' : 'text-3s-black'
                      }`}>
                        {component.quantity}
                      </span>
                      <>
                        {component.quantity <= component.minStock && (
                          <AlertTriangle className="w-4 h-4 text-3s-red" />
                        )}
                      </>
                    </div>
                  </div>
                  
                  {/* Quick Stock Adjustment */}
                  <div className="space-y-2 mt-2">
                    {/* Boutons +/- */}
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleStockAdjustment(component.id, -1)}
                        className="p-1.5 bg-3s-red text-white rounded hover:bg-3s-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={component.quantity <= 0 || updatingStocks.has(component.id)}
                        title="Diminuer le stock de 1"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={() => handleStockAdjustment(component.id, 1)}
                        className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={updatingStocks.has(component.id)}
                        title="Augmenter le stock de 1"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    
                    {/* Saisie manuelle */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={stockAdjustments[component.id] || ''}
                        onChange={(e) => handleQuickStockChange(component.id, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            applyStockAdjustment(component.id);
                          }
                        }}
                        placeholder="Quantité à ajouter"
                        disabled={updatingStocks.has(component.id)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded text-center font-inter focus:ring-2 focus:ring-3s-blue focus:border-3s-blue disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      
                      <button
                        onClick={() => applyStockAdjustment(component.id)}
                        className="px-3 py-1 bg-3s-blue text-white text-xs rounded hover:bg-3s-blue-dark transition-colors font-inter disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={stockAdjustments[component.id] === undefined || stockAdjustments[component.id] === 0 || updatingStocks.has(component.id)}
                        title="Appliquer la nouvelle valeur de stock"
                      >
                        {updatingStocks.has(component.id) ? '...' : 'OK'}
                      </button>
                    </div>
                    
                    {/* Aide contextuelle */}
                    <div className="text-xs text-gray-500 text-center font-inter">
                      Saisissez la quantité à ajouter au stock actuel
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-3s-gray-medium font-inter">Stock minimum:</span>
                  <span className="text-sm font-medium font-inter">{component.minStock}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-3s-gray-medium font-inter">Prix unitaire:</span>
                  <span className="text-sm font-medium font-inter">{formatPrice(component.unitPrice)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-3s-gray-medium font-inter">Valeur stock:</span>
                  <span className="text-sm font-medium text-3s-blue font-inter">
                    {formatPrice(component.quantity * (Number(component.unitPrice) || 0))}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-3s-gray-medium font-inter">Fournisseur:</span>
                  <span className="text-sm font-medium font-inter">{component.supplier || 'N/A'}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-3s-gray-medium font-inter">Statut:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-inter ${stockStatus.color} ${stockStatus.bg}`}>
                    {stockStatus.label}
                  </span>
                </div>
                
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-xs text-3s-gray-medium capitalize font-inter">
                    {getCategoryLabel(component.category)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredComponents.length === 0 && (
        <div className="text-center py-12">
          <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Package className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-3s-black mb-2 font-inter">Aucun composant trouvé</h3>
          <p className="text-3s-gray-medium font-inter">Essayez de modifier vos critères de recherche ou d'ajouter des composants.</p>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="Supprimer le composant"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteConfirm.componentName}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ show: false, componentId: '', componentName: '' })}
      />

      {/* Edit Component Modal */}
      <ComponentModal
        isOpen={editModal.show}
        onClose={handleCloseEditModal}
        component={editModal.component || undefined}
      />
    </div>
  );
};

export default ComponentList;