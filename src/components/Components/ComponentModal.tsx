import React, { useState } from 'react';
import { X, Package } from 'lucide-react';
import { Component, ComponentCategory } from '../../types';
import { useData } from '../../hooks/useData';

interface ComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  component?: Component;
}

const ComponentModal = ({ isOpen, onClose, component }: ComponentModalProps) => {
  const { addComponent, updateComponent, suppliers } = useData();
  const isEdit = !!component;

  const [formData, setFormData] = useState({
    designation: component?.designation || '',
    name: component?.name || '',
    productNumber: component?.productNumber || '',
    footprint: component?.footprint || '',
    quantity: component?.quantity || 0,
    unitPrice: component?.unitPrice || 0,
    supplier: component?.supplier || '',
    category: component?.category || 'autre' as ComponentCategory,
    minStock: component?.minStock || 0,
  });

  const categories: ComponentCategory[] = [
    'condensateur', 'resistance', 'relais', 'microcontroleur',
    'connecteur', 'inducteur', 'diode', 'transistor', 'capteur', 'autre'
  ];

  const getCategoryLabel = (category: ComponentCategory) => {
    const labels = {
      'condensateur': 'Condensateur',
      'resistance': 'Résistance',
      'relais': 'Relais',
      'microcontroleur': 'Microcontrôleur',
      'connecteur': 'Connecteur',
      'inducteur': 'Inducteur',
      'diode': 'Diode',
      'transistor': 'Transistor',
      'capteur': 'Capteur',
      'autre': 'Autre'
    };
    return labels[category];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEdit && component) {
      updateComponent(component.id, formData);
    } else {
      addComponent(formData);
    }
    
    onClose();
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEdit ? 'Modifier le composant' : 'Ajouter un composant'}
              </h2>
              <p className="text-sm text-gray-600">
                {isEdit ? 'Modifiez les informations du composant' : 'Saisissez les informations du nouveau composant'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Désignation *
              </label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => handleChange('designation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Résistance 10kΩ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: R10K"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                N° produit *
              </label>
              <input
                type="text"
                required
                value={formData.productNumber}
                onChange={(e) => handleChange('productNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: R10K-0603"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Footprint *
              </label>
              <input
                type="text"
                required
                value={formData.footprint}
                onChange={(e) => handleChange('footprint', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: 0603"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantité en stock *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock minimum *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.minStock}
                onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix unitaire (€) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => handleChange('unitPrice', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fournisseur
            </label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) => handleChange('supplier', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Farnell, Mouser..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {isEdit ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComponentModal;