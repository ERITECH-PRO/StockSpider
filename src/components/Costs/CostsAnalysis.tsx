import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Package, Calculator, BarChart3 } from 'lucide-react';
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
    const averageComponentPrice = totalComponents > 0 ? totalComponentValue / components.reduce((sum, comp) => sum + comp.quantity, 0) : 0;

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
    });

    // Analyse par catégorie
    const categoryMap = new Map();
    components.forEach(comp => {
      const category = comp.category;
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

  // Utilisation des fonctions de formatage centralisées avec 4 décimales

  const getMarginColor = (margin: number) => {
    if (margin > 0) return 'text-green-600';
    if (margin < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getMarginIcon = (margin: number) => {
    if (margin > 0) return <TrendingUp className="w-4 h-4" />;
    if (margin < 0) return <TrendingDown className="w-4 h-4" />;
    return <BarChart3 className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analyse des coûts et marges</h1>
          <p className="text-gray-600">Analysez la rentabilité de vos produits et composants</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calculator className="w-4 h-4" />
          <span>Analyse en temps réel</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Valeur totale composants</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPriceCurrency(analysis.componentCosts.totalComponentValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Produits rentables</p>
              <p className="text-2xl font-bold text-gray-900">
                {analysis.productCosts.filter(p => p.margin > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Marge moyenne</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(
                  analysis.productCosts.length > 0 
                    ? analysis.productCosts.reduce((sum, p) => sum + p.marginPercentage, 0) / analysis.productCosts.length
                    : 0
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Profitability */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Rentabilité des produits</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coût production
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix vente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marge unitaire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marge %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysis.productCosts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {product.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPriceCurrency(product.productionCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPriceCurrency(product.sellingPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center text-sm ${getMarginColor(product.margin)}`}>
                      {getMarginIcon(product.margin)}
                      <span className="ml-1">{formatPriceCurrency(product.margin)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPercentage(product.marginPercentage)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Analysis */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Analyse par catégorie de composants</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité totale
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valeur totale
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix moyen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analysis.categoryAnalysis.map((category) => (
                <tr key={category.category} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {category.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.componentCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.totalQuantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPriceCurrency(category.totalValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPriceCurrency(category.averagePrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CostsAnalysis;
