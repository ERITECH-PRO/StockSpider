import React from 'react';
import { Package, Box, AlertTriangle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useData } from '../../hooks/useData';

const Dashboard = () => {
  const { getDashboardStats, getLowStockComponents } = useData();
  const stats = getDashboardStats();
  const lowStockComponents = getLowStockComponents();

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(trend)}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color === 'text-red-600' ? 'bg-red-100' : color === 'text-green-600' ? 'bg-green-100' : color === 'text-blue-600' ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Composants"
          value={stats.totalComponents}
          icon={Package}
          color="text-blue-600"
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
          color="text-red-600"
          trend={-5}
        />
        <StatCard
          title="Valeur stock"
          value={`${stats.totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`}
          icon={DollarSign}
          color="text-purple-600"
          trend={15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Composants en stock critique
            </h3>
          </div>
          <div className="p-6">
            {lowStockComponents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun composant en stock critique</p>
            ) : (
              <div className="space-y-4">
                {lowStockComponents.slice(0, 5).map((component) => (
                  <div key={component.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <p className="font-medium text-gray-900">{component.designation}</p>
                      <p className="text-sm text-gray-600">{component.name} - {component.footprint}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-600 font-semibold">{component.quantity} restant{component.quantity > 1 ? 's' : ''}</p>
                      <p className="text-xs text-gray-500">Min: {component.minStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Mouvements récents</h3>
          </div>
          <div className="p-6">
            {stats.recentMovements.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun mouvement récent</p>
            ) : (
              <div className="space-y-4">
                {stats.recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{movement.reason}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(movement.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        movement.type === 'in' 
                          ? 'bg-green-100 text-green-800' 
                          : movement.type === 'out'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution du stock</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Graphique à venir</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par catégorie</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Graphique à venir</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;