import React from 'react';
import { Package, Box, AlertTriangle, DollarSign, TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { formatPriceCurrency } from '../../utils/priceFormatter';

const Dashboard = () => {
  const { getDashboardStats, getLowStockComponents } = useData();
  const stats = getDashboardStats();
  const lowStockComponents = getLowStockComponents();

  const StatCard = ({ title, value, icon: Icon, color, trend, bgGradient }: any) => (
    <div className={`card-3s p-6 animate-fade-in ${bgGradient}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3s-gray-medium text-sm font-medium font-inter">{title}</p>
          <p className={`text-3xl font-bold ${color} mt-2 font-inter`}>{value}</p>
          {trend && (
            <div className="flex items-center mt-3">
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-3s-red mr-1" />
              )}
              <span className={`text-sm font-medium font-inter ${trend > 0 ? 'text-green-600' : 'text-3s-red'}`}>
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-xl shadow-3s ${
          color === 'text-3s-red' ? 'bg-red-50' : 
          color === 'text-green-600' ? 'bg-green-50' : 
          color === 'text-3s-blue' ? 'bg-blue-50' : 
          'bg-purple-50'
        }`}>
          <Icon className={`w-7 h-7 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 bg-3s-gray-light min-h-full">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
        <StatCard
          title="Composants"
          value={stats.totalComponents}
          icon={Package}
          color="text-3s-blue"
          trend={8}
          bgGradient="bg-gradient-to-br from-blue-50 to-white"
        />
        <StatCard
          title="Produits finis"
          value={stats.totalProducts}
          icon={Box}
          color="text-green-600"
          trend={12}
          bgGradient="bg-gradient-to-br from-green-50 to-white"
        />
        <StatCard
          title="Alertes stock"
          value={stats.lowStockAlerts}
          icon={AlertTriangle}
          color="text-3s-red"
          trend={-5}
          bgGradient="bg-gradient-to-br from-red-50 to-white"
        />
        <StatCard
          title="Valeur stock"
          value={formatPriceCurrency(stats.totalValue)}
          icon={DollarSign}
          color="text-purple-600"
          trend={15}
          bgGradient="bg-gradient-to-br from-purple-50 to-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Low Stock Alerts */}
        <div className="card-3s animate-fade-in">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white rounded-t-xl">
            <h3 className="text-xl font-semibold text-3s-black font-inter flex items-center gap-3">
              <div className="p-2 bg-3s-red/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-3s-red" />
              </div>
              <span>Composants en stock critique</span>
            </h3>
          </div>
          <div className="p-6">
            {lowStockComponents.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-green-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Package className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-3s-gray-medium font-inter">Aucun composant en stock critique</p>
                <p className="text-sm text-gray-400 mt-1 font-inter">Tous vos stocks sont au niveau optimal</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockComponents.slice(0, 5).map((component) => (
                  <div key={component.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100 hover:shadow-card-hover transition-all duration-200">
                    <div>
                      <p className="font-semibold text-3s-black font-inter">{component.designation}</p>
                      <p className="text-sm text-3s-gray-medium font-inter">{component.name} - {component.footprint}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3s-red font-bold font-inter">{component.quantity} restant{component.quantity > 1 ? 's' : ''}</p>
                      <p className="text-xs text-gray-500 font-inter">Min: {component.minStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Movements */}
        <div className="card-3s animate-fade-in">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white rounded-t-xl">
            <h3 className="text-xl font-semibold text-3s-black font-inter flex items-center gap-3">
              <div className="p-2 bg-3s-blue/10 rounded-lg">
                <Activity className="w-6 h-6 text-3s-blue" />
              </div>
              <span>Mouvements récents</span>
            </h3>
          </div>
          <div className="p-6">
            {stats.recentMovements.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-blue-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-3s-blue" />
                </div>
                <p className="text-3s-gray-medium font-inter">Aucun mouvement récent</p>
                <p className="text-sm text-gray-400 mt-1 font-inter">Les mouvements apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl hover:shadow-card-hover transition-all duration-200">
                    <div>
                      <p className="font-semibold text-3s-black font-inter">{movement.reason}</p>
                      <p className="text-sm text-3s-gray-medium font-inter">
                        {new Date(movement.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold font-inter ${
                        movement.type === 'in' 
                          ? 'bg-green-100 text-green-700' 
                          : movement.type === 'out'
                          ? 'bg-red-100 text-3s-red'
                          : 'bg-blue-100 text-3s-blue'
                      }`}>
                        {movement.type === 'in' && '+'}
                        {movement.type === 'out' && '-'}
                        {movement.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card-3s p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-3s-blue/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-3s-blue" />
            </div>
            <h3 className="text-xl font-semibold text-3s-black font-inter">Évolution du stock</h3>
          </div>
          <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center border-2 border-dashed border-blue-200">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-3s-blue mx-auto mb-3" />
              <p className="text-3s-gray-medium font-inter font-medium">Graphique d'évolution</p>
              <p className="text-sm text-gray-400 mt-1 font-inter">Données en cours de traitement</p>
            </div>
          </div>
        </div>

        <div className="card-3s p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-3s-black font-inter">Répartition par catégorie</h3>
          </div>
          <div className="h-64 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl flex items-center justify-center border-2 border-dashed border-purple-200">
            <div className="text-center">
              <Package className="w-12 h-12 text-purple-600 mx-auto mb-3" />
              <p className="text-3s-gray-medium font-inter font-medium">Répartition des composants</p>
              <p className="text-sm text-gray-400 mt-1 font-inter">Analyse par catégorie</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;