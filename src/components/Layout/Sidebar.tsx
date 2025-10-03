import { 
  LayoutDashboard, 
  Package, 
  Box, 
  TrendingUp, 
  DollarSign, 
  Truck, 
  Users, 
  Settings,
  LogOut,
  AlertCircle,
  Menu,
  X,
  Clock,
  ShoppingCart,
  CheckCircle,
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
    { id: 'assembly-in-progress', label: 'Produits en cours d\'assemblage', icon: Clock },
    { id: 'components-to-buy', label: 'Composants à acheter', icon: ShoppingCart },
    { id: 'assembly', label: 'Produits assemblés', icon: CheckCircle },
    { id: 'movements', label: 'Stock & mouvements', icon: TrendingUp },
    { id: 'costs', label: 'Coûts & marges', icon: DollarSign },
    { id: 'suppliers', label: 'Fournisseurs', icon: Truck },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className={`bg-3s-black text-white h-screen sticky top-0 flex flex-col transition-all duration-300 animate-slide-in shrink-0 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold text-3s-blue font-inter">StockSpider</h1>
              <p className="text-gray-400 text-sm mt-1 font-inter">Gestion de stock 3S IT</p>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {lowStockCount > 0 && !isCollapsed && (
        <div className="mx-4 my-4 p-3 bg-3s-red/20 border border-3s-red rounded-lg animate-bounce-subtle">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-3s-red" />
            <div>
              <p className="text-3s-red text-sm font-medium font-inter">Stock critique</p>
              <p className="text-red-300 text-xs font-inter">{lowStockCount} composant{lowStockCount > 1 ? 's' : ''} en rupture</p>
            </div>
          </div>
        </div>
      )}

      {lowStockCount > 0 && isCollapsed && (
        <div className="mx-2 my-2 p-2 bg-3s-red/20 border border-3s-red rounded-lg animate-bounce-subtle">
          <AlertCircle className="w-5 h-5 text-3s-red mx-auto" />
        </div>
      )}

      <nav className="flex-1 p-4 overflow-y-auto no-scrollbar">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onPageChange(item.id)}
                  className={`w-full sidebar-item ${
                    isActive 
                      ? 'sidebar-item-active' 
                      : 'sidebar-item-inactive'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5" />
                  {!isCollapsed && <span className="font-inter">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className={`flex items-center gap-3 mb-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-3s-blue rounded-full flex items-center justify-center shadow-3s">
            <span className="text-white text-sm font-medium">
              {user?.name.charAt(0)}
            </span>
          </div>
          {!isCollapsed && (
            <div>
              <p className="text-white text-sm font-medium font-inter">{user?.name}</p>
              <p className="text-gray-400 text-xs capitalize font-inter">{user?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors duration-200 ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="font-inter">Déconnexion</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;