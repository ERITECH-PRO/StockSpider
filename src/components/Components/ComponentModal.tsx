import React, { useState, useEffect } from 'react';
import { X, Package, Upload } from 'lucide-react';
import { Component, ComponentCategory } from '../../types';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import ComponentImportModal from './ComponentImportModal';

interface ComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  component?: Component;
}

const ComponentModal = ({ isOpen, onClose, component }: ComponentModalProps) => {
  const { addComponent, updateComponent, suppliers } = useData();
  const { showSuccess } = useToast();
  const isEdit = !!component;
  const [showImportModal, setShowImportModal] = useState(false);

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

  // Mettre à jour le formulaire quand le composant change
  useEffect(() => {
    console.log('🔧 ComponentModal - Component reçu:', component);
    
    if (component) {
      console.log('🔧 ComponentModal - Pré-remplissage du formulaire avec:', {
        designation: component.designation,
        name: component.name,
        productNumber: component.productNumber,
        quantity: component.quantity,
        unitPrice: component.unitPrice
      });
      
      setFormData({
        designation: component.designation || '',
        name: component.name || '',
        productNumber: component.productNumber || '',
        footprint: component.footprint || '',
        quantity: component.quantity || 0,
        unitPrice: component.unitPrice || 0,
        supplier: component.supplier || '',
        category: component.category || 'autre' as ComponentCategory,
        minStock: component.minStock || 0,
      });
    } else {
      console.log('🔧 ComponentModal - Réinitialisation du formulaire pour nouveau composant');
      // Réinitialiser le formulaire pour un nouveau composant
      setFormData({
        designation: '',
        name: '',
        productNumber: '',
        footprint: '',
        quantity: 0,
        unitPrice: 0,
        supplier: '',
        category: 'autre' as ComponentCategory,
        minStock: 0,
      });
    }
  }, [component]);

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
      showSuccess('Composant mis à jour', `${formData.designation} a été mis à jour avec succès`);
    } else {
      addComponent(formData);
      showSuccess('Composant ajouté', `${formData.designation} a été ajouté avec succès`);
    }
    
    // Reset form
    setFormData({
      designation: '',
      name: '',
      productNumber: '',
      footprint: '',
      quantity: 0,
      unitPrice: 0,
      supplier: '',
      category: 'autre' as ComponentCategory,
      minStock: 0,
    });
    
    onClose();
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-3s-blue/10 rounded-lg shadow-3s">
              <Package className="w-5 h-5 text-3s-blue" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-3s-black font-inter">
                {isEdit ? 'Modifier le composant' : 'Ajouter un composant'}
              </h2>
              <p className="text-sm text-3s-gray-medium font-inter">
                {isEdit ? 'Modifiez les informations du composant' : 'Saisissez les informations du nouveau composant'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Import Button - Only show for new components */}
          {!isEdit && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-900">Importation en masse</h3>
                  <p className="text-sm text-blue-700">
                    Importez plusieurs composants depuis un fichier BOM (Excel, CSV, TXT)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Importer BOM
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                Désignation *
              </label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => handleChange('designation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
                placeholder="Ex: Résistance 10kΩ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                Nom *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
                placeholder="Ex: R10K"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                N° produit *
              </label>
              <input
                type="text"
                required
                value={formData.productNumber}
                onChange={(e) => handleChange('productNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
                placeholder="Ex: R10K-0603"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                Footprint *
              </label>
              <input
                type="text"
                required
                value={formData.footprint}
                onChange={(e) => handleChange('footprint', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
                placeholder="Ex: 0603"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                Quantité en stock *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                Stock minimum *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.minStock}
                onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                Prix unitaire (€) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => handleChange('unitPrice', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                Catégorie *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
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
            <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
              Fournisseur
            </label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) => handleChange('supplier', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
              placeholder="Ex: Farnell, Mouser..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-3s-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-3s-primary"
            >
              {isEdit ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>

        {/* Import Modal */}
        <ComponentImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
        />
      </div>
    </div>
  );
};

export default ComponentModal;