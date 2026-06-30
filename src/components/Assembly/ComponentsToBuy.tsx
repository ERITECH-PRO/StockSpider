import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingCart, CheckCircle, X, Search, Download, Package,
  SlidersHorizontal, AlertTriangle, Layers, Coins, ListChecks
} from 'lucide-react';
import { useDataContext } from '../../contexts/DataContext';
import { apiService } from '../../services/api';
import * as XLSX from 'xlsx';
import { formatPrice } from '../../utils/priceFormatter';

interface ProcurementRow {
  componentId: string;
  designation: string;
  productNumber: string;
  category: string;
  supplier: string;
  unitPrice: number;
  required: number;
  available: number;
  toBuy: number;
  totalCost: number;
}

const ComponentsToBuy: React.FC = () => {
  const { products, updateStock, reloadComponents } = useDataContext();

  const [rows, setRows] = useState<ProcurementRow[]>([]);
  const [summary, setSummary] = useState({ refsToOrder: 0, refsSufficient: 0, unitsToBuy: 0, totalCost: 0 });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'to-order' | 'sufficient' | 'all'>('to-order');
  const [showPlan, setShowPlan] = useState(false);

  // Plan de production éphémère (non persisté). Vide => base auto = pcb_remaining + in_progress.
  const [plan, setPlan] = useState<Record<string, number>>({});

  // Le calcul métier est fait par le backend : ici on ne fait qu'afficher.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getProcurement(plan);
      setRows(res.rows || []);
      setSummary(res.summary || { refsToOrder: 0, refsSufficient: 0, unitsToBuy: 0, totalCost: 0 });
    } catch (e) {
      console.error('Erreur chargement approvisionnement:', e);
    } finally {
      setLoading(false);
    }
  }, [plan]);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => Array.from(new Set(rows.map((r) => r.category))).sort(), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter === 'to-order' && r.toBuy <= 0) return false;
      if (statusFilter === 'sufficient' && r.toBuy > 0) return false;
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.designation.toLowerCase().includes(q) && !r.productNumber.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, categoryFilter, searchQuery]);

  const exportToExcel = () => {
    const data = filtered.map((r) => ({
      'Désignation': r.designation,
      'Référence': r.productNumber,
      'Catégorie': r.category,
      'Fournisseur': r.supplier,
      'Besoin': r.required,
      'Stock': r.available,
      'À acheter': r.toBuy,
      'Prix unitaire (€)': r.unitPrice,
      'Coût ligne (€)': r.totalCost,
      'Statut': r.toBuy > 0 ? 'À commander' : 'Suffisant',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Composants à acheter');
    XLSX.writeFile(wb, `approvisionnement-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const validatePurchase = async (r: ProcurementRow) => {
    if (r.toBuy <= 0) return;
    setWorking(r.componentId);
    try {
      await updateStock(r.componentId, r.toBuy, 'in', `Approvisionnement validé : ${r.designation}`);
      await Promise.all([reloadComponents(), load()]);
    } catch (e) {
      console.error('Erreur validation achat:', e);
    } finally {
      setWorking(null);
    }
  };

  const resetFilters = () => { setSearchQuery(''); setCategoryFilter(''); setStatusFilter('to-order'); };
  const catLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);

  return (
    <div className="p-6 space-y-6 bg-3s-gray-light min-h-full font-inter">
      <div>
        <h1 className="text-2xl font-bold text-3s-black">Composants à acheter</h1>
        <p className="text-3s-gray-medium mt-1 text-sm">
          Calcul effectué côté serveur depuis les nomenclatures et le stock réel — base : modules non finis (PCB + en cours), ajustable via un plan de production.
        </p>
      </div>

      {/* KPI (depuis le backend) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-3s p-4 border-l-4 border-l-3s-red">
          <div className="flex items-center gap-2 text-3s-gray-medium text-[11px] font-bold uppercase tracking-wider"><AlertTriangle className="w-3.5 h-3.5" /> Réf. à commander</div>
          <div className="text-3xl font-black text-3s-red mt-1">{summary.refsToOrder}</div>
        </div>
        <div className="card-3s p-4 border-l-4 border-l-3s-blue">
          <div className="flex items-center gap-2 text-3s-gray-medium text-[11px] font-bold uppercase tracking-wider"><Layers className="w-3.5 h-3.5" /> Pièces à acheter</div>
          <div className="text-3xl font-black text-3s-black mt-1">{summary.unitsToBuy.toLocaleString('fr-FR')}</div>
        </div>
        <div className="card-3s p-4 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 text-3s-gray-medium text-[11px] font-bold uppercase tracking-wider"><Coins className="w-3.5 h-3.5" /> Coût estimé</div>
          <div className="text-2xl font-black text-green-600 mt-1">{formatPrice(summary.totalCost)}</div>
        </div>
        <div className="card-3s p-4 border-l-4 border-l-gray-300">
          <div className="flex items-center gap-2 text-3s-gray-medium text-[11px] font-bold uppercase tracking-wider"><ListChecks className="w-3.5 h-3.5" /> Réf. suffisantes</div>
          <div className="text-3xl font-black text-3s-black mt-1">{summary.refsSufficient}</div>
        </div>
      </div>

      {/* Plan de production (envoyé au backend) */}
      <div className="card-3s overflow-hidden">
        <button onClick={() => setShowPlan((s) => !s)} className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors">
          <span className="flex items-center gap-2 font-bold text-3s-black text-sm"><SlidersHorizontal className="w-4 h-4 text-3s-blue" /> Plan de production (optionnel)</span>
          <span className="text-xs text-3s-gray-medium">{showPlan ? 'Masquer' : 'Afficher'} · vide = auto (PCB + en cours)</span>
        </button>
        {showPlan && (
          <div className="border-t border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((p: any) => {
              const auto = (Number(p.pcbRemaining) || 0) + (Number(p.inProgress) || 0);
              const overridden = plan[p.id] !== undefined;
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-3s-black truncate">{p.name}</p>
                    <p className="text-[10px] text-3s-gray-medium">Auto : {auto} (PCB {p.pcbRemaining || 0} + en cours {p.inProgress || 0})</p>
                  </div>
                  <input
                    type="number" min="0"
                    value={overridden ? plan[p.id] : ''}
                    placeholder={String(auto)}
                    onChange={(e) => {
                      const next = { ...plan };
                      if (e.target.value === '') delete next[p.id];
                      else next[p.id] = Math.max(0, parseInt(e.target.value) || 0);
                      setPlan(next);
                    }}
                    className={`w-20 px-2 py-1.5 text-sm text-right rounded-lg border outline-none focus:ring-2 focus:ring-3s-blue ${overridden ? 'border-3s-blue bg-blue-50 font-bold' : 'border-gray-200 bg-white'}`}
                  />
                </div>
              );
            })}
            {Object.keys(plan).length > 0 && (
              <button onClick={() => setPlan({})} className="text-xs text-3s-red font-bold hover:underline justify-self-start">Réinitialiser le plan (revenir à l'auto)</button>
            )}
          </div>
        )}
      </div>

      {/* Barre de contrôle */}
      <div className="card-3s p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Rechercher par désignation ou référence..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-3s-blue focus:bg-white outline-none" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-3s-blue">
          <option value="to-order">À commander</option>
          <option value="sufficient">Suffisant</option>
          <option value="all">Tous</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-3s-blue">
          <option value="">Toutes catégories</option>
          {categories.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
        </select>
        <button onClick={resetFilters} className="p-2 text-gray-400 hover:text-3s-red transition-colors" title="Réinitialiser"><X className="w-5 h-5" /></button>
        <button onClick={exportToExcel} className="flex items-center justify-center gap-2 px-4 py-2 bg-3s-black text-white rounded-lg hover:bg-gray-800 transition-all text-sm font-medium"><Download className="w-4 h-4" /> Exporter</button>
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-3s-blue border-t-transparent"></div>
          <p className="text-3s-gray-medium animate-pulse">Calcul des besoins en cours...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <Package className="w-16 h-16 text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold text-3s-black">Aucun composant à afficher</h3>
          <p className="text-3s-gray-medium text-sm">{statusFilter === 'to-order' ? 'Aucun manque détecté pour le besoin actuel.' : 'Aucun résultat pour ces filtres.'}</p>
        </div>
      ) : (
        <div className="card-3s overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-3s-gray-medium text-[11px] uppercase tracking-wider">
                  <th className="text-left font-bold px-4 py-3">Composant</th>
                  <th className="text-left font-bold px-4 py-3 hidden md:table-cell">Catégorie</th>
                  <th className="text-right font-bold px-4 py-3">Besoin</th>
                  <th className="text-right font-bold px-4 py-3">Stock</th>
                  <th className="text-right font-bold px-4 py-3">À acheter</th>
                  <th className="text-right font-bold px-4 py-3 hidden lg:table-cell">Coût</th>
                  <th className="text-right font-bold px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.componentId} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-3s-black">{r.designation}</div>
                      <div className="text-[11px] text-3s-gray-medium font-mono">{r.productNumber}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-bold capitalize">{r.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-3s-black">{r.required.toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right"><span className={r.available > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}>{r.available.toLocaleString('fr-FR')}</span></td>
                    <td className="px-4 py-3 text-right">
                      {r.toBuy > 0 ? <span className="font-black text-3s-red">{r.toBuy.toLocaleString('fr-FR')}</span>
                        : <span className="inline-flex items-center gap-1 text-green-600 font-bold text-xs"><CheckCircle className="w-3.5 h-3.5" /> OK</span>}
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell text-3s-black">{r.totalCost > 0 ? formatPrice(r.totalCost) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {r.toBuy > 0 ? (
                        <button onClick={() => validatePurchase(r)} disabled={working === r.componentId} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-3s-blue text-white rounded-lg text-xs font-bold hover:bg-3s-blue-dark transition-all disabled:opacity-50">
                          <ShoppingCart className="w-3.5 h-3.5" />{working === r.componentId ? '...' : 'Valider l\'achat'}
                        </button>
                      ) : <span className="text-[11px] text-3s-gray-medium">Suffisant</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComponentsToBuy;
