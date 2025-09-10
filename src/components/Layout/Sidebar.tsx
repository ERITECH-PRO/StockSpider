import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Box, 
  Wrench, 
  TrendingUp, 
  DollarSign, 
  Truck, 
  Users, 
  Settings,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  lowStockCount: number;
}

const Sidebar = ({ currentPage, onPageChange, lowStockCount }: SidebarProps) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'components', label: 'Composants', icon: Package },
    { id: 'products', label: 'Produits finis', icon: Box },
    { id: 'assembly', label: 'Assembler', icon: Wrench },
    { id: 'movements', label: 'Stock & mouvements', icon: TrendingUp },
    { id: 'costs', label: 'Coûts & marges', icon: DollarSign },
    { id: 'suppliers', label: 'Fournisseurs', icon: Truck },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="bg-slate-800 text-white w-64 min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-blue-400">StockSpider</h1>
        <p className="text-slate-400 text-sm mt-1">Gestion de stock</p>
      </div>

      {lowStockCount > 0 && (
        <div className="mx-4 my-4 p-3 bg-red-900/50 border border-red-500 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-200 text-sm font-medium">Stock critique</p>
              <p className="text-red-300 text-xs">{lowStockCount} composant{lowStockCount > 1 ? 's' : ''} en rupture</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-white text-sm font-medium">{user?.name}</p>
            <p className="text-slate-400 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;