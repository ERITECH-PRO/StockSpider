import React, { useState, useEffect } from 'react';
import { Wrench, Package, Clock, User, DollarSign } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';

interface AssemblyMovement {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  assembledAt: string;
  assembledBy: string;
  totalCost: number;
}

const AssemblyList = () => {
  const { products, assembleProduct, assembledProducts } = useData();
  const { showSuccess, showError } = useToast();
  const [assemblies, setAssemblies] = useState<AssemblyMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [assemblyQuantity, setAssemblyQuantity] = useState<number>(1);

  // Synchroniser à partir du contexte: afficher les produits assemblés réels
  useEffect(() => {
    try {
      const mapped = (assembledProducts || []).map(ap => ({
        id: ap.id,
        productId: ap.productId,
        productName: ap.productName,
        quantity: ap.assembledQuantity,
        assembledAt: ap.assembledAt,
        assembledBy: ap.assembledBy,
        totalCost: ap.totalCost,
      }));
      setAssemblies(mapped);
    } catch (error) {
      console.error('Erreur mapping produits assemblés:', error);
    } finally {
      setLoading(false);
    }
  }, [assembledProducts]);

  const handleAssemble = async () => {
    if (!selectedProduct) {
      showError('Erreur', 'Veuillez sélectionner un produit');
      return;
    }

    if (assemblyQuantity <= 0) {
      showError('Erreur', 'La quantité doit être supérieure à 0');
      return;
    }

    try {
      const success = await assembleProduct(selectedProduct, assemblyQuantity);
      
      if (success) {
        // La liste s'actualise via le contexte (assembledProducts)
        const product = products.find(p => p.id === selectedProduct);
        if (product) {
          showSuccess('Assemblage réussi', `${assemblyQuantity} unité${assemblyQuantity > 1 ? 's' : ''} de ${product.name} assemblée${assemblyQuantity > 1 ? 's' : ''}`);
        }
        // Réinitialiser le formulaire
        setSelectedProduct('');
        setAssemblyQuantity(1);
      }
    } catch (error) {
      console.error('Erreur assemblage:', error);
      showError('Erreur', 'Impossible d\'assembler le produit');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assemblage de produits</h1>
          <p className="text-gray-600">Assemblez vos produits finis à partir des composants disponibles</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Wrench className="w-4 h-4" />
          <span>{assemblies.length} assemblage{assemblies.length > 1 ? 's' : ''} enregistré{assemblies.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Assembly Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nouvel assemblage</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Produit à assembler
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner un produit</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} (Stock: {product.quantity})
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
              value={assemblyQuantity}
              onChange={(e) => setAssemblyQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAssemble}
              disabled={!selectedProduct || assemblyQuantity <= 0}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              Assembler
            </button>
          </div>
        </div>
      </div>

      {/* Assembly History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Historique des assemblages</h2>
        </div>

        {assemblies.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>Aucun assemblage enregistré</p>
            <p className="text-sm">Les assemblages apparaîtront ici une fois effectués</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coût total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assemblé par
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assemblies.map((assembly) => (
                  <tr key={assembly.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {assembly.productName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assembly.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                        {formatPrice(assembly.totalCost)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        {assembly.assembledBy}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        {formatDate(assembly.assembledAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssemblyList;
