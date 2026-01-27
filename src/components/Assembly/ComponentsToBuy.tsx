import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, CheckCircle, X, Search, Download, Package, CreditCard, AlertCircle } from 'lucide-react';
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
      .filter(component => component.quantityToBuy > 0);
  };

  // Fonction pour regrouper les composants identiques
  const groupComponentsById = (components: ComponentToBuy[]): ComponentToBuy[] => {
    const grouped = new Map<string, ComponentToBuy>();

    components.forEach(component => {
      const key = component.componentId;

      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        const newRequiredQuantity = Number(existing.requiredQuantity || 0) + Number(component.requiredQuantity || 0);
        const availableQuantity = Number(existing.availableQuantity || 0);
        const newQuantityToBuy = Math.max(0, newRequiredQuantity - availableQuantity);
        const newTotalCost = newQuantityToBuy * Number(component.unitPrice || 0);

        const mergedComponent: ComponentToBuy = {
          ...existing,
          quantityToBuy: newQuantityToBuy,
          requiredQuantity: newRequiredQuantity,
          totalCost: newTotalCost,
          unitPrice: Number(component.unitPrice || 0),
          createdAt: existing.createdAt,
          status: existing.status === 'pending' ? 'pending' : component.status
        };

        if (newQuantityToBuy > 0) {
          grouped.set(key, mergedComponent);
        } else {
          grouped.delete(key);
        }
      } else {
        if (component.quantityToBuy > 0) {
          grouped.set(key, component);
        }
      }
    });

    return Array.from(grouped.values());
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('componentsToBuy');
      const rawComponents = saved ? JSON.parse(saved) : [];
      setComponentsToBuy(rawComponents);
    } catch (error) {
      console.error('Erreur chargement composants à acheter:', error);
    } finally {
      setLoading(false);
    }
  }, [components]);

  const filteredComponents = useMemo(() => {
    let filtered = componentsToBuy;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(comp =>
        comp.componentName.toLowerCase().includes(query) ||
        comp.componentDesignation.toLowerCase().includes(query) ||
        comp.componentId.toLowerCase().includes(query)
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(comp => {
        const component = components.find(c => c.id === comp.componentId);
        return component?.category === categoryFilter;
      });
    }

    if (supplierFilter) {
      filtered = filtered.filter(comp => {
        const component = components.find(c => c.id === comp.componentId);
        return component?.supplier === supplierFilter;
      });
    }

    return filtered;
  }, [componentsToBuy, searchQuery, categoryFilter, supplierFilter, components]);

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

  const totalCostValue = useMemo(() => {
    return filteredComponents.reduce((sum, comp) => sum + Number(comp.totalCost || 0), 0);
  }, [filteredComponents]);

  const saveComponentsToBuy = (newList: ComponentToBuy[]) => {
    try {
      const correctedList = fixQuantityCalculations(newList);
      const groupedList = groupComponentsById(correctedList);
      localStorage.setItem('componentsToBuy', JSON.stringify(groupedList));
      setComponentsToBuy(groupedList);
    } catch (error) {
      console.error('Erreur sauvegarde composants à acheter:', error);
    }
  };

  const exportToExcel = () => {
    const exportData = filteredComponents.map(comp => {
      const component = components.find(c => c.id === comp.componentId);
      return {
        'Nom du composant': comp.componentName,
        'N° produit': component?.productNumber || '',
        'Footprint': component?.footprint || '',
        'Quantité requise': comp.requiredQuantity,
        'Stock disponible': comp.availableQuantity,
        'Quantité à acheter': comp.quantityToBuy,
        'Fournisseur': component?.supplier || '',
        'Prix unitaire (€)': Number(comp.unitPrice || 0),
        'Statut': comp.status === 'pending' ? 'En attente' :
          comp.status === 'ordered' ? 'Commandé' :
            comp.status === 'received' ? 'Reçu' : 'Annulé'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Composants à acheter');
    XLSX.writeFile(wb, `procurement-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const approveAndAddStock = async (componentToBuy: ComponentToBuy) => {
    try {
      const quantityToAdd = Number(componentToBuy.quantityToBuy || 0);
      if (quantityToAdd <= 0) {
        removeFromBuyList(componentToBuy);
        return;
      }

      await updateStock(
        componentToBuy.componentId,
        quantityToAdd,
        'in',
        `Approvisionnement validé: ${componentToBuy.componentName}`
      );

      await reloadComponents();

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

  const markAsReceived = (componentToBuy: ComponentToBuy) => {
    const updated = componentsToBuy.map(c =>
      c.id === componentToBuy.id
        ? { ...c, status: 'received' as const }
        : c
    );
    saveComponentsToBuy(updated);
  };

  const removeFromBuyList = (componentToBuy: ComponentToBuy) => {
    const updated = componentsToBuy.filter(c => c.id !== componentToBuy.id);
    saveComponentsToBuy(updated);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending': return { color: 'text-orange-600 bg-orange-50 border-orange-100', label: 'En attente' };
      case 'ordered': return { color: 'text-blue-600 bg-blue-50 border-blue-100', label: 'Commandé' };
      case 'received': return { color: 'text-green-600 bg-green-50 border-green-100', label: 'Reçu' };
      case 'cancelled': return { color: 'text-red-600 bg-red-50 border-red-100', label: 'Annulé' };
      default: return { color: 'text-gray-600 bg-gray-50 border-gray-100', label: 'Inconnu' };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-3s-blue border-t-transparent"></div>
        <p className="text-3s-gray-medium font-inter animate-pulse">Analyse des besoins en cours...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-3s-gray-light min-h-full font-inter">
      {/* Visual Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold text-3s-black">Besoins d'approvisionnement</h1>
          <p className="text-3s-gray-medium mt-1">Liste des composants manquants pour l'assemblage des produits en cours.</p>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 card-3s p-4 flex flex-col justify-center border-l-4 border-l-3s-blue relative overflow-hidden">
            <ShoppingCart className="absolute -right-2 -bottom-2 w-12 h-12 text-blue-50 opacity-50" />
            <span className="text-[10px] text-3s-gray-medium uppercase font-bold tracking-wider">Composants</span>
            <span className="text-2xl font-black text-3s-black">{filteredComponents.length}</span>
          </div>
          <div className="flex-1 card-3s p-4 flex flex-col justify-center border-l-4 border-l-green-500 relative overflow-hidden">
            <CreditCard className="absolute -right-2 -bottom-2 w-12 h-12 text-green-50 opacity-50" />
            <span className="text-[10px] text-3s-gray-medium uppercase font-bold tracking-wider">Coût Estimé</span>
            <span className="text-xl font-black text-green-600">{formatPrice(totalCostValue)}</span>
          </div>
        </div>
      </div>

      {/* Control Bar Overlay */}
      <div className="sticky top-0 z-10 card-3s p-3 flex flex-col md:flex-row gap-4 bg-white/80 backdrop-blur-md border border-gray-100 items-center justify-between">
        <div className="flex flex-1 gap-3 w-full">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher par nom ou référence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-3s-blue focus:bg-white transition-all outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="hidden md:block px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-3s-blue"
          >
            <option value="">Toutes les catégories</option>
            {categories.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>

          <button
            onClick={() => { setSearchQuery(''); setCategoryFilter(''); setSupplierFilter(''); }}
            className="p-2 text-gray-400 hover:text-3s-red transition-colors"
            title="Réinitialiser"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={exportToExcel}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-3s-black text-white rounded-lg hover:bg-gray-800 transition-all font-medium shadow-3s"
        >
          <Download className="w-4 h-4" />
          <span>Exporter (XLSX)</span>
        </button>
      </div>

      {/* Procurement Grid */}
      {filteredComponents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <Package className="w-16 h-16 text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold text-3s-black">Stock parfaitement équilibré</h3>
          <p className="text-3s-gray-medium">Aucun composant manquant détecté pour vos assemblages en cours.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredComponents.map((compToBuy) => {
            const component = components.find(c => c.id === compToBuy.componentId);
            const status = getStatusInfo(compToBuy.status);

            return (
              <div key={compToBuy.id} className="card-3s flex flex-col group hover:scale-[1.02] transform transition-all cursor-default">
                {/* Image & Status Header */}
                <div className="p-4 flex gap-4 bg-gradient-to-br from-gray-50 to-white rounded-t-xl border-b border-gray-100">
                  <div className="w-20 h-20 bg-white rounded-lg shadow-sm border border-gray-100 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                    {component?.imageUrl ? (
                      <img src={getImageUrl(component.imageUrl)} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <Package className="w-8 h-8 text-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-[10px] font-bold text-3s-gray-medium">{component?.supplier || 'N/A'}</span>
                    </div>
                    <h3 className="font-bold text-3s-black truncate leading-tight mb-1">{compToBuy.componentName}</h3>
                    <p className="text-[10px] text-3s-gray-medium font-mono uppercase truncate">{component?.productNumber || compToBuy.componentId}</p>
                  </div>
                </div>

                {/* Metrics Section */}
                <div className="p-4 grid grid-cols-2 gap-4 border-b border-gray-50 bg-white">
                  <div className="space-y-1">
                    <span className="text-[10px] text-3s-gray-medium uppercase font-bold tracking-tighter">Besoins Totaux</span>
                    <div className="flex items-center gap-2 font-black text-3s-black text-lg">
                      <AlertCircle className="w-4 h-4 text-orange-400" />
                      {compToBuy.requiredQuantity}
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] text-3s-gray-medium uppercase font-bold tracking-tighter">Disponibilité</span>
                    <div className={`text-lg font-black ${compToBuy.availableQuantity > 0 ? 'text-green-600' : 'text-3s-red'}`}>
                      {compToBuy.availableQuantity} <span className="text-xs text-gray-400 font-medium">/ {compToBuy.requiredQuantity}</span>
                    </div>
                  </div>
                </div>

                {/* Final Step Action */}
                <div className="mt-auto p-4 bg-gray-50/50 rounded-b-xl space-y-3">
                  <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-3s-gray-medium uppercase font-black">À Commander</span>
                      <span className="text-base font-black text-3s-red">{compToBuy.quantityToBuy}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-3s-gray-medium uppercase font-black">Coût Ligne</span>
                      <span className="text-sm font-black text-3s-black block">{formatPrice(compToBuy.totalCost)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {compToBuy.status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveAndAddStock(compToBuy)}
                          className="flex-1 py-2.5 bg-3s-blue text-white rounded-lg text-xs font-bold hover:bg-3s-blue-dark shadow-3s transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Valider l'achat</span>
                        </button>
                        <button
                          onClick={() => removeFromBuyList(compToBuy)}
                          className="p-2.5 text-gray-400 hover:text-3s-red hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                          title="Supprimer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {compToBuy.status === 'ordered' && (
                      <button
                        onClick={() => markAsReceived(compToBuy)}
                        className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 shadow-3s transition-all flex items-center justify-center gap-2"
                      >
                        <Package className="w-4 h-4" />
                        <span>Signaler comme reçu</span>
                      </button>
                    )}

                    {compToBuy.status === 'received' && (
                      <div className="w-full text-center py-2 text-xs font-bold text-green-600 bg-green-50 rounded-lg border border-green-200">
                        Traitement terminé
                      </div>
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

export default ComponentsToBuy;
