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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-3s-blue"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-10 bg-3s-gray-light min-h-full font-inter">
      {/* Tactical Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-gray-200/50 pb-8">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-3s-black rounded-[1.5rem] shadow-xl shadow-black/20">
            <Clock className="w-8 h-8 text-3s-blue animate-pulse-subtle" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-3s-black uppercase tracking-tight leading-none">Centre de Contrôle Production</h1>
            <p className="text-[10px] text-3s-gray-medium font-bold uppercase tracking-[0.3em] mt-3 opacity-60">Suivi Tactique & Monitoring d'Assemblage 3S IT</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-3s-gray-medium uppercase tracking-widest">Opérations Actives:</span>
          <span className="text-xl font-black text-3s-blue font-mono">{productsInAssembly.length}</span>
        </div>
      </div>

      {productsInAssembly.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/50 rounded-[4rem] border-2 border-dashed border-gray-200 shadow-inner">
          <div className="p-10 bg-white rounded-full shadow-2xl mb-8 border border-gray-50">
            <Package className="w-24 h-24 text-gray-100" />
          </div>
          <h3 className="text-2xl font-black text-3s-black uppercase tracking-tight">Aucune Mission en cours</h3>
          <p className="text-sm font-bold text-3s-gray-medium max-w-sm text-center mt-3 leading-relaxed opacity-60">Le pipeline de production est actuellement vide. Lancez un nouvel assemblage depuis le catalogue produits.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-12 pb-24">
          {productsInAssembly.map((productInAssembly) => {
            const allAvailable = productInAssembly.componentsRequired.every(c => c.isAvailable);
            const status = productInAssembly.status;

            return (
              <div key={productInAssembly.id} className="group relative bg-white rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-700 border border-gray-100 overflow-hidden flex flex-col xl:flex-row">
                {/* Branding accent */}
                <div className={`absolute top-0 left-0 w-2 h-full ${status === 'pending' ? 'bg-yellow-400' :
                  status === 'in_progress' ? 'bg-3s-blue' :
                    status === 'completed' ? 'bg-green-500' : 'bg-3s-red'
                  }`}></div>

                {/* Section 1: Identity & Timeline */}
                <div className="p-8 xl:w-2/5 border-b xl:border-b-0 xl:border-r border-gray-50">
                  <div className="flex items-start justify-between mb-8">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-mono font-bold text-3s-gray-medium uppercase">{productInAssembly.productId}</span>
                        <span className="text-[10px] font-black text-3s-blue uppercase tracking-widest opacity-50">Production Unit</span>
                      </div>
                      <h3 className="text-2xl font-black text-3s-black uppercase tracking-tight leading-tight group-hover:text-3s-blue transition-colors">{productInAssembly.productName}</h3>
                      <p className="text-sm font-bold text-3s-gray-medium opacity-70 leading-relaxed font-mono">{productInAssembly.productDescription}</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-black text-3s-gray-medium uppercase tracking-widest mb-1 opacity-60">Objectif Unités</span>
                      <span className="text-4xl font-black text-3s-black font-mono leading-none tracking-tighter">{productInAssembly.quantityToAssemble}</span>
                    </div>
                  </div>

                  {/* Visual Stepper */}
                  <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-inner mb-8">
                    <div className="flex items-center justify-between gap-1">
                      {[
                        { id: 'pending', icon: Clock, label: 'En Attente' },
                        { id: 'in_progress', icon: Play, label: 'Phase Active' },
                        { id: 'completed', icon: CheckCircle, label: 'Déploiement' }
                      ].map((step, idx, arr) => {
                        const isActive = status === step.id;
                        const isDone = (status === 'in_progress' && step.id === 'pending') ||
                          (status === 'completed' && step.id !== 'completed');
                        const StepIcon = step.icon;

                        return (
                          <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center gap-2 group/step relative">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-lg ${isActive ? 'bg-3s-blue border-3s-blue text-white scale-110 shadow-3s-blue/30' :
                                isDone ? 'bg-green-500 border-green-500 text-white shadow-green-200' :
                                  'bg-white border-gray-100 text-gray-300'
                                }`}>
                                <StepIcon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                              </div>
                              <span className={`text-[8px] font-black uppercase tracking-widest absolute -bottom-5 whitespace-nowrap opacity-0 group-hover/step:opacity-100 transition-opacity ${isActive ? 'text-3s-blue opacity-100' : isDone ? 'text-green-600' : 'text-gray-300'}`}>{step.label}</span>
                            </div>
                            {idx < arr.length - 1 && (
                              <div className={`flex-1 h-0.5 rounded-full mx-1 ${isDone ? 'bg-green-500' : 'bg-gray-100'}`}></div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-6 mt-8 flex items-center gap-4 border-t border-gray-50 opacity-60">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200 text-orange-600 text-xs font-black shadow-inner">
                      {productInAssembly.createdBy.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[9px] font-black text-3s-gray-medium uppercase tracking-widest">Responsable Mission</span>
                      <p className="text-xs font-bold text-3s-black truncate">{productInAssembly.createdBy} • <span className="text-gray-400 font-mono">{formatDate(productInAssembly.createdAt)}</span></p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Monitoring Matrix */}
                <div className="p-8 xl:w-3/5 bg-gray-50/30 flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-3s-blue rounded-full shadow-lg shadow-3s-blue/20"></div>
                      <h4 className="text-xs font-black text-3s-black uppercase tracking-[0.2em]">Matrice des Composants</h4>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${allAvailable ? 'bg-green-50 text-green-600 border-green-100 shadow-inner' : 'bg-orange-50 text-orange-600 border-orange-200 animate-pulse'
                      }`}>
                      {allAvailable ? 'Stock Validé : GO' : 'Alerte : NO-GO Matrix'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    {productInAssembly.componentsRequired.map((comp) => {
                      const missing = comp.requiredQuantity - comp.availableQuantity;
                      return (
                        <div key={comp.componentId} className={`relative p-5 rounded-[1.8rem] border transition-all duration-300 group/comp overflow-hidden ${comp.isAvailable ? 'bg-white border-gray-100 hover:border-3s-blue/20 shadow-sm' : 'bg-red-50/50 border-red-100 scale-[0.98]'
                          }`}>
                          <div className="relative z-10 flex justify-between items-start">
                            <div className="min-w-0 flex-1">
                              <h5 className="text-[11px] font-black text-3s-black uppercase tracking-tight truncate opacity-80 group-hover/comp:text-3s-blue transition-colors">{comp.componentDesignation}</h5>
                              <div className="mt-3 flex items-baseline gap-2">
                                <span className="text-lg font-black text-3s-black font-mono leading-none">{comp.requiredQuantity}</span>
                                <span className="text-[9px] font-black text-3s-gray-medium uppercase tracking-widest opacity-40">Unités Fixées</span>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                              <div className={`w-3 h-3 rounded-full shadow-inner border transition-all duration-500 ${comp.isAvailable ? 'bg-green-500 border-green-400' : 'bg-red-500 border-red-400 shadow-red-200 animate-pulse'
                                }`}></div>
                              <span className={`text-[10px] font-bold ${comp.isAvailable ? 'text-3s-gray-medium' : 'text-red-500'}`}>{comp.availableQuantity} Dispo.</span>
                            </div>
                          </div>
                          {!comp.isAvailable && (
                            <div className="mt-4 pt-4 border-t border-red-100/50 flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Pénurie de {missing} pièces</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Tactical Command Bar */}
                  <div className="mt-10 flex flex-wrap gap-4 pt-8 border-t border-gray-100/50">
                    {status === 'pending' && (
                      <>
                        <button
                          onClick={() => startAssembly(productInAssembly)}
                          disabled={!allAvailable}
                          className="flex-1 min-w-[140px] py-4 bg-3s-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-3s-blue/30 hover:bg-3s-blue-dark active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Engagement Mission
                        </button>
                        <button
                          onClick={() => cancelAssembly(productInAssembly)}
                          className="px-6 py-4 bg-gray-50 text-3s-gray-medium hover:text-3s-red hover:bg-red-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
                        >
                          <X className="w-4 h-4" />
                          Abandon
                        </button>
                      </>
                    )}

                    {status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => completeAssembly(productInAssembly)}
                          className="flex-1 py-4 bg-green-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] shadow-lg shadow-green-200 hover:bg-green-600 active:scale-95 flex items-center justify-center gap-3"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Finaliser l'Assemblage
                        </button>
                        <button
                          onClick={() => cancelAssembly(productInAssembly)}
                          className="px-6 py-4 bg-white text-3s-gray-medium hover:text-orange-500 border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Pause className="w-4 h-4" />
                          Suspendre Flux
                        </button>
                      </>
                    )}

                    {(status === 'completed' || status === 'cancelled') && (
                      <button
                        onClick={() => removeFromAssembly(productInAssembly)}
                        className="flex-1 py-4 bg-gray-100 text-3s-gray-medium hover:text-3s-black border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
                      >
                        Archiver l'Opération
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
