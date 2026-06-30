import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Coins, Package, Percent, AlertTriangle, Boxes } from 'lucide-react';
import { apiService } from '../../services/api';
import { formatPriceCurrency } from '../../utils/priceFormatter';

interface Summary {
  componentStockValue: number; finishedGoodsCostValue: number; finishedGoodsSaleValue: number;
  potentialBenefit: number; totalStockValue: number; avgMarginPercent: number; avgCostPerModule: number;
  pricedCount: number; lowMarginCount: number; deficitCount: number;
  mostProfitable: { name: string; marginPercent: number; margin: number }[];
  deficit: { name: string; marginPercent: number; margin: number }[];
  lowMargin: { name: string; marginPercent: number }[];
}
interface Row { id: string; name: string; marginPercent: number; priced: boolean; }

const FinancialAnalysis: React.FC = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.getFinanceOverview();
        setSummary(res.summary);
        setRows((res.rows || []).filter((r: any) => r.priced));
      } catch (e) { console.error('Erreur analyse financière:', e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-3s-blue border-t-transparent"></div>
        <p className="text-3s-gray-medium animate-pulse">Analyse financière en cours...</p>
      </div>
    );
  }
  if (!summary) return <div className="p-6 text-3s-gray-medium">Données indisponibles. La migration SQL est-elle appliquée ?</div>;

  const maxMargin = rows.length ? Math.max(...rows.map((r) => r.marginPercent), 1) : 1;

  const Kpi = ({ label, value, icon: Icon, color }: any) => (
    <div className="card-3s p-5">
      <div className="flex items-center justify-between">
        <div><p className="text-xs font-bold text-3s-gray-medium uppercase tracking-wider">{label}</p><p className={`text-2xl font-black mt-1 ${color}`}>{value}</p></div>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-3s-gray-light min-h-full font-inter">
      <div>
        <h1 className="text-2xl font-bold text-3s-black">Analyse financière</h1>
        <p className="text-3s-gray-medium mt-1 text-sm">Rentabilité, valeur du stock et bénéfice potentiel — 100 % MySQL.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Valeur stock totale" value={formatPriceCurrency(summary.totalStockValue)} icon={Boxes} color="text-3s-black" />
        <Kpi label="Valeur composants" value={formatPriceCurrency(summary.componentStockValue)} icon={Package} color="text-3s-blue" />
        <Kpi label="Bénéfice potentiel" value={formatPriceCurrency(summary.potentialBenefit)} icon={Coins} color="text-green-600" />
        <Kpi label="Marge moyenne" value={summary.avgMarginPercent.toFixed(1) + '%'} icon={Percent} color="text-purple-600" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Coût moyen / module" value={formatPriceCurrency(summary.avgCostPerModule)} icon={Coins} color="text-3s-black" />
        <Kpi label="Valeur stock (vente)" value={formatPriceCurrency(summary.finishedGoodsSaleValue)} icon={TrendingUp} color="text-green-600" />
        <Kpi label="Produits faible marge" value={summary.lowMarginCount} icon={AlertTriangle} color="text-orange-500" />
        <Kpi label="Produits déficitaires" value={summary.deficitCount} icon={TrendingDown} color="text-3s-red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Marge par produit */}
        <div className="card-3s p-6">
          <h3 className="text-lg font-bold text-3s-black mb-5 flex items-center gap-2"><Percent className="w-5 h-5 text-purple-600" /> Marge % par produit</h3>
          {rows.length === 0 ? <p className="text-sm text-3s-gray-medium">Aucun produit avec prix.</p> : (
            <div className="space-y-2">
              {[...rows].sort((a, b) => b.marginPercent - a.marginPercent).map((r) => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="w-32 text-xs font-bold text-3s-gray-medium truncate">{r.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className={`h-4 rounded-full ${r.marginPercent >= 30 ? 'bg-green-500' : r.marginPercent > 0 ? 'bg-orange-400' : 'bg-red-500'}`} style={{ width: `${Math.max(4, (r.marginPercent / maxMargin) * 100)}%` }} />
                  </div>
                  <span className="w-12 text-right text-xs font-black text-3s-black">{r.marginPercent.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plus rentables / déficitaires */}
        <div className="space-y-6">
          <div className="card-3s p-6">
            <h3 className="text-lg font-bold text-3s-black mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-600" /> Produits les plus rentables</h3>
            {summary.mostProfitable.length === 0 ? <p className="text-sm text-3s-gray-medium">—</p> : (
              <div className="space-y-2">
                {summary.mostProfitable.map((p) => (
                  <div key={p.name} className="flex items-center justify-between p-2.5 bg-green-50 rounded-lg border border-green-100">
                    <span className="font-bold text-3s-black text-sm">{p.name}</span>
                    <span className="text-sm font-black text-green-600">{p.marginPercent.toFixed(1)}% · {formatPriceCurrency(p.margin)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card-3s p-6">
            <h3 className="text-lg font-bold text-3s-black mb-4 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-3s-red" /> Produits déficitaires</h3>
            {summary.deficit.length === 0 ? (
              <div className="text-center py-6"><Package className="w-8 h-8 text-green-600 mx-auto mb-2" /><p className="text-sm text-3s-gray-medium">Aucun produit déficitaire</p></div>
            ) : (
              <div className="space-y-2">
                {summary.deficit.map((p) => (
                  <div key={p.name} className="flex items-center justify-between p-2.5 bg-red-50 rounded-lg border border-red-100">
                    <span className="font-bold text-3s-black text-sm">{p.name}</span>
                    <span className="text-sm font-black text-3s-red">{p.marginPercent.toFixed(1)}%</span>
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

export default FinancialAnalysis;
