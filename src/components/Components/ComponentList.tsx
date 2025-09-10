import React, { useState } from 'react';
import { Edit2, Trash2, AlertTriangle, Package } from 'lucide-react';
import { Component, ComponentCategory } from '../../types';
import { useData } from '../../hooks/useData';

interface ComponentListProps {
  searchQuery: string;
}

const ComponentList = ({ searchQuery }: ComponentListProps) => {
  const { components, deleteComponent } = useData();
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price'>('name');

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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ComponentCategory | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {getCategoryLabel(category)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trier par</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'quantity' | 'price')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <div key={component.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{component.name}</h3>
                    <p className="text-sm text-gray-600">{component.designation}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button className="p-1 text-gray-400 hover:text-blue-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteComponent(component.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">N° produit:</span>
                  <span className="text-sm font-medium">{component.productNumber}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Footprint:</span>
                  <span className="text-sm font-medium">{component.footprint}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Stock:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{component.quantity}</span>
                    {component.quantity <= component.minStock && (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Prix unitaire:</span>
                  <span className="text-sm font-medium">{component.unitPrice.toFixed(2)}€</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Fournisseur:</span>
                  <span className="text-sm font-medium">{component.supplier}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Statut:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color} ${stockStatus.bg}`}>
                    {stockStatus.label}
                  </span>
                </div>
                
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500 capitalize">
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
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun composant trouvé</h3>
          <p className="text-gray-600">Essayez de modifier vos critères de recherche ou d'ajouter des composants.</p>
        </div>
      )}
    </div>
  );
};

export default ComponentList;