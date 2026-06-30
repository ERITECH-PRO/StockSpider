import { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, Package, ArrowUp, ArrowDown, RotateCcw, User, Clock, Search, Plus, Calendar, DollarSign, Info } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import { formatPriceCurrency } from '../../utils/priceFormatter';
import { getImageUrl, apiService } from '../../services/api';

interface StockMovement {
  id: string;
  componentId?: string;
  componentDesignation?: string;
  componentName?: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unitPrice?: number;
  reason: string;
  userId: string;
  userName?: string;
  createdAt: string;
}

const StockMovements = () => {
  const { components, reloadComponents } = useData();
  const { showSuccess, showError } = useToast();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Form State
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [movementQuantity, setMovementQuantity] = useState<number>(0);
  const [movementReason, setMovementReason] = useState<string>('');
  const [movementPrice, setMovementPrice] = useState<number>(0);

  const loadMovements = useCallback(async () => {
    try {
      const data = await apiService.getStockMovements({ limit: 200 });
      setMovements(data as StockMovement[]);
    } catch (error) {
      console.error('Erreur chargement mouvements:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchesSearch = !searchQuery ||
        m.componentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.componentDesignation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.reason.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'all' || m.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [movements, searchQuery, typeFilter]);

  const handleMovement = async () => {
    if (!selectedComponent) {
      showError('Erreur', 'Veuillez sélectionner un composant');
      return;
    }

    if (movementQuantity <= 0) {
      showError('Erreur', 'La quantité doit être supérieure à 0');
      return;
    }

    if (!movementReason.trim()) {
      showError('Erreur', 'Veuillez indiquer la raison du mouvement');
      return;
    }

    try {
      const component = components.find(c => c.id === selectedComponent);
      await apiService.createStockMovement({
        componentId: selectedComponent,
        type: movementType,
        quantity: movementQuantity,
        unitPrice: movementPrice || component?.unitPrice || 0,
        reason: movementReason,
      });

      // Recharger depuis MySQL (mouvements + stock composants mis à jour côté serveur)
      await Promise.all([loadMovements(), reloadComponents()]);

      showSuccess('Mouvement enregistré', `Le stock de ${component?.name || 'composant'} a été mis à jour`);

      // Reset
      setSelectedComponent('');
      setMovementQuantity(0);
      setMovementReason('');
      setMovementPrice(0);
    } catch (error) {
      console.error('Erreur mouvement:', error);
      showError('Erreur', 'Impossible d\'enregistrer le mouvement');
    }
  };

  const statusMap = {
    in: { label: 'Entrée', color: 'text-green-600 bg-green-50 border-green-100', icon: ArrowUp },
    out: { label: 'Sortie', color: 'text-red-600 bg-red-50 border-red-100', icon: ArrowDown },
    adjustment: { label: 'Ajustement', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: RotateCcw }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return {
      date: d.toLocaleDateString('fr-FR'),
      time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-3s-blue border-t-transparent shadow-sm"></div>
        <p className="text-3s-gray-medium font-inter animate-pulse">Chargement de l'historique...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-3s-gray-light min-h-full font-inter">
      {/* Header & Stats Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold text-3s-black">Stock & mouvements</h1>
          <p className="text-3s-gray-medium mt-1">Audit visuel de tous les changements d'inventaire.</p>
        </div>

        <div className="flex gap-4 lg:col-span-2">
          <div className="flex-1 card-3s p-4 flex flex-col justify-center border-l-4 border-l-3s-blue relative overflow-hidden">
            <TrendingUp className="absolute -right-2 -bottom-2 w-12 h-12 text-blue-50 opacity-50" />
            <span className="text-[10px] text-3s-gray-medium uppercase font-bold tracking-wider">Mouvements Totaux</span>
            <span className="text-2xl font-black text-3s-black">{movements.length}</span>
          </div>
          <div className="flex-1 card-3s p-4 flex flex-col justify-center border-l-4 border-l-green-500 relative overflow-hidden">
            <Calendar className="absolute -right-2 -bottom-2 w-12 h-12 text-green-50 opacity-50" />
            <span className="text-[10px] text-3s-gray-medium uppercase font-bold tracking-wider">Dernier mouvement</span>
            <span className="text-sm font-bold text-3s-black truncate">
              {movements.length > 0 ? formatDate(movements[0].createdAt).date : 'Aucun'}
            </span>
          </div>
        </div>
      </div>

      {/* Movement Form Card */}
      <div className="card-3s overflow-hidden relative group">
        <div className="absolute top-0 left-0 w-1 h-full bg-3s-blue group-hover:w-2 transition-all"></div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Plus className="w-6 h-6 text-3s-blue" />
            </div>
            <h2 className="text-lg font-bold text-3s-black">Enregistrer un mouvement</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 items-end">
            <div className="xl:col-span-2">
              <label className="block text-xs font-bold text-3s-gray-medium uppercase tracking-wider mb-2">Composant</label>
              <select
                value={selectedComponent}
                onChange={(e) => setSelectedComponent(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all shadow-sm"
              >
                <option value="">Sélectionner un composant...</option>
                {components.map(c => (
                  <option key={c.id} value={c.id}>{c.designation} ({c.quantity} en stock)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-3s-gray-medium uppercase tracking-wider mb-2">Type</label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as 'in' | 'out' | 'adjustment')}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all shadow-sm"
              >
                <option value="in">Entrée (+)</option>
                <option value="out">Sortie (-)</option>
                <option value="adjustment">Ajustement (~)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-3s-gray-medium uppercase tracking-wider mb-2">Quantité</label>
              <input
                type="number"
                min="0"
                value={movementQuantity}
                onChange={(e) => setMovementQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all shadow-sm text-center font-bold"
              />
            </div>

            <button
              onClick={handleMovement}
              disabled={!selectedComponent || movementQuantity <= 0}
              className="btn-3s-primary h-[50px] flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
            >
              <TrendingUp className="w-5 h-5" />
              <span>Valider</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-xs font-bold text-3s-gray-medium uppercase tracking-wider mb-2">Prix unitaire (optionnel)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.0001"
                  value={movementPrice}
                  onChange={(e) => setMovementPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all shadow-sm"
                  placeholder="0.0000"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-3s-gray-medium uppercase tracking-wider mb-2">Raison du mouvement</label>
              <input
                type="text"
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder="Ex: Réception commande #123, Inventaire physique..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* List Header & Controls */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-3s-gray-medium" />
            <h2 className="text-lg font-bold text-3s-black">Journal d'audit historique</h2>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-3s-blue outline-none shadow-sm"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-3s-blue shadow-sm"
            >
              <option value="all">Tous types</option>
              <option value="in">Entrées</option>
              <option value="out">Sorties</option>
              <option value="adjustment">Ajustements</option>
            </select>
          </div>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <Info className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-3s-black">Aucun mouvement trouvé</h3>
            <p className="text-3s-gray-medium">Essayez de modifier vos filtres ou enregistrez votre premier mouvement.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredMovements.map((m) => {
              const status = statusMap[m.type];
              const Icon = status.icon;
              const dt = formatDate(m.createdAt);
              const component = components.find(c => c.id === m.componentId);

              return (
                <div key={m.id} className="card-3s group hover:border-3s-blue/30 transition-all overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start p-4 gap-4">
                    {/* Component Vision */}
                    <div className="w-20 h-20 bg-gray-50 rounded-xl border border-gray-100 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                      {component?.imageUrl ? (
                        <img src={getImageUrl(component.imageUrl)} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <Package className="w-8 h-8 text-gray-200" />
                      )}
                    </div>

                    {/* Detail Section */}
                    <div className="flex-1 min-w-0 w-full font-inter">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                        <div>
                          <h3 className="font-bold text-3s-black truncate max-w-[200px] leading-tight">
                            {m.componentDesignation || m.componentName}
                          </h3>
                          <p className="text-[10px] text-3s-gray-medium font-mono uppercase tracking-tight truncate">
                            Ref: {m.componentId}
                          </p>
                        </div>
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${status.color}`}>
                          <Icon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-gray-50 mb-3 bg-gray-50/30 -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:border-y-0">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-3s-gray-medium uppercase">Quantité</span>
                          <span className={`text-sm font-black ${m.type === 'in' ? 'text-green-600' : m.type === 'out' ? 'text-3s-red' : 'text-3s-blue'}`}>
                            {m.type === 'out' ? '-' : m.type === 'in' ? '+' : ''}{m.quantity}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-3s-gray-medium uppercase">Prix Unit.</span>
                          <span className="text-sm font-bold text-3s-black">{m.unitPrice ? formatPriceCurrency(m.unitPrice) : '-'}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-black text-3s-gray-medium uppercase">Total Ligne</span>
                          <span className="text-sm font-black text-gray-800">
                            {m.unitPrice ? formatPriceCurrency(m.unitPrice * m.quantity) : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-[10px] text-3s-gray-medium italic">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{m.userName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{dt.date} • {dt.time}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 group/reason max-w-[150px] relative">
                          <Info className="w-3 h-3 text-3s-blue shrink-0" />
                          <span className="text-[10px] font-medium text-3s-black truncate" title={m.reason}>
                            {m.reason}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockMovements;
