import React, { useMemo, useState } from 'react';
import { Search, Download, Package } from 'lucide-react';
import { useData } from '../../hooks/useData';
import * as XLSX from 'xlsx';

type StateKey = 'sold' | 'defective' | 'pcbRemaining';

interface Props {
  stateKey: StateKey;
  title: string;
  subtitle: string;
  accent: string;       // classe texte tailwind, ex: text-green-600
  accentBar: string;    // classe bg tailwind pour la barre, ex: bg-green-500
}

const ProductStateView: React.FC<Props> = ({ stateKey, title, subtitle, accent, accentBar }) => {
  const { products } = useData();
  const [search, setSearch] = useState('');
  const [onlyNonZero, setOnlyNonZero] = useState(true);

  const rows = useMemo(() => {
    return products
      .map((p: any) => {
        const total = (Number(p.pcbRemaining) || 0) + (Number(p.inProgress) || 0) +
          (Number(p.assembledFinished) || 0) + (Number(p.sold) || 0) + (Number(p.defective) || 0);
        const value = Number(p[stateKey]) || 0;
        return { id: p.id, name: p.name, productNumber: p.productNumber || '', value, total };
      })
      .filter((r) => (onlyNonZero ? r.value > 0 : true))
      .filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.productNumber.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.value - a.value);
  }, [products, stateKey, search, onlyNonZero]);

  const stats = useMemo(() => {
    const totalValue = rows.reduce((s, r) => s + r.value, 0);
    const topRow = rows[0];
    return { totalValue, count: rows.length, top: topRow ? topRow.name : '—', topVal: topRow ? topRow.value : 0 };
  }, [rows]);

  const exportToExcel = () => {
    const data = rows.map((r) => ({
      'Produit': r.name,
      'Référence': r.productNumber,
      [title]: r.value,
      'Total modules': r.total,
      'Part (%)': r.total > 0 ? Math.round((r.value / r.total) * 100) : 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 28));
    XLSX.writeFile(wb, `${stateKey}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6 bg-3s-gray-light min-h-full font-inter">
      <div>
        <h1 className="text-2xl font-bold text-3s-black">{title}</h1>
        <p className="text-3s-gray-medium mt-1 text-sm">{subtitle}</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card-3s p-4">
          <p className="text-[11px] font-bold text-3s-gray-medium uppercase tracking-wider">Total</p>
          <p className={`text-3xl font-black mt-1 ${accent}`}>{stats.totalValue.toLocaleString('fr-FR')}</p>
        </div>
        <div className="card-3s p-4">
          <p className="text-[11px] font-bold text-3s-gray-medium uppercase tracking-wider">Produits concernés</p>
          <p className="text-3xl font-black text-3s-black mt-1">{stats.count}</p>
        </div>
        <div className="card-3s p-4">
          <p className="text-[11px] font-bold text-3s-gray-medium uppercase tracking-wider">Produit en tête</p>
          <p className="text-base font-black text-3s-black mt-2 truncate">{stats.top}</p>
          <p className={`text-xs font-bold ${accent}`}>{stats.topVal.toLocaleString('fr-FR')}</p>
        </div>
      </div>

      {/* Contrôles */}
      <div className="card-3s p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Rechercher un produit..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-3s-blue focus:bg-white outline-none" />
        </div>
        <label className="flex items-center gap-2 text-sm text-3s-gray-medium px-2 select-none cursor-pointer">
          <input type="checkbox" checked={onlyNonZero} onChange={(e) => setOnlyNonZero(e.target.checked)} /> Masquer les zéros
        </label>
        <button onClick={exportToExcel} className="flex items-center justify-center gap-2 px-4 py-2 bg-3s-black text-white rounded-lg hover:bg-gray-800 transition-all text-sm font-medium"><Download className="w-4 h-4" /> Exporter</button>
      </div>

      {/* Tableau */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <Package className="w-16 h-16 text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold text-3s-black">Aucun produit</h3>
          <p className="text-3s-gray-medium text-sm">Aucune donnée pour ce critère.</p>
        </div>
      ) : (
        <div className="card-3s overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-3s-gray-medium text-[11px] uppercase tracking-wider">
                  <th className="text-left font-bold px-4 py-3">Produit</th>
                  <th className="text-right font-bold px-4 py-3">{title}</th>
                  <th className="text-right font-bold px-4 py-3 hidden sm:table-cell">Total modules</th>
                  <th className="text-left font-bold px-4 py-3 w-1/3 hidden md:table-cell">Part</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => {
                  const pct = r.total > 0 ? Math.round((r.value / r.total) * 100) : 0;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-3s-black">{r.name}</div>
                        <div className="text-[11px] text-3s-gray-medium font-mono">{r.productNumber}</div>
                      </td>
                      <td className={`px-4 py-3 text-right font-black ${accent}`}>{r.value.toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-3 text-right text-3s-black hidden sm:table-cell">{r.total.toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden"><div className={`h-3 rounded-full ${accentBar}`} style={{ width: `${pct}%` }} /></div>
                          <span className="w-9 text-right text-[11px] font-bold text-3s-gray-medium">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductStateView;
