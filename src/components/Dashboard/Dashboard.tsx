import React, { useEffect, useState } from 'react';
import { Package, Box, AlertTriangle, DollarSign, Activity, BarChart3, ShoppingCart, Layers, Ban, XCircle } from 'lucide-react';
import { apiService } from '../../services/api';
import { formatPriceCurrency } from '../../utils/priceFormatter';

const STATE_META = [
  { key: 'pcbRemaining', label: 'PCB nus', color: '#9ca3af' },
  { key: 'inProgress', label: 'En cours', color: '#eab308' },
  { key: 'assembledFinished', label: 'Assemblés', color: '#2563eb' },
  { key: 'sold', label: 'Vendus', color: '#16a34a' },
  { key: 'defective', label: 'En panne', color: '#dc2626' },
] as const;

interface Overview {
  counts: { totalComponents: number; totalProducts: number; lowStockAlerts: number; outOfStock: number; totalValue: number };
  production: Record<string, number>;
  categoryDistribution: { category: string; count: number }[];
  criticalComponents: { id: string; designation: string; name: string; quantity: number; minStock: number }[];
  recentMovements: { id: string; type: string; quantity: number; reason: string; createdAt: string; componentName?: string }[];
  procurement: { refsToOrder: number; unitsToBuy: number; totalCost: number; blockedCount: number };
  blockedProducts: { productId: string; name: string; target: number; missing: string[] }[];
}

const Dashboard = () => {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setData(await apiService.getDashboardOverview()); }
      catch (e) { console.error('Erreur overview dashboard:', e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-3s-blue border-t-transparent"></div>
        <p className="text-3s-gray-medium animate-pulse">Chargement du tableau de bord...</p>
      </div>
    );
  }
  if (!data) return <div className="p-6 text-3s-gray-medium">Impossible de charger les données.</div>;

  const { counts, production, categoryDistribution, criticalComponents, recentMovements, procurement, blockedProducts } = data;
  const prodTotal = STATE_META.reduce((s, m) => s + (Number(production[m.key]) || 0), 0);
  const pct = (v: number) => (prodTotal > 0 ? Math.round((v / prodTotal) * 100) : 0);
  const maxCat = categoryDistribution.length ? Math.max(...categoryDistribution.map((c) => c.count)) : 1;

  const StatCard = ({ title, value, icon: Icon, color, bg }: any) => (
    <div className="card-3s p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3s-gray-medium text-xs font-bold uppercase tracking-wider">{title}</p>
          <p className={`text-3xl font-black ${color} mt-2`}>{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${bg}`}><Icon className={`w-6 h-6 ${color}`} /></div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-3s-gray-light min-h-full font-inter">
      {/* Stats principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Composants" value={counts.totalComponents} icon={Package} color="text-3s-blue" bg="bg-blue-50" />
        <StatCard title="Produits finis" value={counts.totalProducts} icon={Box} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Alertes stock" value={counts.lowStockAlerts} icon={AlertTriangle} color="text-3s-red" bg="bg-red-50" />
        <StatCard title="Valeur stock" value={formatPriceCurrency(counts.totalValue)} icon={DollarSign} color="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* Production SpiderRoll — 5 états */}
      <div className="card-3s p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-3s-black flex items-center gap-2"><Layers className="w-5 h-5 text-3s-blue" /> Production SpiderRoll</h3>
          <span className="text-sm font-bold text-3s-gray-medium">{prodTotal.toLocaleString('fr-FR')} modules</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {STATE_META.map((s) => (
            <div key={s.key} className="text-center bg-gray-50 rounded-xl py-3 border border-gray-100">
              <div className="text-2xl font-black" style={{ color: s.color }}>{(Number(production[s.key]) || 0).toLocaleString('fr-FR')}</div>
              <div className="text-[11px] font-bold text-3s-gray-medium uppercase tracking-tight mt-0.5">{s.label}</div>
              <div className="text-[10px] text-gray-400">{pct(Number(production[s.key]) || 0)}%</div>
            </div>
          ))}
        </div>
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-gray-100">
          {STATE_META.map((s) => (
            <div key={s.key} style={{ width: `${pct(Number(production[s.key]) || 0)}%`, background: s.color }} title={`${s.label}: ${production[s.key]}`} />
          ))}
        </div>
      </div>

      {/* Approvisionnement + Ruptures + Bloqués */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-3s p-5">
          <h3 className="text-sm font-bold text-3s-black flex items-center gap-2 mb-4"><ShoppingCart className="w-4 h-4 text-3s-red" /> Approvisionnement requis</h3>
          <div className="grid grid-cols-3 gap-3">
            <div><p className="text-2xl font-black text-3s-red">{procurement.refsToOrder}</p><p className="text-[10px] font-bold text-3s-gray-medium uppercase mt-1">Réf.</p></div>
            <div><p className="text-2xl font-black text-3s-black">{procurement.unitsToBuy.toLocaleString('fr-FR')}</p><p className="text-[10px] font-bold text-3s-gray-medium uppercase mt-1">Pièces</p></div>
            <div><p className="text-xl font-black text-green-600">{formatPriceCurrency(procurement.totalCost)}</p><p className="text-[10px] font-bold text-3s-gray-medium uppercase mt-1">Coût</p></div>
          </div>
        </div>
        <div className="card-3s p-5">
          <h3 className="text-sm font-bold text-3s-black flex items-center gap-2 mb-4"><XCircle className="w-4 h-4 text-3s-red" /> Ruptures de stock</h3>
          <p className="text-4xl font-black text-3s-red">{counts.outOfStock}</p>
          <p className="text-[11px] text-3s-gray-medium mt-1">composants à 0 en stock</p>
        </div>
        <div className="card-3s p-5">
          <h3 className="text-sm font-bold text-3s-black flex items-center gap-2 mb-4"><Ban className="w-4 h-4 text-orange-500" /> Produits bloqués</h3>
          <p className="text-4xl font-black text-orange-500">{procurement.blockedCount}</p>
          <p className="text-[11px] text-3s-gray-medium mt-1">produits sans composants suffisants</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composants par catégorie */}
        <div className="card-3s p-6">
          <h3 className="text-lg font-bold text-3s-black flex items-center gap-2 mb-5"><BarChart3 className="w-5 h-5 text-purple-600" /> Composants par catégorie</h3>
          {categoryDistribution.length === 0 ? <p className="text-sm text-3s-gray-medium">Aucun composant.</p> : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {categoryDistribution.map((c) => (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="w-28 text-xs font-bold text-3s-gray-medium capitalize truncate">{c.category}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden"><div className="h-4 bg-3s-blue rounded-full" style={{ width: `${Math.max(6, (c.count / maxCat) * 100)}%` }} /></div>
                  <span className="w-8 text-right text-xs font-black text-3s-black">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Produits bloqués (détail) */}
        <div className="card-3s p-6">
          <h3 className="text-lg font-bold text-3s-black flex items-center gap-2 mb-5"><Ban className="w-5 h-5 text-orange-500" /> Produits bloqués par manque de composants</h3>
          {blockedProducts.length === 0 ? (
            <div className="text-center py-8"><Package className="w-10 h-10 text-green-600 mx-auto mb-2" /><p className="text-sm text-3s-gray-medium">Aucun produit bloqué</p></div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {blockedProducts.map((b) => (
                <div key={b.productId} className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-3s-black text-sm">{b.name}</span>
                    <span className="text-[10px] font-bold text-orange-600">cible : {b.target}</span>
                  </div>
                  <p className="text-[11px] text-3s-gray-medium mt-1 truncate" title={b.missing.join(', ')}>Manque : {b.missing.join(', ')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composants critiques */}
        <div className="card-3s">
          <div className="p-5 border-b border-gray-100"><h3 className="text-lg font-bold text-3s-black flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-3s-red" /> Composants en stock critique</h3></div>
          <div className="p-5">
            {criticalComponents.length === 0 ? (
              <div className="text-center py-10"><Package className="w-10 h-10 text-green-600 mx-auto mb-3" /><p className="text-3s-gray-medium text-sm">Aucun composant en stock critique</p></div>
            ) : (
              <div className="space-y-2">
                {criticalComponents.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="min-w-0"><p className="font-bold text-3s-black truncate">{c.designation}</p><p className="text-xs text-3s-gray-medium truncate">{c.name}</p></div>
                    <div className="text-right shrink-0 ml-3"><p className="text-3s-red font-black">{c.quantity}</p><p className="text-[10px] text-gray-500">Min: {c.minStock}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mouvements récents */}
        <div className="card-3s">
          <div className="p-5 border-b border-gray-100"><h3 className="text-lg font-bold text-3s-black flex items-center gap-2"><Activity className="w-5 h-5 text-3s-blue" /> Mouvements récents</h3></div>
          <div className="p-5">
            {recentMovements.length === 0 ? (
              <div className="text-center py-10"><Activity className="w-10 h-10 text-3s-blue mx-auto mb-3" /><p className="text-3s-gray-medium text-sm">Aucun mouvement récent</p></div>
            ) : (
              <div className="space-y-2">
                {recentMovements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                    <div className="min-w-0"><p className="font-bold text-3s-black truncate">{m.reason}</p><p className="text-xs text-3s-gray-medium">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</p></div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ml-3 ${m.type === 'in' ? 'bg-green-100 text-green-700' : m.type === 'out' ? 'bg-red-100 text-3s-red' : 'bg-blue-100 text-3s-blue'}`}>
                      {m.type === 'in' && '+'}{m.type === 'out' && '-'}{m.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
