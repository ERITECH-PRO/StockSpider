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
  Building2,
  MapPinned,
  FileText,
  ShoppingBag,
  AlertTriangle,
  CircuitBoard,
  Coins,
  LineChart,
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

  const menuSections = [
    {
      title: 'Pilotage',
      items: [
        { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
        { id: 'cost-revient', label: 'Coût de revient', icon: Coins },
        { id: 'financial-analysis', label: 'Analyse financière', icon: LineChart },
        { id: 'costs', label: 'Coûts & marges', icon: DollarSign },
      ]
    },
    {
      title: 'Inventaire',
      items: [
        { id: 'components', label: 'Composants', icon: Package },
        { id: 'products', label: 'Stocks Produits f.', icon: Box },
        { id: 'movements', label: 'Mouvements', icon: TrendingUp },
      ]
    },
    {
      title: 'Production',
      items: [
        { id: 'product-inventory', label: 'Catalogue Modèles', icon: FileText },
        { id: 'assembly-in-progress', label: 'En cours', icon: Clock },
        { id: 'components-to-buy', label: 'Réappro. besoins', icon: ShoppingCart },
        { id: 'assembly', label: 'Historique Assembl.', icon: CheckCircle },
      ]
    },
    {
      title: 'Suivi production',
      items: [
        { id: 'products-sold', label: 'Produits vendus', icon: ShoppingBag },
        { id: 'products-defective', label: 'Produits défectueux', icon: AlertTriangle },
        { id: 'products-pcb', label: 'PCB restants', icon: CircuitBoard },
      ]
    },
    {
      title: 'Logistique & Ventes',
      items: [
        { id: 'bons-sortie', label: 'Bons de sortie', icon: FileText },
        { id: 'clients', label: 'Clients', icon: Building2 },
        { id: 'chantiers', label: 'Chantiers', icon: MapPinned },
        { id: 'suppliers', label: 'Fournisseurs', icon: Truck },
      ]
    },
    {
      title: 'Configuration',
      items: [
        { id: 'settings', label: 'Paramètres', icon: Settings },
      ]
    }
  ];

  return (
    <div className={`bg-3s-black text-white h-screen sticky top-0 flex flex-col transition-all duration-500 ease-in-out shrink-0 z-40 border-r border-white/5 shadow-2xl ${isCollapsed ? 'w-20' : 'w-72'}`}>

      {/* Premium Header Section */}
      <div className="p-6 mb-2">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <h1 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                <span className="text-3s-blue">Stock</span>Spider
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                <p className="text-white/30 text-[8px] font-black uppercase tracking-[0.2em]">Système 3S IT Actif</p>
              </div>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className={`p-2.5 rounded-xl transition-all duration-300 hover:bg-white/10 active:scale-90 border border-transparent hover:border-white/5 ${isCollapsed ? 'mx-auto' : ''}`}
          >
            {isCollapsed ? <Menu className="w-5 h-5 text-3s-blue" /> : <X className="w-5 h-5 text-white/40" />}
          </button>
        </div>
      </div>

      {/* Critical Stock Alert - Refined */}
      {lowStockCount > 0 && (
        <div className={`mx-4 mb-6 transition-all duration-500 ${isCollapsed ? 'opacity-100' : 'opacity-100'}`}>
          <div className={`relative overflow-hidden p-3 rounded-2xl border transition-all ${isCollapsed
              ? 'bg-3s-red/20 border-3s-red/30'
              : 'bg-gradient-to-br from-3s-red/20 to-transparent border-3s-red/30'
            }`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-3s-red/10 rounded-lg shadow-inner">
                <AlertCircle className="w-5 h-5 text-3s-red animate-pulse" />
              </div>
              {!isCollapsed && (
                <div className="animate-in fade-in slide-in-from-left-2 duration-700">
                  <p className="text-[10px] font-black text-3s-red uppercase tracking-widest">Alerte Stock</p>
                  <p className="text-white/70 text-[10px] font-bold">{lowStockCount} RUTURES DÉTECTÉES</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Matrix */}
      <nav className="flex-1 overflow-y-auto px-4 no-scrollbar space-y-8 pb-10">
        {menuSections.map((section) => (
          <div key={section.title} className="space-y-4">
            {!isCollapsed && (
              <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-3">{section.title}</h3>
            )}
            {isCollapsed && (
              <div className="h-px bg-white/5 mx-2"></div>
            )}
            <ul className="space-y-1.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onPageChange(item.id)}
                      className={`w-full group relative flex items-center transition-all duration-300 rounded-[1.2rem] px-4 py-3 border overflow-hidden ${isActive
                          ? 'bg-3s-blue/10 border-3s-blue/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                          : 'bg-transparent border-transparent hover:bg-white/5'
                        } ${isCollapsed ? 'justify-center' : 'gap-4'}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {/* Active Glow Indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-5 bg-3s-blue rounded-r-full shadow-[0_0_12px_rgba(59,130,246,1)]"></div>
                      )}

                      <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-3s-blue' : 'text-white/40 group-hover:text-white'
                        }`} />

                      {!isCollapsed && (
                        <span className={`text-xs font-bold transition-all duration-300 ${isActive ? 'text-white' : 'text-white/40 group-hover:text-white/80'
                          }`}>
                          {item.label}
                        </span>
                      )}

                      {/* Hover Reflection */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Performance Footer */}
      <div className="p-4 bg-white/5 backdrop-blur-md border-t border-white/5 mt-auto">
        <div className={`flex items-center gap-4 p-3 rounded-2xl transition-colors hover:bg-white/5 group overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="relative shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-3s-blue to-3s-blue-dark rounded-xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform">
              <span className="text-white text-sm font-black uppercase">
                {user?.name.charAt(0)}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-3s-black rounded-full"></div>
          </div>

          {!isCollapsed && (
            <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-right-4">
              <p className="text-xs font-black text-white truncate uppercase tracking-tighter">{user?.name}</p>
              <p className="text-[9px] font-bold text-white/30 truncate uppercase tracking-widest">{user?.role}</p>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className={`w-full mt-4 flex items-center gap-3 px-4 py-3 text-white/30 hover:text-3s-red hover:bg-3s-red/10 rounded-xl transition-all duration-300 group active:scale-95 ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? 'Déconnexion Sécurisée' : undefined}
        >
          <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sortie Session</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;