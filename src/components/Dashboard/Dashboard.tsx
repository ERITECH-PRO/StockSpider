import React, { useMemo } from 'react';
import { Package, Box, AlertTriangle, DollarSign, Activity, BarChart3, ShoppingCart, Layers } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { formatPriceCurrency } from '../../utils/priceFormatter';

const STATE_META = [
  { key: 'pcbRemaining', label: 'PCB nus', color: '#9ca3af' },
  { key: 'inProgress', label: 'En cours', color: '#eab308' },
  { key: 'assembledFinished', label: 'Assemblés', color: '#2563eb' },
  { key: 'sold', label: 'Vendus', color: '#16a34a' },
  { key: 'defective', label: 'En panne', color: '#dc2626' },
] as const;

const Dashboard = () => {
  const { getDashboardStats, getLowStockComponents, products, components } = useData();
  const stats = getDashboardStats();
  const lowStockComponents = getLowStockComponents();

  // Répartition de production (5 états) agrégée depuis MySQL
  const production = useMemo(() => {
    const totals: Record<string, number> = { pcbRemaining: 0, inProgress: 0, assembledFinished: 0, sold: 0, defective: 0 };
    products.forEach((p: any) => {
      STATE_META.forEach((s) => { totals[s.key] += Number(p[s.key]) || 0; });
    });
    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    return { totals, total };
  }, [products]);

  // Répartition des composants par catégorie
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    components.forEach((c) => { map[c.category] = (map[c.category] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [components]);
  const maxCat = byCategory.length ? byCategory[0][1] : 1;

  // Synthèse approvisionnement (besoin = (PCB + en cours) × BOM − stock)
  const procurement = useMemo(() => {
    const need: Record<string, number> = {};
    products.forEach((p: any) => {
      const target = (Number(p.pcbRemaining) || 0) + (Number(p.inProgress) || 0);
      if (target <= 0) return;
      (p.components || []).forEach((bl: any) => {
        if (!bl.componentId) return;
        need[bl.componentId] = (need[bl.componentId] || 0) + (Number(bl.quantity) || 0) * target;
      });
    });
    let refs = 0, units = 0, cost = 0;
    components.forEach((c) => {
      const required = need[c.id] || 0;
      const toBuy = Math.max(0, required - (Number(c.quantity) || 0));
      if (toBuy > 0) { refs += 1; units += toBuy; cost += toBuy * (Number(c.unitPrice) || 0); }
    });
    return { refs, units, cost };
  }, [products, components]);

  const StatCard = ({ title, value, icon: Icon, color, bg }: any) => (
    <div className="card-3s p-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3s-gray-medium text-xs font-bold uppercase tracking-wider font-inter">{title}</p>
          <p className={`text-3xl font-black ${color} mt-2 font-inter`}>{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${bg}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  const pct = (v: number) => (production.total > 0 ? Math.round((v / production.total) * 100) : 0);

  return (
    <div className="p-6 space-y-6 bg-3s-gray-light min-h-full">
      {/* Stats principales — données réelles MySQL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-fade-in">
        <StatCard title="Composants" value={stats.totalComponents} icon={Package} color="text-3s-blue" bg="bg-blue-50" />
        <StatCard title="Produits finis" value={stats.totalProducts} icon={Box} color="text-green-600" bg="bg-green-50" />
        <StatCard title="Alertes stock" value={stats.lowStockAlerts} icon={AlertTriangle} color="text-3s-red" bg="bg-red-50" />
        <StatCard title="Valeur stock" value={formatPriceCurrency(stats.totalValue)} icon={DollarSign} color="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* Production SpiderRoll — 5 états réels */}
      <div className="card-3s p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-3s-black font-inter flex items-center gap-2">
            <Layers className="w-5 h-5 text-3s-blue" /> Production SpiderRoll
          </h3>
          <span className="text-sm font-bold text-3s-gray-medium">{production.total.toLocaleString('fr-FR')} modules</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {STATE_META.map((s) => (
            <div key={s.key} className="text-center bg-gray-50 rounded-xl py-3 border border-gray-100">
              <div className="text-2xl font-black" style={{ color: s.color }}>{production.totals[s.key].toLocaleString('fr-FR')}</div>
              <div className="text-[11px] font-bold text-3s-gray-medium uppercase tracking-tight mt-0.5">{s.label}</div>
              <div className="text-[10px] text-gray-400">{pct(production.totals[s.key])}%</div>
            </div>
          ))}
        </div>
        {/* Barre de proportion */}
        <div className="flex h-3 w-full rounded-full overflow-hidden bg-gray-100">
          {STATE_META.map((s) => (
            <div key={s.key} style={{ width: `${pct(production.totals[s.key])}%`, background: s.color }} title={`${s.label}: ${production.totals[s.key]}`} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approvisionnement (calculé depuis BOM + stock) */}
        <div className="card-3s p-6 animate-fade-in">
          <h3 className="text-lg font-bold text-3s-black font-inter flex items-center gap-2 mb-5">
            <ShoppingCart className="w-5 h-5 text-3s-red" /> Approvisionnement requis
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-3xl font-black text-3s-red">{procurement.refs}</p>
              <p className="text-xs font-bold text-3s-gray-medium uppercase mt-1">Réf. à commander</p>
            </div>
            <div>
              <p className="text-3xl font-black text-3s-black">{procurement.units.toLocaleString('fr-FR')}</p>
              <p className="text-xs font-bold text-3s-gray-medium uppercase mt-1">Pièces</p>
            </div>
            <div>
              <p className="text-2xl font-black text-green-600">{formatPriceCurrency(procurement.cost)}</p>
              <p className="text-xs font-bold text-3s-gray-medium uppercase mt-1">Coût estimé</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-4">Base : (PCB nus + en cours) × nomenclatures − stock réel.</p>
        </div>

        {/* Répartition par catégorie — vrai graphique (barres) */}
        <div className="card-3s p-6 animate-fade-in">
          <h3 className="text-lg font-bold text-3s-black font-inter flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-purple-600" /> Composants par catégorie
          </h3>
          {byCategory.length === 0 ? (
            <p className="text-sm text-3s-gray-medium">Aucun composant.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {byCategory.map(([cat, n]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-28 text-xs font-bold text-3s-gray-medium capitalize truncate">{cat}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className="h-4 bg-3s-blue rounded-full" style={{ width: `${Math.max(6, (n / maxCat) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-black text-3s-black">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock critique — réel */}
        <div className="card-3s animate-fade-in">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-3s-black font-inter flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-3s-red" /> Composants en stock critique
            </h3>
          </div>
          <div className="p-5">
            {lowStockComponents.length === 0 ? (
              <div className="text-center py-10">
                <Package className="w-10 h-10 text-green-600 mx-auto mb-3" />
                <p className="text-3s-gray-medium font-inter text-sm">Aucun composant en stock critique</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockComponents.slice(0, 6).map((component) => (
                  <div key={component.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="min-w-0">
                      <p className="font-bold text-3s-black font-inter truncate">{component.designation}</p>
                      <p className="text-xs text-3s-gray-medium font-inter truncate">{component.name}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-3s-red font-black font-inter">{component.quantity}</p>
                      <p className="text-[10px] text-gray-500 font-inter">Min: {component.minStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mouvements récents — réel (MySQL) */}
        <div className="card-3s animate-fade-in">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-bold text-3s-black font-inter flex items-center gap-2">
              <Activity className="w-5 h-5 text-3s-blue" /> Mouvements récents
            </h3>
          </div>
          <div className="p-5">
            {stats.recentMovements.length === 0 ? (
              <div className="text-center py-10">
                <Activity className="w-10 h-10 text-3s-blue mx-auto mb-3" />
                <p className="text-3s-gray-medium font-inter text-sm">Aucun mouvement récent</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                    <div className="min-w-0">
                      <p className="font-bold text-3s-black font-inter truncate">{movement.reason}</p>
                      <p className="text-xs text-3s-gray-medium font-inter">{new Date(movement.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-inter shrink-0 ml-3 ${
                      movement.type === 'in' ? 'bg-green-100 text-green-700'
                        : movement.type === 'out' ? 'bg-red-100 text-3s-red'
                        : 'bg-blue-100 text-3s-blue'
                    }`}>
                      {movement.type === 'in' && '+'}{movement.type === 'out' && '-'}{movement.quantity}
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
