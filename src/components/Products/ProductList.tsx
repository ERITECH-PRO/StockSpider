import React from 'react';
import { Edit2, Box, Wrench } from 'lucide-react';
import { Product } from '../../types';
import { useData } from '../../hooks/useData';

interface ProductListProps {
  searchQuery: string;
}

const ProductList = ({ searchQuery }: ProductListProps) => {
  const { products, components } = useData();

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

  return (
    <div className="space-y-6">
      {filteredProducts.map((product) => {
        const totalCost = calculateProductCost(product);
        const margin = getMargin(product);
        const canBeAssembled = canAssemble(product);

        return (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Box className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-gray-600 mt-1">{product.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    canBeAssembled
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!canBeAssembled}
                >
                  <Wrench className="w-4 h-4" />
                  Assembler
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Stock disponible</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{product.quantity}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Prix de vente</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{product.sellingPrice.toFixed(2)}€</p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-orange-600 font-medium">Coût total</p>
                <p className="text-2xl font-bold text-orange-700 mt-1">{totalCost.toFixed(2)}€</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Marge</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">{margin}%</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-4">Composants requis</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.components.map((pc, index) => {
                  const component = components.find(c => c.id === pc.componentId);
                  const hasStock = component && component.quantity >= pc.quantity;
                  
                  return (
                    <div key={index} className={`p-4 rounded-lg border ${
                      hasStock ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">{getComponentName(pc.componentId)}</p>
                          <p className="text-sm text-gray-600">Quantité requise: {pc.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${hasStock ? 'text-green-600' : 'text-red-600'}`}>
                            {component ? `${component.quantity} dispo` : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">
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
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 font-medium">⚠️ Impossible d'assembler ce produit</p>
                <p className="text-red-600 text-sm mt-1">
                  Certains composants ne sont pas disponibles en quantité suffisante.
                </p>
              </div>
            )}
          </div>
        );
      })}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Box className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit trouvé</h3>
          <p className="text-gray-600">Essayez de modifier votre recherche ou d'ajouter des produits.</p>
        </div>
      )}
    </div>
  );
};

export default ProductList;