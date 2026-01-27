import React, { useState, useRef } from 'react';
import { Edit2, Trash2, Database, Package, Plus, Minus, Download, Upload } from 'lucide-react';
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
    <div className="space-y-8 p-6 bg-3s-gray-light min-h-full font-inter">
      {/* Premium Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-3s-blue/10 rounded-2xl shadow-inner">
              <Database className="w-6 h-6 text-3s-blue" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-3s-black uppercase tracking-tight">Répertoire Composants</h1>
              <p className="text-xs text-3s-gray-medium font-bold uppercase tracking-widest mt-1 opacity-70">Gestion technique de l'inventaire électronique</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100/50">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black text-3s-gray-medium uppercase tracking-widest mb-2 ml-1">Filtrer par Catégorie</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ComponentCategory | 'all')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all font-bold text-sm text-3s-black"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[150px]">
              <label className="block text-[10px] font-black text-3s-gray-medium uppercase tracking-widest mb-2 ml-1">Trier par</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'quantity' | 'price')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all font-bold text-sm text-3s-black"
              >
                <option value="name">Alphabétique (A-Z)</option>
                <option value="quantity">Quantité (Décroissant)</option>
                <option value="price">Valeur Unitaire</option>
              </select>
            </div>

            <div className="h-10 w-px bg-gray-100 mx-2 hidden md:block"></div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportToExcel}
                className="p-2.5 bg-3s-blue/5 text-3s-blue rounded-xl hover:bg-3s-blue hover:text-white transition-all border border-3s-blue/10 active:scale-95"
                title="Exporter vers Excel"
              >
                <Download className="w-5 h-5" />
              </button>

              <label className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all border border-green-100 cursor-pointer active:scale-95" title="Importer depuis Excel">
                <Upload className="w-5 h-5" />
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileImport} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredComponents.map((component) => {
          const stockStatus = getStockStatus(component);
          const totalValue = Number(component.unitPrice || 0) * component.quantity;

          return (
            <div key={component.id} className="group relative bg-white rounded-[2rem] p-1 shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden">
              {/* Card Header Illustration/Background */}
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-[0.03] group-hover:scale-150 transition-transform duration-700 ${stockStatus.color.replace('text', 'bg')}`}></div>

              <div className="relative p-6 bg-white rounded-[1.8rem]">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 shadow-inner group-hover:border-3s-blue/30 transition-colors overflow-hidden">
                      {component.imageUrl ? (
                        <img
                          src={getImageUrl(component.imageUrl)}
                          alt={component.name}
                          className="w-full h-full object-cover p-0.5 rounded-[14px]"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-3s-blue opacity-40 group-hover:scale-110 transition-transform" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${stockStatus.bg} ${stockStatus.color} border border-current opacity-70`}>{component.id}</span>
                        <span className="text-[10px] font-black text-3s-blue uppercase tracking-widest opacity-60 truncate">{getCategoryLabel(component.category)}</span>
                      </div>
                      <h3 className="font-black text-lg text-3s-black uppercase tracking-tight truncate leading-tight mt-0.5">{component.name}</h3>
                      <p className="text-xs font-bold text-3s-gray-medium truncate opacity-80">{component.designation}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <button onClick={() => handleEditComponent(component)} className="p-2 text-gray-300 hover:text-3s-blue hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteClick(component)} className="p-2 text-gray-300 hover:text-3s-red hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Stock Context Bar */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <span className="block text-[8px] font-black text-3s-gray-medium uppercase tracking-widest mb-1">Stock Actuel</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stockStatus.color.replace('text', 'bg')} ${component.quantity <= component.minStock ? 'animate-pulse' : ''}`}></div>
                      <span className={`text-xl font-black font-mono ${component.quantity <= component.minStock ? 'text-3s-red' : 'text-3s-black'}`}>
                        {component.quantity}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <span className="block text-[8px] font-black text-3s-gray-medium uppercase tracking-widest mb-1">Valeur Totale</span>
                    <span className="text-sm font-black text-3s-blue font-mono">{formatPrice(totalValue)}</span>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black text-3s-gray-medium uppercase tracking-tight">Référence Fourn.</span>
                      <p className="text-xs font-bold text-3s-black truncate">{component.productNumber || '—'}</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-[9px] font-black text-3s-gray-medium uppercase tracking-tight">Empreinte (Foot)</span>
                      <p className="text-xs font-bold text-3s-black truncate">{component.footprint || '—'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black text-3s-gray-medium uppercase tracking-tight">Fournisseur</span>
                      <p className="text-xs font-bold text-3s-black truncate">{component.supplier || 'N/A'}</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-[9px] font-black text-3s-gray-medium uppercase tracking-tight">Seuil Minimum</span>
                      <p className={`text-xs font-black ${component.quantity <= component.minStock ? 'text-orange-600' : 'text-3s-black'}`}>{component.minStock}</p>
                    </div>
                  </div>

                  {/* Quick Actions Footer */}
                  <div className="pt-6 border-t border-gray-50 mt-4 flex items-center gap-3">
                    <div className="flex-1 relative flex items-center">
                      <input
                        type="number"
                        min="1"
                        value={stockAdjustments[component.id] || ''}
                        onChange={(e) => handleQuickStockChange(component.id, e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') applyStockAdjustment(component.id); }}
                        placeholder="Qté à ajouter..."
                        className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-3s-blue outline-none transition-all"
                      />
                      <button
                        onClick={() => applyStockAdjustment(component.id)}
                        disabled={!stockAdjustments[component.id] || updatingStocks.has(component.id)}
                        className="absolute right-2 p-2 bg-3s-blue text-white rounded-xl shadow-lg hover:shadow-3s transition-all disabled:opacity-30 active:scale-95"
                      >
                        {updatingStocks.has(component.id) ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        disabled={component.quantity <= 0 || updatingStocks.has(component.id)}
                        onClick={() => handleStockAdjustment(component.id, -1)}
                        className="p-1.5 bg-gray-50 text-gray-400 hover:text-3s-red hover:bg-red-50 border border-gray-100 rounded-lg transition-all disabled:opacity-20"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={updatingStocks.has(component.id)}
                        onClick={() => handleStockAdjustment(component.id, 1)}
                        className="p-1.5 bg-gray-50 text-gray-400 hover:text-green-600 hover:bg-green-50 border border-gray-100 rounded-lg transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredComponents.length === 0 && (
        <div className="text-center py-24 bg-white/50 rounded-[3rem] border-2 border-dashed border-gray-100">
          <div className="p-6 bg-gray-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center border border-gray-100 shadow-inner">
            <Package className="w-12 h-12 text-gray-200" />
          </div>
          <h3 className="text-xl font-black text-3s-black uppercase tracking-tight mb-2">Aucun composant en vue</h3>
          <p className="text-sm font-bold text-3s-gray-medium max-w-sm mx-auto opacity-70">Ajustez vos filtres de recherche ou commencez par ajouter de nouveaux éléments au catalogue.</p>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="Désactivation Critique"
        message={`Attention : Vous êtes sur le point de supprimer de façon permanente le composant "${deleteConfirm.componentName}". Cette opération impactera l'inventaire global.`}
        confirmText="Supprimer Définitivement"
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