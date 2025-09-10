import React from 'react';
import { Package, Box, AlertTriangle, DollarSign, TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';
import { useData } from '../../hooks/useData';

const Dashboard = () => {
  const { getDashboardStats, getLowStockComponents } = useData();
  const stats = getDashboardStats();
  const lowStockComponents = getLowStockComponents();

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white rounded-2xl shadow-3s p-6 border border-3s-gray-light hover:shadow-3s-lg transition-all duration-300 hover:scale-105 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3s-gray-medium text-sm font-semibold uppercase tracking-wide">{title}</p>
          <p className={`text-3xl font-bold ${color} mt-2 font-inter`}>{value}</p>
          {trend && (
            <div className="flex items-center mt-3">
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
              ) : (
                <TrendingDown className="w-4 h-4 text-3s-red mr-2" />
              )}
              <span className={`text-sm font-semibold ${trend > 0 ? 'text-green-600' : 'text-3s-red'}`}>
                {Math.abs(trend)}%
              </span>
              <span className="text-3s-gray-medium text-xs ml-1">vs mois dernier</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-2xl ${
          color === 'text-3s-red' ? 'bg-3s-red/10' : 
          color === 'text-green-600' ? 'bg-green-100' : 
          color === 'text-3s-blue' ? 'bg-3s-blue/10' : 
          'bg-3s-gray-light'
        } shadow-inner`}>
          <Icon className={`w-7 h-7 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 bg-3s-gray-light min-h-screen">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-in">
        <StatCard
          title="Composants"
          value={stats.totalComponents}
          icon={Package}
          color="text-3s-blue"
          trend={8}
        />
        <StatCard
          title="Produits finis"
          value={stats.totalProducts}
          icon={Box}
          color="text-green-600"
          trend={12}
        />
        <StatCard
          title="Alertes stock"
          value={stats.lowStockAlerts}
          icon={AlertTriangle}
          color="text-3s-red"
          trend={-5}
        />
        <StatCard
          title="Valeur stock"
          value={`${stats.totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`}
          icon={DollarSign}
          color="text-3s-blue"
          trend={15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl shadow-3s border border-3s-gray-light animate-fade-in">
          <div className="p-6 border-b border-3s-gray-light bg-gradient-to-r from-3s-red/5 to-transparent">
            <h3 className="text-xl font-bold text-3s-black flex items-center gap-3 font-inter">
              <div className="p-2 bg-3s-red/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-3s-red" />
              </div>
              Composants en stock critique
            </h3>
          </div>
          <div className="p-6">
            {lowStockComponents.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-3s-gray-medium font-medium">Aucun composant en stock critique</p>
                <p className="text-sm text-3s-gray-medium mt-1">Tous vos stocks sont au niveau optimal</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lowStockComponents.slice(0, 5).map((component) => (
                  <div key={component.id} className="flex items-center justify-between p-4 bg-3s-red/5 rounded-xl border border-3s-red/20 hover:shadow-3s transition-all duration-200">
                    <div>
                      <p className="font-semibold text-3s-black">{component.designation}</p>
                      <p className="text-sm text-3s-gray-medium font-medium">{component.name} - {component.footprint}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3s-red font-bold text-lg">{component.quantity}</p>
                      <p className="text-xs text-3s-gray-medium">Min: {component.minStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-2xl shadow-3s border border-3s-gray-light animate-fade-in">
          <div className="p-6 border-b border-3s-gray-light bg-gradient-to-r from-3s-blue/5 to-transparent">
            <h3 className="text-xl font-bold text-3s-black flex items-center gap-3 font-inter">
              <div className="p-2 bg-3s-blue/10 rounded-xl">
                <Activity className="w-6 h-6 text-3s-blue" />
              </div>
              Mouvements récents
            </h3>
          </div>
          <div className="p-6">
            {stats.recentMovements.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-3s-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-3s-blue" />
                </div>
                <p className="text-3s-gray-medium font-medium">Aucun mouvement récent</p>
                <p className="text-sm text-3s-gray-medium mt-1">Les mouvements apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between p-4 bg-3s-gray-light rounded-xl hover:shadow-3s transition-all duration-200">
                    <div>
                      <p className="font-semibold text-3s-black">{movement.reason}</p>
                      <p className="text-sm text-3s-gray-medium font-medium">
                        {new Date(movement.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${
                        movement.type === 'in' 
                          ? 'bg-green-100 text-green-700' 
                          : movement.type === 'out'
                          ? 'bg-3s-red/10 text-3s-red'
                          : 'bg-3s-blue/10 text-3s-blue'
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
        <div className="bg-white rounded-2xl shadow-3s border border-3s-gray-light p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-3s-blue/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-3s-blue" />
            </div>
            <h3 className="text-xl font-bold text-3s-black font-inter">Évolution du stock</h3>
          </div>
          <div className="h-64 bg-gradient-to-br from-3s-blue/5 to-3s-blue/10 rounded-xl flex items-center justify-center border-2 border-dashed border-3s-blue/20">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-3s-blue/40 mx-auto mb-3" />
              <p className="text-3s-gray-medium font-semibold">Graphique à venir</p>
              <p className="text-sm text-3s-gray-medium mt-1">Analyse des tendances de stock</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-3s border border-3s-gray-light p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-xl">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-3s-black font-inter">Répartition par catégorie</h3>
          </div>
          <div className="h-64 bg-gradient-to-br from-green-50 to-green-100 rounded-xl flex items-center justify-center border-2 border-dashed border-green-200">
            <div className="text-center">
              <Package className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-3s-gray-medium font-semibold">Graphique à venir</p>
              <p className="text-sm text-3s-gray-medium mt-1">Distribution des composants</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;