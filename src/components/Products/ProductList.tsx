import React from 'react';
import { Edit2, Box, Wrench, Trash2 } from 'lucide-react';
import { Product } from '../../types';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';

interface ProductListProps {
  searchQuery: string;
}

const ProductList = ({ searchQuery }: ProductListProps) => {
  const { products, components, updateStock } = useData();
  const { showSuccess, showError, showInfo } = useToast();

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getComponentName = (componentId: string) => {
    const component = components.find(c => c.id === componentId);
    return component ? component.designation : 'Composant introuvable';
  };

  const calculateProductCost = (product: Product) => {
    return product.components.reduce((total, pc) => {
      const component = components.find(c => c.id === pc.componentId);
      return total + (component ? component.unitPrice * pc.quantity : 0);
    }, 0) + product.productionCost;
  };

  const getMargin = (product: Product) => {
    const cost = calculateProductCost(product);
    return ((product.sellingPrice - cost) / product.sellingPrice * 100).toFixed(1);
  };

  const canAssemble = (product: Product) => {
    return product.components.every(pc => {
      const component = components.find(c => c.id === pc.componentId);
      return component && component.quantity >= pc.quantity;
    });
  };

  const handleAssemble = (product: Product) => {
    if (!canAssemble(product)) {
      showError('Assemblage impossible', 'Stock insuffisant pour certains composants');
      return;
    }

    // Décrémenter le stock des composants
    product.components.forEach(pc => {
      updateStock(pc.componentId, pc.quantity, 'out', `Assemblage produit: ${product.name}`);
    });

    // Incrémenter le stock du produit (simulation)
    showSuccess('Produit assemblé', `${product.name} assemblé avec succès`);
    showInfo('Stock mis à jour', 'Les composants ont été décomptés du stock');
  };

  return (
    <div className="space-y-6 p-6 bg-3s-gray-light min-h-full">
      {filteredProducts.map((product) => {
        const totalCost = calculateProductCost(product);
        const margin = getMargin(product);
        const canBeAssembled = canAssemble(product);

        return (
          <div key={product.id} className="card-3s p-6 animate-fade-in hover:shadow-card-hover transition-all duration-200">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg shadow-3s">
                  <Box className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-3s-black font-inter">{product.name}</h3>
                  <p className="text-3s-gray-medium mt-1 font-inter">{product.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-3s-blue hover:bg-blue-50 rounded-lg transition-all duration-200">
                  <Edit2 className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-3s-red hover:bg-red-50 rounded-lg transition-all duration-200">
                  <Trash2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleAssemble(product)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    canBeAssembled
                      ? 'btn-3s-primary'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!canBeAssembled}
                >
                  <Wrench className="w-4 h-4" />
                  <span className="font-inter">Assembler</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-medium font-inter">Stock disponible</p>
                <p className="text-2xl font-bold text-blue-700 mt-1 font-inter">{product.quantity}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-medium font-inter">Prix de vente</p>
                <p className="text-2xl font-bold text-green-700 mt-1 font-inter">{product.sellingPrice.toFixed(2)}€</p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-600 font-medium font-inter">Coût total</p>
                <p className="text-2xl font-bold text-orange-700 mt-1 font-inter">{totalCost.toFixed(2)}€</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600 font-medium font-inter">Marge</p>
                <p className="text-2xl font-bold text-purple-700 mt-1 font-inter">{margin}%</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-3s-black mb-4 font-inter">Composants requis</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.components.map((pc, index) => {
                  const component = components.find(c => c.id === pc.componentId);
                  const hasStock = component && component.quantity >= pc.quantity;
                  
                  return (
                    <div key={index} className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-card-hover ${
                      hasStock ? 'border-green-200 bg-green-50' : 'border-3s-red bg-red-50'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-3s-black font-inter">{getComponentName(pc.componentId)}</p>
                          <p className="text-sm text-3s-gray-medium font-inter">Quantité requise: {pc.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium font-inter ${hasStock ? 'text-green-600' : 'text-3s-red'}`}>
                            {component ? `${component.quantity} dispo` : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 font-inter">
                            {component ? `${(component.unitPrice * pc.quantity).toFixed(2)}€` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!canBeAssembled && (
              <div className="mt-4 p-4 bg-red-50 border border-3s-red rounded-lg">
                <p className="text-3s-red font-medium font-inter">⚠️ Impossible d'assembler ce produit</p>
                <p className="text-red-600 text-sm mt-1 font-inter">
                  Certains composants ne sont pas disponibles en quantité suffisante.
                </p>
              </div>
            )}
          </div>
        );
      })}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Box className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-3s-black mb-2 font-inter">Aucun produit trouvé</h3>
          <p className="text-3s-gray-medium font-inter">Essayez de modifier votre recherche ou d'ajouter des produits.</p>
        </div>
      )}
    </div>
  );
};

export default ProductList;