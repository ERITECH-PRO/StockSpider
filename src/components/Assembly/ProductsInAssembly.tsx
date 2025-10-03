import React, { useState, useEffect } from 'react';
import { Clock, Package, AlertTriangle, CheckCircle, X, Play, Pause } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { ProductInAssembly } from '../../types';

const ProductsInAssembly: React.FC = () => {
  const { components, assembleProduct } = useDataContext();
  const [productsInAssembly, setProductsInAssembly] = useState<ProductInAssembly[]>([]);
  const [loading, setLoading] = useState(true);

  // Fonction pour synchroniser le stock et libellés des composants
  const syncComponentStock = (products: ProductInAssembly[]): ProductInAssembly[] => {
    return products.map(product => ({
      ...product,
      componentsRequired: product.componentsRequired.map(comp => {
        const currentComponent = components.find(c => c.id === comp.componentId);
        if (currentComponent) {
          return {
            ...comp,
            // Unifier les noms affichés sur la désignation
            componentName: currentComponent.designation,
            componentDesignation: currentComponent.designation,
            availableQuantity: currentComponent.quantity,
            isAvailable: currentComponent.quantity >= comp.requiredQuantity
          };
        }
        return comp;
      })
    }));
  };

  // Fonction pour regrouper les produits identiques
  const groupProductsById = (products: ProductInAssembly[]): ProductInAssembly[] => {
    const grouped = new Map<string, ProductInAssembly>();
    
    products.forEach(product => {
      const key = product.productId;
      
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        
        // Fusionner seulement si les deux sont en statut "pending"
        if (existing.status === 'pending' && product.status === 'pending') {
          // Cumuler les quantités
          const newQuantity = existing.quantityToAssemble + product.quantityToAssemble;
          
          // Cumuler les composants requis
          const mergedComponents = existing.componentsRequired.map(existingComp => {
            const matchingComp = product.componentsRequired.find(comp => 
              comp.componentId === existingComp.componentId
            );
            
            if (matchingComp) {
              const newRequiredQuantity = existingComp.requiredQuantity + matchingComp.requiredQuantity;
              return {
                ...existingComp,
                requiredQuantity: newRequiredQuantity,
                isAvailable: existingComp.availableQuantity >= newRequiredQuantity
              };
            }
            
            return existingComp;
          });
          
          // Créer le produit fusionné
          const mergedProduct: ProductInAssembly = {
            ...existing,
            quantityToAssemble: newQuantity,
            componentsRequired: mergedComponents,
            createdAt: existing.createdAt, // Garder la date de création la plus ancienne
            createdBy: existing.createdBy
          };
          
          grouped.set(key, mergedProduct);
        } else {
          // Si les statuts sont différents, garder les deux séparément
          grouped.set(`${key}_${product.id}`, product);
        }
      } else {
        grouped.set(key, product);
      }
    });
    
    return Array.from(grouped.values());
  };

  // Charger les produits en cours d'assemblage depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('productsInAssembly');
      if (saved) {
        const rawProducts = JSON.parse(saved);
        
        // Synchroniser le stock des composants
        const syncedProducts = syncComponentStock(rawProducts);
        
        // Regrouper les produits identiques
        const groupedProducts = groupProductsById(syncedProducts);
        
        setProductsInAssembly(groupedProducts);
        
        // Sauvegarder la version synchronisée et regroupée si elle a changé
        if (rawProducts.length !== groupedProducts.length || 
            JSON.stringify(rawProducts) !== JSON.stringify(syncedProducts)) {
          localStorage.setItem('productsInAssembly', JSON.stringify(groupedProducts));
        }
      }
    } catch (error) {
      console.error('Erreur chargement produits en cours:', error);
    } finally {
      setLoading(false);
    }
  }, [components]); // Recharger quand les composants changent

  // Synchroniser automatiquement le stock quand les composants changent
  useEffect(() => {
    if (productsInAssembly.length > 0 && components.length > 0) {
      const syncedProducts = syncComponentStock(productsInAssembly);
      const hasChanges = JSON.stringify(productsInAssembly) !== JSON.stringify(syncedProducts);
      
      if (hasChanges) {
        setProductsInAssembly(syncedProducts);
        // Sauvegarder les changements
        try {
          localStorage.setItem('productsInAssembly', JSON.stringify(syncedProducts));
        } catch (error) {
          console.error('Erreur sauvegarde synchronisation:', error);
        }
      }
    }
  }, [components, productsInAssembly.length]); // Seulement quand les composants changent ou le nombre de produits change

  // Sauvegarder dans localStorage avec synchronisation et regroupement automatique
  const saveProductsInAssembly = (newList: ProductInAssembly[]) => {
    try {
      // Synchroniser le stock des composants
      const syncedList = syncComponentStock(newList);
      
      // Regrouper les produits identiques
      const groupedList = groupProductsById(syncedList);
      
      localStorage.setItem('productsInAssembly', JSON.stringify(groupedList));
      setProductsInAssembly(groupedList);
    } catch (error) {
      console.error('Erreur sauvegarde produits en cours:', error);
    }
  };

  // Marquer un produit comme en cours d'assemblage
  const startAssembly = (productInAssembly: ProductInAssembly) => {
    const updated = productsInAssembly.map(p => 
      p.id === productInAssembly.id 
        ? { ...p, status: 'in_progress' as const }
        : p
    );
    saveProductsInAssembly(updated);
  };

  // Marquer un produit comme terminé: assembler, créer l'entrée “produit assemblé” et retirer de la liste
  const completeAssembly = async (productInAssembly: ProductInAssembly) => {
    try {
      const success = await assembleProduct(productInAssembly.productId, productInAssembly.quantityToAssemble);
      if (success) {
        // Retirer de la liste locale une fois assemblé
        const updated = productsInAssembly.filter(p => p.id !== productInAssembly.id);
        saveProductsInAssembly(updated);
      }
    } catch (error) {
      console.error('Erreur lors de la finalisation de l\'assemblage:', error);
    }
  };

  // Annuler un produit en cours
  const cancelAssembly = (productInAssembly: ProductInAssembly) => {
    const updated = productsInAssembly.map(p => 
      p.id === productInAssembly.id 
        ? { ...p, status: 'cancelled' as const }
        : p
    );
    saveProductsInAssembly(updated);
  };

  // Supprimer un produit de la liste
  const removeFromAssembly = (productInAssembly: ProductInAssembly) => {
    const updated = productsInAssembly.filter(p => p.id !== productInAssembly.id);
    saveProductsInAssembly(updated);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminé';
      case 'cancelled': return 'Annulé';
      default: return 'Inconnu';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-3s-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-3s-gray-light min-h-full">
      {/* Compteur de produits */}
      <div className="flex justify-end">
        <div className="text-sm text-3s-gray-medium font-inter">
          {productsInAssembly.length} produit{productsInAssembly.length > 1 ? 's' : ''} en cours
        </div>
      </div>

      {productsInAssembly.length === 0 ? (
        <div className="text-center py-12">
          <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Clock className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-3s-black mb-2 font-inter">Aucun produit en cours d'assemblage</h3>
          <p className="text-3s-gray-medium font-inter">
            Les produits en cours d'assemblage apparaîtront ici après avoir cliqué sur "Assembler" dans la page des produits finis.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {productsInAssembly.map((productInAssembly) => {
            const allComponentsAvailable = productInAssembly.componentsRequired.every(c => c.isAvailable);
            const someComponentsMissing = productInAssembly.componentsRequired.some(c => !c.isAvailable);

            return (
              <div key={productInAssembly.id} className="card-3s p-6 animate-fade-in hover:shadow-card-hover transition-all duration-200">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg shadow-3s">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-3s-black font-inter">{productInAssembly.productName}</h3>
                      <p className="text-3s-gray-medium mt-1 font-inter">{productInAssembly.productDescription}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(productInAssembly.status)}`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(productInAssembly.status)}
                            {getStatusLabel(productInAssembly.status)}
                          </div>
                        </span>
                        {someComponentsMissing && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200">
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Composants manquants
                            </div>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-3s-blue font-inter">{productInAssembly.quantityToAssemble}</p>
                    <p className="text-sm text-3s-gray-medium font-inter">unité{productInAssembly.quantityToAssemble > 1 ? 's' : ''} à assembler</p>
                  </div>
                </div>

                {/* Composants requis */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-3s-black mb-3 font-inter">Composants requis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {productInAssembly.componentsRequired.map((component) => (
                      <div key={component.componentId} className={`p-3 rounded-lg border ${
                        component.isAvailable 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-3s-black text-sm font-inter">{component.componentName}</p>
                            <p className="text-xs text-3s-gray-medium font-inter">{component.componentDesignation}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-3s-black font-inter">{component.requiredQuantity}</p>
                            <p className="text-xs text-3s-gray-medium font-inter">
                              {component.availableQuantity} disponible{component.availableQuantity > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        {!component.isAvailable && (
                          <div className="mt-2 text-xs text-red-600 font-inter">
                            Manque: {component.requiredQuantity - component.availableQuantity}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-3s-gray-medium font-inter">
                    Créé le {formatDate(productInAssembly.createdAt)} par {productInAssembly.createdBy}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {productInAssembly.status === 'pending' && (
                      <>
                        <button
                          onClick={() => startAssembly(productInAssembly)}
                          disabled={!allComponentsAvailable}
                          className="btn-3s-primary text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Play className="w-4 h-4" />
                          Démarrer
                        </button>
                        <button
                          onClick={() => cancelAssembly(productInAssembly)}
                          className="btn-3s-secondary text-sm px-4 py-2 flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Annuler
                        </button>
                      </>
                    )}
                    
                    {productInAssembly.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => completeAssembly(productInAssembly)}
                          className="btn-3s-success text-sm px-4 py-2 flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Terminer
                        </button>
                        <button
                          onClick={() => cancelAssembly(productInAssembly)}
                          className="btn-3s-secondary text-sm px-4 py-2 flex items-center gap-2"
                        >
                          <Pause className="w-4 h-4" />
                          Suspendre
                        </button>
                      </>
                    )}
                    
                    {(productInAssembly.status === 'completed' || productInAssembly.status === 'cancelled') && (
                      <button
                        onClick={() => removeFromAssembly(productInAssembly)}
                        className="btn-3s-secondary text-sm px-4 py-2 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductsInAssembly;
