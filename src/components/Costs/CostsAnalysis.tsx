import { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, Package, Calculator, BarChart3, PieChart, ArrowUpRight, AlertCircle } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { formatPriceCurrency, formatPercentage } from '../../utils/priceFormatter';

interface CostAnalysis {
  componentCosts: {
    totalComponentValue: number;
    totalComponents: number;
    averageComponentPrice: number;
  };
  productCosts: Array<{
    id: string;
    name: string;
    productionCost: number;
    sellingPrice: number;
    quantity: number;
    margin: number;
    marginPercentage: number;
  }>;
  categoryAnalysis: Array<{
    category: string;
    componentCount: number;
    totalQuantity: number;
    totalValue: number;
    averagePrice: number;
  }>;
}

const CostsAnalysis = () => {
  const { components, products } = useData();
  const [analysis, setAnalysis] = useState<CostAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateCosts();
  }, [components, products]);

  const calculateCosts = () => {
    // Calculer les coûts des composants
    const totalComponentValue = components.reduce((sum, comp) => sum + (comp.quantity * comp.unitPrice), 0);
    const totalComponents = components.length;
    const totalQuantity = components.reduce((sum, comp) => sum + comp.quantity, 0);
    const averageComponentPrice = totalQuantity > 0 ? totalComponentValue / totalQuantity : 0;

    // Calculer les coûts et marges des produits
    const productCosts = products.map(product => {
      const productionCost = Number(product.productionCost) || 0;
      const sellingPrice = Number(product.sellingPrice) || 0;
      const margin = sellingPrice - productionCost;
      const marginPercentage = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;

      return {
        id: product.id,
        name: product.name,
        productionCost,
        sellingPrice,
        quantity: product.quantity,
        margin,
        marginPercentage
      };
    }).sort((a, b) => b.marginPercentage - a.marginPercentage);

    // Analyse par catégorie
    const categoryMap = new Map();
    components.forEach(comp => {
      const category = comp.category || 'Non classé';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          componentCount: 0,
          totalQuantity: 0,
          totalValue: 0,
          averagePrice: 0
        });
      }

      const cat = categoryMap.get(category);
      cat.componentCount++;
      cat.totalQuantity += comp.quantity;
      cat.totalValue += comp.quantity * comp.unitPrice;
    });

    const categoryAnalysis = Array.from(categoryMap.values()).map(cat => ({
      ...cat,
      averagePrice: cat.totalQuantity > 0 ? cat.totalValue / cat.totalQuantity : 0
    })).sort((a, b) => b.totalValue - a.totalValue);

    setAnalysis({
      componentCosts: {
        totalComponentValue,
        totalComponents,
        averageComponentPrice
      },
      productCosts,
      categoryAnalysis
    });
    setLoading(false);
  };

  const averageMargin = useMemo(() => {
    if (!analysis || analysis.productCosts.length === 0) return 0;
    return analysis.productCosts.reduce((sum, p) => sum + p.marginPercentage, 0) / analysis.productCosts.length;
  }, [analysis]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-3s-blue border-t-transparent shadow-sm"></div>
        <p className="text-3s-gray-medium font-inter animate-pulse">Analyse financière en cours...</p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="p-6 space-y-8 bg-3s-gray-light min-h-full font-inter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-3s-black">Coûts & marges</h1>
          <p className="text-3s-gray-medium mt-1">Analyse de rentabilité et valorisation de l'inventaire.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-card border border-gray-100 text-3s-blue font-bold">
          <Calculator className="w-5 h-5" />
          <span className="text-sm">Mise à jour automatique</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-3s p-6 border-l-4 border-l-3s-blue relative overflow-hidden group">
          <DollarSign className="absolute -right-2 -bottom-2 w-16 h-16 text-blue-50 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] text-3s-gray-medium uppercase font-black tracking-widest">Valeur Inventaire</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-3s-black">{formatPriceCurrency(analysis.componentCosts.totalComponentValue)}</span>
          </div>
          <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            Stock valorisé
          </p>
        </div>

        <div className="card-3s p-6 border-l-4 border-l-green-500 relative overflow-hidden group">
          <TrendingUp className="absolute -right-2 -bottom-2 w-16 h-16 text-green-50 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] text-3s-gray-medium uppercase font-black tracking-widest">Produits Rentables</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-3s-black">{analysis.productCosts.filter(p => p.margin > 0).length}</span>
            <span className="text-xs text-3s-gray-medium font-bold">/ {analysis.productCosts.length}</span>
          </div>
          <p className="text-[10px] text-3s-gray-medium font-bold mt-2">Basé sur prix de vente actuels</p>
        </div>

        <div className="card-3s p-6 border-l-4 border-l-purple-500 relative overflow-hidden group">
          <PieChart className="absolute -right-2 -bottom-2 w-16 h-16 text-purple-50 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] text-3s-gray-medium uppercase font-black tracking-widest">Marge Moyenne</span>
          <div className="mt-2 text-2xl font-black text-3s-black">
            {formatPercentage(averageMargin)}
          </div>
          <div className="w-full bg-gray-100 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, averageMargin))}%` }}></div>
          </div>
        </div>

        <div className="card-3s p-6 border-l-4 border-l-orange-500 relative overflow-hidden group">
          <Package className="absolute -right-2 -bottom-2 w-16 h-16 text-orange-50 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] text-3s-gray-medium uppercase font-black tracking-widest">Valeur Moyenne Item</span>
          <div className="mt-2 text-2xl font-black text-3s-black">
            {formatPriceCurrency(analysis.componentCosts.averageComponentPrice)}
          </div>
          <p className="text-[10px] text-orange-600 font-bold mt-2">Par unité de composant</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product Profitability Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-3s-blue" />
            <h2 className="text-lg font-bold text-3s-black">Santé des marges produits</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.productCosts.map((product) => {
              const marginStatus = product.marginPercentage > 20 ? 'healthy' : product.marginPercentage > 0 ? 'low' : 'negative';
              const statusConfig = {
                healthy: { color: 'text-green-600', bg: 'bg-green-50', bar: 'bg-green-500', label: 'Sain' },
                low: { color: 'text-orange-600', bg: 'bg-orange-50', bar: 'bg-orange-500', label: 'Faible' },
                negative: { color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500', label: 'Critique' }
              };
              const config = statusConfig[marginStatus];

              return (
                <div key={product.id} className="card-3s p-4 group hover:border-3s-blue/50 transition-all cursor-default">
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0">
                      <h3 className="font-bold text-3s-black truncate pr-2 leading-tight">{product.name}</h3>
                      <p className="text-[10px] text-3s-gray-medium font-bold uppercase mt-0.5">Stock: {product.quantity} unités</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${config.bg} ${config.color} border-current/20`}>
                      {config.label}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-3s-gray-medium uppercase">Marge Brut</span>
                        <span className={`text-base font-black ${config.color}`}>{formatPriceCurrency(product.margin)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-3s-gray-medium uppercase">Rentabilité</span>
                        <span className="text-base font-black text-3s-black block">{formatPercentage(product.marginPercentage)}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-3s-gray-medium">
                        <span>COÛT: {formatPriceCurrency(product.productionCost)}</span>
                        <span>VENTE: {formatPriceCurrency(product.sellingPrice)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`${config.bar} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(100, (product.productionCost / product.sellingPrice) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Distribution Grid */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <PieChart className="w-5 h-5 text-3s-blue" />
            <h2 className="text-lg font-bold text-3s-black">Valeur par catégorie</h2>
          </div>

          <div className="space-y-4">
            {analysis.categoryAnalysis.map((cat) => (
              <div key={cat.category} className="card-3s p-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform opacity-30"></div>

                <div className="relative">
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2 py-1 bg-3s-blue/10 text-3s-blue rounded-lg text-[10px] font-black uppercase tracking-wider">
                      {cat.category}
                    </span>
                    <span className="text-xs font-black text-3s-black">{formatPriceCurrency(cat.totalValue)}</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-3s-gray-medium font-bold">
                    <span>{cat.componentCount} types d'items</span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {formatPercentage((cat.totalValue / analysis.componentCosts.totalComponentValue) * 100)} de l'inventaire
                    </span>
                  </div>

                  <div className="mt-3 h-1 w-full bg-gray-50 rounded-full overflow-hidden">
                    <div
                      className="bg-3s-blue h-full rounded-full"
                      style={{ width: `${(cat.totalValue / analysis.componentCosts.totalComponentValue) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}

            {analysis.categoryAnalysis.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                <AlertCircle className="w-10 h-10 text-gray-200 mb-2" />
                <p className="text-xs text-3s-gray-medium font-bold uppercase">Aucune donnée de catégorie</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostsAnalysis;
