import React, { useState } from 'react';
import { X, Box, Plus, Trash2, Upload } from 'lucide-react';
import { Product, ProductComponent } from '../../types';
import { useData } from '../../hooks/useData';
import BOMImport from './BOMImport';
import { BOMItem } from '../../utils/bomParser';
import { useToast } from '../../hooks/useToast';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
}

const ProductModal = ({ isOpen, onClose, product }: ProductModalProps) => {
  const { addProduct, updateProduct, components, addComponent } = useData();
  const { showSuccess, showInfo } = useToast();
  const isEdit = !!product;
  const [showBOMImport, setShowBOMImport] = useState(false);

  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    components: product?.components || [] as ProductComponent[],
    productionCost: product?.productionCost || 0,
    sellingPrice: product?.sellingPrice || 0,
    quantity: product?.quantity || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEdit && product) {
      updateProduct(product.id, formData);
    } else {
      addProduct(formData);
    }
    
    onClose();
  };

  const handleBOMImport = (bomItems: BOMItem[]) => {
    let newComponentsCount = 0;
    let existingComponentsCount = 0;
    const productComponents: ProductComponent[] = [];

    bomItems.forEach(bomItem => {
      // Vérifier si le composant existe déjà
      let existingComponent = components.find(c => 
        c.productNumber === bomItem.productNumber || 
        c.designation === bomItem.designation
      );

      if (!existingComponent) {
        // Créer un nouveau composant
        const newComponent = {
          designation: bomItem.designation,
          name: bomItem.name,
          productNumber: bomItem.productNumber,
          footprint: bomItem.footprint,
          quantity: 0, // Stock initial à 0 pour les composants importés
          unitPrice: bomItem.unitPrice,
          supplier: bomItem.supplier || '',
          category: bomItem.category,
          minStock: Math.ceil(bomItem.quantity * 0.2), // 20% de la quantité requise comme stock minimum
        };
        
        addComponent(newComponent);
        newComponentsCount++;
        
        // Simuler l'ID du nouveau composant (dans une vraie app, on récupérerait l'ID retourné)
        const componentId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        productComponents.push({
          componentId,
          quantity: bomItem.quantity
        });
      } else {
        existingComponentsCount++;
        productComponents.push({
          componentId: existingComponent.id,
          quantity: bomItem.quantity
        });
      }
    });

    // Mettre à jour les composants du produit
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, ...productComponents]
    }));

    // Afficher un résumé
    if (newComponentsCount > 0) {
      showSuccess(
        'BOM importée avec succès',
        `${newComponentsCount} nouveaux composants créés, ${existingComponentsCount} existants utilisés`
      );
    } else {
      showInfo(
        'BOM importée',
        `${existingComponentsCount} composants existants ajoutés au produit`
      );
    }

    setShowBOMImport(false);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddComponent = () => {
    const newComponent: ProductComponent = {
      componentId: '',
      quantity: 1
    };
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }));
  };

  const updateComponent = (index: number, field: keyof ProductComponent, value: any) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    }));
  };

  const removeComponent = (index: number) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  const calculateTotalCost = () => {
    const componentsCost = formData.components.reduce((total, pc) => {
      const component = components.find(c => c.id === pc.componentId);
      return total + (component ? component.unitPrice * pc.quantity : 0);
    }, 0);
    return componentsCost + formData.productionCost;
  };

  const getAvailableComponents = () => {
    return components.filter(c => c.quantity > 0);
  };

  if (!isOpen) return null;

  const totalCost = calculateTotalCost();
  const margin = formData.sellingPrice > 0 ? ((formData.sellingPrice - totalCost) / formData.sellingPrice * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Box className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEdit ? 'Modifier le produit' : 'Ajouter un produit'}
              </h2>
              <p className="text-sm text-gray-600">
                {isEdit ? 'Modifiez les informations du produit' : 'Créez un nouveau produit fini'}
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
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du produit *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Module Spider Basic"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantité en stock
              </label>
              <input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Description du produit..."
            />
          </div>

          {/* Components */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Composants</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBOMImport(true)}
                  className="bg-3s-blue hover:bg-3s-blue-dark text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span className="font-inter">Importer BOM</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddComponent}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-inter">Ajouter manuellement</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {formData.components.map((pc, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Composant
                      </label>
                      <select
                        value={pc.componentId}
                        onChange={(e) => updateComponent(index, 'componentId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Sélectionner un composant</option>
                        {getAvailableComponents().map(component => (
                          <option key={component.id} value={component.id}>
                            {component.designation} (Stock: {component.quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantité
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={pc.quantity}
                        onChange={(e) => updateComponent(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => removeComponent(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {formData.components.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-inter">Aucun composant ajouté</p>
                  <p className="text-sm font-inter">Importez une BOM ou ajoutez des composants manuellement</p>
                </div>
              )}
            </div>
          </div>

          {/* Costs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coût de production (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.productionCost}
                onChange={(e) => handleChange('productionCost', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Main-d'œuvre, douane, etc.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix de vente (€) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.sellingPrice}
                onChange={(e) => handleChange('sellingPrice', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col justify-end">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Coût total: {totalCost.toFixed(2)}€</p>
                <p className="text-sm font-medium text-gray-900">Marge: {margin}%</p>
              </div>
            </div>
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
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              {isEdit ? 'Mettre à jour' : 'Créer le produit'}
            </button>
          </div>
        </form>

        {/* BOM Import Modal */}
        <BOMImport
          isOpen={showBOMImport}
          onClose={() => setShowBOMImport(false)}
          onImport={handleBOMImport}
        />
      </div>
    </div>
  );
};

export default ProductModal;