import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Save, Coins, Layers, RefreshCw } from 'lucide-react';
import { apiService } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { formatPriceCurrency } from '../../utils/priceFormatter';

const STD_LABELS = ['PCB', 'Assemblage', 'Test', 'Emballage', 'Autres'];

interface FinanceRow {
  id: string; name: string;
  componentCost: number; costItems: { label: string; amount: number }[]; costItemsTotal: number;
  costDetailB: number; costPrice: number; recommendedPrice: number;
  margin: number; marginPercent: number; assembledFinished: number; priced: boolean;
}

const CostRevient: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [rows, setRows] = useState<FinanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState<Record<string, Record<string, number>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getFinanceOverview();
      setRows(res.rows || []);
    } catch (e) {
      console.error('Erreur finance:', e);
      showError('Erreur', 'Impossible de charger les données financières. La migration SQL est-elle appliquée ?');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { load(); }, [load]);

  const itemMap = (r: FinanceRow): Record<string, number> => {
    const m: Record<string, number> = {};
    STD_LABELS.forEach((l) => { m[l] = 0; });
    (r.costItems || []).forEach((it) => { m[it.label] = it.amount; });
    return m;
  };

  const getVal = (r: FinanceRow, label: string): number => {
    const e = edits[r.id];
    if (e && e[label] !== undefined) return e[label];
    return itemMap(r)[label] ?? 0;
  };

  const setVal = (id: string, label: string, value: number) => {
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [label]: value } }));
  };

  const liveDetailB = (r: FinanceRow): number => {
    const total = STD_LABELS.reduce((s, l) => s + getVal(r, l), 0);
    return r.componentCost + total;
  };

  const save = async (r: FinanceRow) => {
    setSavingId(r.id);
    try {
      const items = STD_LABELS.map((label) => ({ label, amount: getVal(r, label) }));
      const res = await apiService.updateCostItems(r.id, items);
      setRows(res.rows || []);
      setEdits((prev) => { const n = { ...prev }; delete n[r.id]; return n; });
      showSuccess('Postes enregistrés', r.name);
    } catch (e) {
      showError('Erreur', 'Échec de l\'enregistrement');
    } finally {
      setSavingId(null);
    }
  };

  const filtered = useMemo(
    () => rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-3s-blue border-t-transparent"></div>
        <p className="text-3s-gray-medium animate-pulse">Calcul des coûts de revient...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-3s-gray-light min-h-full font-inter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-3s-black">Coût de revient</h1>
          <p className="text-3s-gray-medium mt-1 text-sm">Méthode A (Achat D/TTC) + méthode B (composants BOM + postes). Calcul backend, 100 % MySQL.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-3s-black bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Rafraîchir
        </button>
      </div>

      <div className="card-3s p-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Rechercher un produit..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-3s-blue focus:bg-white outline-none" />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((r) => {
          const dirty = !!edits[r.id];
          return (
            <div key={r.id} className="card-3s p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-3s-black">{r.name}</h3>
                  <p className="text-[11px] text-3s-gray-medium">{r.assembledFinished} assemblé(s) en stock</p>
                </div>
                <div className="flex flex-wrap gap-4 text-right">
                  <div><p className="text-[10px] uppercase font-bold text-3s-gray-medium">Coût D/TTC (A)</p><p className="text-lg font-black text-3s-black">{formatPriceCurrency(r.costPrice)}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-3s-gray-medium">Prix Gros</p><p className="text-lg font-black text-3s-blue">{r.priced ? formatPriceCurrency(r.recommendedPrice) : '—'}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-3s-gray-medium">Marge</p><p className={`text-lg font-black ${r.margin >= 0 ? 'text-green-600' : 'text-3s-red'}`}>{r.priced ? formatPriceCurrency(r.margin) : '—'}</p></div>
                  <div><p className="text-[10px] uppercase font-bold text-3s-gray-medium">Marge %</p><p className={`text-lg font-black ${r.marginPercent >= 30 ? 'text-green-600' : r.marginPercent > 0 ? 'text-orange-500' : 'text-3s-red'}`}>{r.priced ? r.marginPercent.toFixed(1) + '%' : '—'}</p></div>
                </div>
              </div>

              {/* Détail méthode B */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-3s-gray-medium flex items-center gap-1"><Layers className="w-3 h-3" /> Coût composants</p>
                    <p className="text-base font-black text-3s-black">{formatPriceCurrency(r.componentCost)}</p>
                  </div>
                  {STD_LABELS.map((label) => (
                    <div key={label}>
                      <label className="text-[10px] uppercase font-bold text-3s-gray-medium block mb-1">{label}</label>
                      <input type="number" min={0} step="0.01" value={getVal(r, label)}
                        onChange={(e) => setVal(r.id, label, Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-24 px-2 py-1.5 text-sm text-right rounded-lg border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-3s-blue" />
                    </div>
                  ))}
                  <div className="ml-auto text-right">
                    <p className="text-[10px] uppercase font-bold text-3s-gray-medium flex items-center gap-1 justify-end"><Coins className="w-3 h-3" /> Total détaillé (B)</p>
                    <p className="text-lg font-black text-3s-black">{formatPriceCurrency(liveDetailB(r))}</p>
                  </div>
                  <button onClick={() => save(r)} disabled={!dirty || savingId === r.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-3s-blue hover:bg-3s-blue-dark disabled:opacity-40">
                    <Save className="w-3.5 h-3.5" /> {savingId === r.id ? '...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CostRevient;
