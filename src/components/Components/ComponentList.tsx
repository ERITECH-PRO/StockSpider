import React, { useState } from 'react';
import { Edit2, Trash2, AlertTriangle, Package, Plus, Minus } from 'lucide-react';
import { Component, ComponentCategory } from '../../types';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import ConfirmDialog from '../UI/ConfirmDialog';
import ComponentModal from './ComponentModal';

interface ComponentListProps {
  searchQuery: string;
}

const ComponentList = ({ searchQuery }: ComponentListProps) => {
  const { components, deleteComponent, updateStock } = useData();
  const { showSuccess, showError } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price'>('name');
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; componentId: string; componentName: string }>({
    show: false,
    componentId: '',
    componentName: ''
  });
  const [editComponent, setEditComponent] = useState<Component | null>(null);
  const [stockAdjustments, setStockAdjustments] = useState<Record<string, number>>({});

  const categories: (ComponentCategory | 'all')[] = [
    'all', 'condensateur', 'resistance', 'relais', 'microcontroleur', 
    'connecteur', 'inducteur', 'diode', 'transistor', 'capteur', 'autre'
  ];

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
          return b.unitPrice - a.unitPrice;
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

  const handleStockAdjustment = (componentId: string, adjustment: number) => {
    const component = components.find(c => c.id === componentId);
    if (!component) return;

    const newQuantity = Math.max(0, component.quantity + adjustment);
    const reason = adjustment > 0 ? `Ajout manuel (+${adjustment})` : `Retrait manuel (${adjustment})`;
    
    updateStock(componentId, Math.abs(adjustment), adjustment > 0 ? 'in' : 'out', reason);
    
    if (adjustment > 0) {
      showSuccess('Stock mis à jour', `+${adjustment} ${component.designation}`);
    } else {
      showSuccess('Stock mis à jour', `${adjustment} ${component.designation}`);
    }
  };

  const handleQuickStockChange = (componentId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setStockAdjustments(prev => ({ ...prev, [componentId]: numValue }));
  };

  const applyStockAdjustment = (componentId: string) => {
    const adjustment = stockAdjustments[componentId];
    if (!adjustment || adjustment === 0) return;

    handleStockAdjustment(componentId, adjustment);
    setStockAdjustments(prev => ({ ...prev, [componentId]: 0 }));
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
                  <div className="p-2 bg-3s-blue/10 rounded-lg">
                    <Package className="w-5 h-5 text-3s-blue" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-3s-black font-inter">{component.name}</h3>
                    <p className="text-sm text-3s-gray-medium font-inter">{component.designation}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setEditComponent(component)}
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
                      {component.quantity <= component.minStock && (
                        <AlertTriangle className="w-4 h-4 text-3s-red" />
                      )}
                    </div>
                  </div>
                  
                  {/* Quick Stock Adjustment */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleStockAdjustment(component.id, -1)}
                      className="p-1 bg-3s-red text-white rounded hover:bg-3s-red-dark transition-colors"
                      disabled={component.quantity <= 0}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    
                    <input
                      type="number"
                      value={stockAdjustments[component.id] || ''}
                      onChange={(e) => handleQuickStockChange(component.id, e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          applyStockAdjustment(component.id);
                        }
                      }}
                      placeholder="±"
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center font-inter"
                    />
                    
                    <button
                      onClick={() => applyStockAdjustment(component.id)}
                      className="px-2 py-1 bg-3s-blue text-white text-xs rounded hover:bg-3s-blue-dark transition-colors font-inter"
                      disabled={!stockAdjustments[component.id]}
                    >
                      OK
                    </button>
                    
                    <button
                      onClick={() => handleStockAdjustment(component.id, 1)}
                      className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-3s-gray-medium font-inter">Stock minimum:</span>
                  <span className="text-sm font-medium font-inter">{component.minStock}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-3s-gray-medium font-inter">Prix unitaire:</span>
                  <span className="text-sm font-medium font-inter">{component.unitPrice.toFixed(2)}€</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-3s-gray-medium font-inter">Valeur stock:</span>
                  <span className="text-sm font-medium text-3s-blue font-inter">
                    {(component.quantity * component.unitPrice).toFixed(2)}€
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
        isOpen={!!editComponent}
        onClose={() => setEditComponent(null)}
        component={editComponent || undefined}
      />
    </div>
  );
};

export default ComponentList;