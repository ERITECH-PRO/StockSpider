import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, CheckCircle, X, Search, Filter, Download, Package } from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { ComponentToBuy } from '../../types';
import * as XLSX from 'xlsx';
import { formatPrice } from '../../utils/priceFormatter';
import { getImageUrl } from '../../services/api';

const ComponentsToBuy: React.FC = () => {
  const { components, updateStock, reloadComponents } = useDataContext();
  const [componentsToBuy, setComponentsToBuy] = useState<ComponentToBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Fonction pour corriger les calculs des quantités à acheter et filtrer les composants avec stock suffisant
  const fixQuantityCalculations = (components: ComponentToBuy[]): ComponentToBuy[] => {
    return components
      .map(component => {
        const requiredQuantity = Number(component.requiredQuantity || 0);
        const availableQuantity = Number(component.availableQuantity || 0);
        const correctQuantityToBuy = Math.max(0, requiredQuantity - availableQuantity);
        const correctTotalCost = correctQuantityToBuy * Number(component.unitPrice || 0);
        
        return {
          ...component,
          quantityToBuy: correctQuantityToBuy,
          totalCost: correctTotalCost
        };
      })
      .filter(component => component.quantityToBuy > 0); // Ne garder que les composants qui nécessitent un achat
  };

  // Fonction pour regrouper les composants identiques
  const groupComponentsById = (components: ComponentToBuy[]): ComponentToBuy[] => {
    const grouped = new Map<string, ComponentToBuy>();
    
    components.forEach(component => {
      const key = component.componentId;
      
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        
        // Fusionner les quantités
        const newRequiredQuantity = Number(existing.requiredQuantity || 0) + Number(component.requiredQuantity || 0);
        const availableQuantity = Number(existing.availableQuantity || 0); // Le stock disponible reste le même
        const newQuantityToBuy = Math.max(0, newRequiredQuantity - availableQuantity); // Recalculer la quantité à acheter
        const newTotalCost = newQuantityToBuy * Number(component.unitPrice || 0); // Recalculer le coût total
        
        // Créer le composant fusionné
        const mergedComponent: ComponentToBuy = {
          ...existing,
          quantityToBuy: newQuantityToBuy,
          requiredQuantity: newRequiredQuantity,
          totalCost: newTotalCost,
          // Garder le prix unitaire le plus récent
          unitPrice: Number(component.unitPrice || 0),
          createdAt: existing.createdAt, // Garder la date de création la plus ancienne
          status: existing.status === 'pending' ? 'pending' : component.status
        };
        
        // Ne garder que si la quantité à acheter est > 0
        if (newQuantityToBuy > 0) {
          grouped.set(key, mergedComponent);
        } else {
          // Supprimer de la liste si le stock est suffisant
          grouped.delete(key);
        }
      } else {
        // Ne garder que si la quantité à acheter est > 0
        if (component.quantityToBuy > 0) {
          grouped.set(key, component);
        }
      }
    });
    
    return Array.from(grouped.values());
  };

  // Charger les composants à acheter depuis localStorage + réagir aux changements de stock
  useEffect(() => {
    try {
      const saved = localStorage.getItem('componentsToBuy');
      const rawComponents = saved ? JSON.parse(saved) : [];

      // Les composants sont maintenant pré-agrégés dans DataContext, on les affiche directement
      setComponentsToBuy(rawComponents);
    } catch (error) {
      console.error('Erreur chargement composants à acheter:', error);
    } finally {
      setLoading(false);
    }
  }, [components]);

  // Composants filtrés et regroupés
  const filteredComponents = useMemo(() => {
    let filtered = componentsToBuy;

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(comp => 
        comp.componentName.toLowerCase().includes(query) ||
        comp.componentDesignation.toLowerCase().includes(query) ||
        comp.componentId.toLowerCase().includes(query)
      );
    }

    // Filtre par catégorie
    if (categoryFilter) {
      filtered = filtered.filter(comp => {
        const component = components.find(c => c.id === comp.componentId);
        return component?.category === categoryFilter;
      });
    }

    // Filtre par fournisseur
    if (supplierFilter) {
      filtered = filtered.filter(comp => {
        const component = components.find(c => c.id === comp.componentId);
        return component?.supplier === supplierFilter;
      });
    }

    return filtered;
  }, [componentsToBuy, searchQuery, categoryFilter, supplierFilter, components]);

  // Obtenir les catégories uniques
  const categories = useMemo(() => {
    const cats = new Set<string>();
    componentsToBuy.forEach(comp => {
      const component = components.find(c => c.id === comp.componentId);
      if (component?.category) {
        cats.add(component.category);
      }
    });
    return Array.from(cats).sort();
  }, [componentsToBuy, components]);

  // Obtenir les fournisseurs uniques
  const suppliers = useMemo(() => {
    const supps = new Set<string>();
    componentsToBuy.forEach(comp => {
      const component = components.find(c => c.id === comp.componentId);
      if (component?.supplier) {
        supps.add(component.supplier);
      }
    });
    return Array.from(supps).sort();
  }, [componentsToBuy, components]);

  // Calculer le coût total
  const totalCost = useMemo(() => {
    return filteredComponents.reduce((sum, comp) => sum + Number(comp.totalCost || 0), 0);
  }, [filteredComponents]);

  // Sauvegarder dans localStorage avec correction et regroupement automatique
  const saveComponentsToBuy = (newList: ComponentToBuy[]) => {
    try {
      // Corriger les calculs des quantités à acheter
      const correctedList = fixQuantityCalculations(newList);
      
      // Regrouper les composants identiques
      const groupedList = groupComponentsById(correctedList);
      
      localStorage.setItem('componentsToBuy', JSON.stringify(groupedList));
      setComponentsToBuy(groupedList);
    } catch (error) {
      console.error('Erreur sauvegarde composants à acheter:', error);
    }
  };

  // Exporter en Excel
  const exportToExcel = () => {
    const exportData = filteredComponents.map(comp => {
      const component = components.find(c => c.id === comp.componentId);
      return {
        'Nom du composant': comp.componentName,
        'N° produit': component?.productNumber || '',
        'Footprint': component?.footprint || '',
        'Réf. produit': comp.componentId,
        'Quantité requise': comp.requiredQuantity,
        'Stock disponible': comp.availableQuantity,
        'Quantité à acheter': comp.quantityToBuy,
        'Fournisseur': component?.supplier || '',
        'Prix unitaire (€)': Number(comp.unitPrice || 0),
        'Image URL': component?.imageUrl || '',
        'Statut': comp.status === 'pending' ? 'En attente' : 
                 comp.status === 'ordered' ? 'Commandé' : 
                 comp.status === 'received' ? 'Reçu' : 'Annulé'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Composants à acheter');
    
    // Ajuster la largeur des colonnes
    const colWidths = [
      { wch: 20 }, // Nom du composant
      { wch: 15 }, // N° produit
      { wch: 10 }, // Footprint
      { wch: 12 }, // Réf. produit
      { wch: 12 }, // Quantité requise
      { wch: 12 }, // Stock disponible
      { wch: 12 }, // Quantité à acheter
      { wch: 15 }, // Fournisseur
      { wch: 12 }, // Prix unitaire
      { wch: 10 }, // Image (URL)
      { wch: 10 }  // Statut
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `composants-a-acheter-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Approuver un achat: ajouter au stock et retirer de la liste
  const approveAndAddStock = async (componentToBuy: ComponentToBuy) => {
    try {
      const quantityToAdd = Number(componentToBuy.quantityToBuy || 0);
      if (quantityToAdd <= 0) {
        // Rien à ajouter
        removeFromBuyList(componentToBuy);
        return;
      }

      await updateStock(
        componentToBuy.componentId,
        quantityToAdd,
        'in',
        `Approvisionnement validé: ${componentToBuy.componentName}`
      );

      // Recharger les composants pour refléter le nouveau stock
      await reloadComponents();

      // Mettre à jour la liste locale: marquer reçu et recalculer (disparaîtra si quantité à acheter = 0)
      const updated = componentsToBuy.map(c => 
        c.id === componentToBuy.id 
          ? { 
              ...c, 
              status: 'received' as const,
              availableQuantity: Number(c.availableQuantity || 0) + quantityToAdd,
              quantityToBuy: 0,
              totalCost: 0
            }
          : c
      );
      saveComponentsToBuy(updated);
    } catch (error) {
      console.error('Erreur approvisionnement et ajout stock:', error);
    }
  };

  // Marquer un composant comme reçu
  const markAsReceived = (componentToBuy: ComponentToBuy) => {
    const updated = componentsToBuy.map(c => 
      c.id === componentToBuy.id 
        ? { ...c, status: 'received' as const }
        : c
    );
    saveComponentsToBuy(updated);
  };


  // Supprimer un composant de la liste
  const removeFromBuyList = (componentToBuy: ComponentToBuy) => {
    const updated = componentsToBuy.filter(c => c.id !== componentToBuy.id);
    saveComponentsToBuy(updated);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'ordered': return 'text-blue-600 bg-blue-100';
      case 'received': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'ordered': return 'Commandé';
      case 'received': return 'Reçu';
      case 'cancelled': return 'Annulé';
      default: return 'Inconnu';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-3s-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-3s-gray-light min-h-full">
      {/* Compteur et actions */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-3s-gray-medium font-inter">
          {filteredComponents.length} composant{filteredComponents.length > 1 ? 's' : ''} à acheter
          {totalCost > 0 && (
            <span className="ml-4 text-3s-primary font-semibold">
              Coût total: {formatPrice(totalCost)}
            </span>
          )}
        </div>
        <button
          onClick={exportToExcel}
          className="btn-3s-primary px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="font-inter">Exporter Excel</span>
        </button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-lg shadow-card p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher un composant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-primary focus:border-transparent font-inter"
            />
          </div>

          {/* Filtre par catégorie */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-primary focus:border-transparent font-inter appearance-none bg-white"
            >
              <option value="">Toutes les catégories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Filtre par fournisseur */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-primary focus:border-transparent font-inter appearance-none bg-white"
            >
              <option value="">Tous les fournisseurs</option>
              {suppliers.map(supplier => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          </div>

          {/* Bouton reset filtres */}
          <button
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('');
              setSupplierFilter('');
            }}
            className="btn-3s-secondary px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="font-inter">Reset</span>
          </button>
        </div>
      </div>

      {filteredComponents.length === 0 ? (
        <div className="text-center py-12">
          <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <ShoppingCart className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2 font-inter">
            {componentsToBuy.length === 0 ? 'Aucun composant à acheter' : 'Aucun résultat trouvé'}
          </h3>
          <p className="text-gray-500 font-inter">
            {componentsToBuy.length === 0 
              ? 'Tous les composants nécessaires sont disponibles en stock.'
              : 'Essayez de modifier vos critères de recherche ou de filtrage.'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-card border border-gray-200 overflow-hidden">
          {/* En-tête du tableau */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700 font-inter">
              <div className="col-span-2">Composant</div>
              <div className="col-span-1">N° produit</div>
              <div className="col-span-1">Footprint</div>
              <div className="col-span-1">Réf. produit</div>
              <div className="col-span-1">Requis</div>
              <div className="col-span-1">Stock</div>
              <div className="col-span-1">À acheter</div>
              <div className="col-span-1">Fournisseur</div>
              <div className="col-span-1">Prix (€)</div>
              <div className="col-span-1">Image</div>
              <div className="col-span-1">Actions</div>
            </div>
          </div>

          {/* Corps du tableau */}
          <div className="divide-y divide-gray-200">
            {filteredComponents.map((componentToBuy) => {
              const component = components.find(c => c.id === componentToBuy.componentId);
              
              return (
                <div key={componentToBuy.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center text-sm">
                    {/* Nom du composant */}
                    <div className="col-span-2">
                      <div className="font-medium text-3s-black font-inter">
                        {componentToBuy.componentName}
                      </div>
                      <div className="text-xs text-gray-500 font-inter">
                        {componentToBuy.componentDesignation}
                      </div>
                    </div>

                    {/* N° produit */}
                    <div className="col-span-1">
                      <span className="text-gray-700 font-inter font-mono text-xs">
                        {component?.productNumber || 'N/A'}
                      </span>
                    </div>

                    {/* Footprint */}
                    <div className="col-span-1">
                      <span className="text-gray-700 font-inter">
                        {component?.footprint || 'N/A'}
                      </span>
                    </div>

                    {/* Référence produit */}
                    <div className="col-span-1">
                      <span className="text-gray-700 font-inter font-mono text-xs">
                        {componentToBuy.componentId}
                      </span>
                    </div>

                    {/* Quantité requise */}
                    <div className="col-span-1">
                      <span className="text-gray-700 font-inter">
                        {componentToBuy.requiredQuantity}
                      </span>
                    </div>

                    {/* Stock disponible */}
                    <div className="col-span-1">
                      <span className={`font-inter ${componentToBuy.availableQuantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {componentToBuy.availableQuantity}
                      </span>
                    </div>

                    {/* Quantité à acheter */}
                    <div className="col-span-1">
                      <span className={`font-inter font-semibold ${componentToBuy.quantityToBuy > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {componentToBuy.quantityToBuy}
                      </span>
                    </div>

                    {/* Fournisseur */}
                    <div className="col-span-1">
                      <span className="text-gray-700 font-inter">
                        {component?.supplier || 'N/A'}
                      </span>
                    </div>

                    {/* Prix unitaire */}
                    <div className="col-span-1">
                      <span className="text-gray-700 font-inter">
                        {formatPrice(componentToBuy.unitPrice)}
                      </span>
                    </div>

                    {/* Image du composant */}
                    <div className="col-span-1">
                      <div className="flex items-center justify-center">
                        {component?.imageUrl ? (
                          <img
                            src={getImageUrl(component.imageUrl)}
                            alt={componentToBuy.componentName}
                            className="w-8 h-8 object-cover rounded border border-gray-200"
                            onError={(e) => {
                              // Fallback vers l'icône si l'image ne charge pas
                              e.currentTarget.style.display = 'none';
                              const fallbackIcon = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallbackIcon) {
                                fallbackIcon.style.display = 'block';
                              }
                            }}
                          />
                        ) : null}
                        <Package 
                          className={`w-5 h-5 text-3s-blue ${component?.imageUrl ? 'hidden' : 'block'}`} 
                          style={{ display: component?.imageUrl ? 'none' : 'block' }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1">
                      <div className="flex items-center gap-1">
                        {componentToBuy.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveAndAddStock(componentToBuy)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              title="Approuver et ajouter au stock"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeFromBuyList(componentToBuy)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                              title="Supprimer de la liste"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        {componentToBuy.status === 'ordered' && (
                          <button
                            onClick={() => markAsReceived(componentToBuy)}
                            className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                            title="Marquer comme reçu"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(componentToBuy.status)}`}>
                          {getStatusText(componentToBuy.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pied du tableau avec coût total */}
          {totalCost > 0 && (
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <div className="flex justify-end items-center gap-4">
                <span className="text-sm text-gray-600 font-inter">Coût total estimé:</span>
                <span className="text-lg font-bold text-3s-primary font-inter">
                  {formatPrice(totalCost)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComponentsToBuy;