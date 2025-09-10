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
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  lowStockCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar = ({ currentPage, onPageChange, lowStockCount, isCollapsed, onToggleCollapse }: SidebarProps) => {
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
    <div className={`bg-3s-black text-white ${isCollapsed ? 'w-16' : 'w-64'} min-h-screen flex flex-col transition-all duration-300 shadow-3s-lg relative`}>
      {/* Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-6 bg-3s-blue hover:bg-3s-blue-dark text-white p-1.5 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-10"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className={`p-6 border-b border-gray-700 ${isCollapsed ? 'px-3' : ''}`}>
        {!isCollapsed ? (
          <>
            <h1 className="text-2xl font-bold text-3s-blue font-inter">StockSpider</h1>
            <p className="text-gray-400 text-sm mt-1 font-medium">by 3S IT</p>
          </>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-3s-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SS</span>
            </div>
          </div>
        )}
      </div>

      {lowStockCount > 0 && !isCollapsed && (
        <div className="mx-4 my-4 p-3 bg-3s-red/20 border border-3s-red rounded-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-3s-red animate-bounce-subtle" />
            <div>
              <p className="text-3s-red text-sm font-semibold">Stock critique</p>
              <p className="text-3s-red-light text-xs">{lowStockCount} composant{lowStockCount > 1 ? 's' : ''} en rupture</p>
            </div>
          </div>
        </div>
      )}

      {lowStockCount > 0 && isCollapsed && (
        <div className="mx-2 my-2 p-2 bg-3s-red/20 border border-3s-red rounded-lg">
          <div className="flex justify-center">
            <AlertCircle className="w-5 h-5 text-3s-red animate-bounce-subtle" />
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 hover:scale-105 ${
                    isActive 
                      ? 'bg-3s-blue text-white shadow-3s' 
                      : 'text-gray-300 hover:bg-3s-gray-dark hover:text-white'
                  }`}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon className="w-5 h-5" />
                  {!isCollapsed && <span className="font-medium">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={`p-4 border-t border-gray-700 ${isCollapsed ? 'px-2' : ''}`}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-3s-blue rounded-full flex items-center justify-center shadow-3s">
              <span className="text-white text-sm font-bold">
                {user?.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{user?.name}</p>
              <p className="text-gray-400 text-xs capitalize font-medium">{user?.role}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-3">
            <div className="w-8 h-8 bg-3s-blue rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.name.charAt(0)}
              </span>
            </div>
          </div>
        )}
        
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-3s-red hover:text-white rounded-xl transition-all duration-200 hover:scale-105 ${isCollapsed ? 'justify-center px-2' : ''}`}
          title={isCollapsed ? 'Déconnexion' : ''}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="font-medium">Déconnexion</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;