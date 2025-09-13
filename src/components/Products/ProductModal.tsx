import React, { useState, useEffect } from 'react';
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
  const { addProduct, updateProduct, components, addComponent, reloadComponents } = useData();
  const { showSuccess, showInfo, showError } = useToast();
  const isEdit = !!product;
  const [showBOMImport, setShowBOMImport] = useState(false);

  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    components: product?.components || [] as ProductComponent[],
    productionCost: Number(product?.productionCost) || 0,
    productNumber: product?.productNumber || '',
  });

  // Mettre à jour le formulaire quand le produit change
  useEffect(() => {
    console.log('🔧 ProductModal - Product reçu:', product);
    
    if (product) {
      console.log('🔧 ProductModal - Pré-remplissage du formulaire avec:', {
        name: product.name,
        description: product.description,
        components: product.components?.length || 0,
        productionCost: product.productionCost,
        productNumber: product.productNumber
      });
      
      setFormData({
        name: product.name || '',
        description: product.description || '',
        components: product.components || [],
        productionCost: Number(product.productionCost) || 0,
        productNumber: product.productNumber || '',
      });
    } else {
      console.log('🔧 ProductModal - Réinitialisation du formulaire pour nouveau produit');
      // Réinitialiser le formulaire pour un nouveau produit
      setFormData({
        name: '',
        description: '',
        components: [],
        productionCost: 0,
        productNumber: '',
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation côté client
    if (!formData.name || !formData.name.trim()) {
      showError('Erreur', 'Le nom du produit est requis');
      return;
    }
    
    
    // S'assurer que les valeurs numériques sont bien définies
    const dataToSend = {
      ...formData,
      productionCost: Number(formData.productionCost) || 0,
      quantity: 0, // Quantité fixée à 0 car non utilisée
      sellingPrice: 0, // Prix de vente fixé à 0 car non utilisé
    };
    
    // Debug: afficher les données envoyées
    console.log('Données du formulaire:', dataToSend);
    
    try {
      if (isEdit && product) {
        await updateProduct(product.id, dataToSend);
        showSuccess('Produit mis à jour', `${dataToSend.name} a été modifié avec succès`);
      } else {
        await addProduct(dataToSend);
        showSuccess('Produit créé', `${dataToSend.name} a été créé avec succès`);
      }
      
      onClose();
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      // L'erreur est déjà gérée dans les fonctions addProduct/updateProduct
    }
  };

  const handleBOMImport = async (bomItems: BOMItem[]) => {
    let newComponentsCount = 0;
    let existingComponentsCount = 0;
    let updatedComponentsCount = 0;
    const productComponents: ProductComponent[] = [];
    const createdComponentIds: string[] = [];
    const quantityIncrements: Record<string, number> = {};

    // console.log('📥 Import BOM:', bomItems.length, 'éléments');
    // console.log('📦 Composants disponibles avant import:', components.length);

    for (const bomItem of bomItems) {
      // Vérifier si le composant existe déjà (recherche plus intelligente)
      let existingComponent = components.find(c => 
        c.productNumber === bomItem.productNumber || 
        c.designation === bomItem.designation ||
        (c.name === bomItem.name && c.footprint === bomItem.footprint)
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
        
        try {
          // console.log('🔧 Création composant:', bomItem.designation);
          const createdComponent = await addComponent(newComponent);
          createdComponentIds.push(createdComponent.id);
          newComponentsCount++;
          
          productComponents.push({
            componentId: createdComponent.id,
            quantity: bomItem.quantity
          });
          
          // console.log('✅ Composant créé:', createdComponent.id);
        } catch (error) {
          console.error('Erreur création composant:', error);
          showError('Erreur', `Impossible de créer le composant ${bomItem.designation}`);
        }
      } else {
        // Composant existant - vérifier si on doit mettre à jour le stock
        const alreadyInForm = formData.components.some(pc => pc.componentId === existingComponent.id);
        if (alreadyInForm) {
          quantityIncrements[existingComponent.id] = (quantityIncrements[existingComponent.id] || 0) + bomItem.quantity;
          updatedComponentsCount++;
        } else {
          productComponents.push({ componentId: existingComponent.id, quantity: bomItem.quantity });
          existingComponentsCount++;
        }
      }
    }

    // Mettre à jour les composants du produit
    setFormData(prev => {
      const merged = prev.components.map(pc =>
        quantityIncrements[pc.componentId]
          ? { ...pc, quantity: pc.quantity + quantityIncrements[pc.componentId] }
          : pc
      );
      return { ...prev, components: [...merged, ...productComponents] };
    });

    // Recharger les composants pour s'assurer qu'ils sont visibles dans la page des composants
    if (newComponentsCount > 0) {
      // console.log('🔄 Rechargement des composants après import BOM...');
      await reloadComponents();
    }

    // Calculer le coût total mis à jour
    const totalCost = calculateTotalCost();

    // Afficher un résumé détaillé
    let message = '';
    if (newComponentsCount > 0) {
      message += `${newComponentsCount} nouveau${newComponentsCount > 1 ? 'x' : ''} composant${newComponentsCount > 1 ? 's' : ''} créé${newComponentsCount > 1 ? 's' : ''}`;
    }
    if (existingComponentsCount > 0) {
      if (message) message += ', ';
      message += `${existingComponentsCount} composant${existingComponentsCount > 1 ? 's' : ''} existant${existingComponentsCount > 1 ? 's' : ''} ajouté${existingComponentsCount > 1 ? 's' : ''}`;
    }
    if (updatedComponentsCount > 0) {
      if (message) message += ', ';
      message += `${updatedComponentsCount} quantité${updatedComponentsCount > 1 ? 's' : ''} mise${updatedComponentsCount > 1 ? 's' : ''} à jour`;
    }

    if (newComponentsCount > 0 || existingComponentsCount > 0 || updatedComponentsCount > 0) {
      showSuccess(
        'BOM importée avec succès',
        `${message}. Coût total: ${totalCost.toFixed(2)}€`
      );
    } else {
      showInfo('BOM importée', 'Aucun nouveau composant ajouté');
    }

    setShowBOMImport(false);
  };

  const handleChange = (field: string, value: any) => {
    // Conversion des valeurs numériques
    if (field === 'productionCost') {
      value = parseFloat(value) || 0;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddProductComponent = () => {
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

  const calculateComponentsCost = () => {
    return formData.components.reduce((total, pc) => {
      const component = components.find(c => c.id === pc.componentId);
      const unit = component ? Number(component.unitPrice) || 0 : 0;
      const qty = Number(pc.quantity) || 0;
      return total + unit * qty;
    }, 0);
  };

  const calculateTotalCost = () => {
    // Pour l'instant, le coût total correspond au coût de production basé sur la BOM
    return calculateComponentsCost();
  };

  // Recalculer automatiquement le coût de production lorsqu'on modifie la liste des composants
  React.useEffect(() => {
    const autoCost = calculateComponentsCost();
    setFormData(prev => ({ ...prev, productionCost: autoCost }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.components, components]);

  const getAvailableComponents = () => {
    // Afficher tous les composants pour permettre la pré-sélection des éléments importés
    return components;
  };

  if (!isOpen) return null;


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
                Référence produit
              </label>
              <input
                type="text"
                value={formData.productNumber}
                onChange={(e) => handleChange('productNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: SH-1R"
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
                  onClick={handleAddProductComponent}
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
                      {/* Détails du composant sélectionné */}
                      {pc.componentId && (
                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-2">
                          {(() => {
                            const comp = components.find(c => c.id === pc.componentId);
                            if (!comp) return null;
                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                <div><span className="font-medium">Nom:</span> {comp.name}</div>
                                <div><span className="font-medium">Référence:</span> {comp.productNumber}</div>
                                <div><span className="font-medium">Désignation:</span> {comp.designation}</div>
                                <div><span className="font-medium">Footprint:</span> {comp.footprint}</div>
                                <div><span className="font-medium">Catégorie:</span> <span className="capitalize">{comp.category}</span></div>
                                <div><span className="font-medium">Prix unitaire:</span> {(Number(comp.unitPrice) || 0).toFixed(2)}€</div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
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

          {/* Production Cost */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coût de production (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={Number(formData.productionCost).toFixed(2)}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Calculé automatiquement depuis la BOM</p>
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