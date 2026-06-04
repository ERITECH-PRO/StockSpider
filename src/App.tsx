import React, { useState } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import { ToastProvider } from './hooks/useToast';
import { DataProvider, useDataContext } from './contexts/DataContext';
import SyncNotification from './components/UI/SyncNotification';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import NotificationPanel from './components/UI/NotificationPanel';
import Dashboard from './components/Dashboard/Dashboard';
import ComponentList from './components/Components/ComponentList';
import ComponentModal from './components/Components/ComponentModal';
import ProductList from './components/Products/ProductList';
import ProductInventory from './components/Products/ProductInventory';
import ProductModal from './components/Products/ProductModal';
import AssemblyList from './components/Assembly/AssemblyList';
import ProductsInAssembly from './components/Assembly/ProductsInAssembly';
import ComponentsToBuy from './components/Assembly/ComponentsToBuy';
import StockMovements from './components/Stock/StockMovements';
import CostsAnalysis from './components/Costs/CostsAnalysis';
import SuppliersList from './components/Suppliers/SuppliersList';
import UsersList from './components/Users/UsersList';
import SettingsPanel from './components/Settings/SettingsPanel';
import ClientsList from './components/Clients/ClientsList';
import ChantiersList from './components/Chantiers/ChantiersList';
import BonSortiePage from './components/BonSortie/BonSortiePage';


const AppContent = () => {
  const { isAuthenticated, login, loading: authLoading } = useAuth();
  const { getLowStockComponents, syncNotification, hideSyncNotification } = useDataContext();
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      return localStorage.getItem('currentPage') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const lowStockCount = getLowStockComponents().length;

  const getPageTitle = () => {
    const titles = {
      dashboard: 'Tableau de bord',
      components: 'Composants',
      products: 'Produits finis',
      'assembly-in-progress': 'Produits en cours d\'assemblage',
      'product-inventory': 'Catalogue produits',
      'components-to-buy': 'Composants à acheter',
      assembly: 'Produits assemblés',
      movements: 'Stock & mouvements',
      costs: 'Coûts & marges',
      suppliers: 'Fournisseurs',
      clients: 'Clients',
      chantiers: 'Chantiers',
      'bons-sortie': 'Bons de sortie',
      users: 'Utilisateurs',
      settings: 'Paramètres',
    };
    return titles[currentPage as keyof typeof titles] || 'StockSpider';
  };

  const getSearchPlaceholder = () => {
    const placeholders = {
      components: 'Rechercher des composants...',
      products: 'Rechercher des produits...',
      'assembly-in-progress': 'Rechercher des produits en cours...',
      'product-inventory': 'Rechercher dans le catalogue...',
      'components-to-buy': 'Rechercher des composants...',
      assembly: 'Rechercher des produits assemblés...',
      suppliers: 'Rechercher des fournisseurs...',
    };
    return placeholders[currentPage as keyof typeof placeholders] || 'Rechercher...';
  };

  const showAddButton = ['components', 'products', 'suppliers', 'users'].includes(currentPage);
  const showSearch = ['components', 'products', 'assembly-in-progress', 'components-to-buy', 'assembly', 'suppliers'].includes(currentPage);

  const handleAddClick = () => {
    if (currentPage === 'components') {
      setShowComponentModal(true);
    } else if (currentPage === 'products') {
      setShowProductModal(true);
    }
  };

  // Persister la page courante
  React.useEffect(() => {
    try {
      localStorage.setItem('currentPage', currentPage);
    } catch { }
  }, [currentPage]);

  // Persister l'état du sidebar
  React.useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? 'true' : 'false');
    } catch { }
  }, [sidebarCollapsed]);

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'components':
        return <ComponentList searchQuery={searchQuery} />;
      case 'products':
        return <ProductList searchQuery={searchQuery} />;
      case 'product-inventory':
        return <ProductInventory />;
      case 'assembly-in-progress':
        return <ProductsInAssembly />;
      case 'components-to-buy':
        return <ComponentsToBuy />;
      case 'assembly':
        return <AssemblyList />;
      case 'movements':
        return <StockMovements />;
      case 'costs':
        return <CostsAnalysis />;
      case 'suppliers':
        return <SuppliersList />;
      case 'clients':
        return <ClientsList />;
      case 'chantiers':
        return <ChantiersList />;
      case 'bons-sortie':
        return <BonSortiePage />;
      case 'users':
        return <UsersList />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <Dashboard />;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    await login(loginForm.email, loginForm.password);
    setLoginLoading(false);
  };

  // Écran de chargement initial
  if (authLoading) {
    return (
      <div className="min-h-screen bg-3s-gray-light flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 bg-3s-blue/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-3s-blue animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-3s-blue font-inter mb-2">StockSpider</h1>
          <p className="text-3s-gray-medium font-inter">Chargement en cours...</p>
        </div>
      </div>
    );
  }

  // Écran de connexion
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-3s-gray-light flex items-center justify-center p-4">
        <div className="card-3s p-8 max-w-md w-full animate-fade-in">
          <div className="text-center mb-8">
            <div className="p-4 bg-3s-blue/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Package className="w-8 h-8 text-3s-blue" />
            </div>
            <h1 className="text-3xl font-bold text-3s-blue font-inter mb-2">StockSpider</h1>
            <p className="text-3s-gray-medium font-inter">Powered by 3S IT</p>
            <p className="text-gray-500 mt-2 font-inter">Connectez-vous pour accéder à votre inventaire</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">Email</label>
              <input
                type="email"
                required
                value={loginForm.email}
                onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">Mot de passe</label>
              <input
                type="password"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter"
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full btn-3s-primary py-3 text-lg flex items-center justify-center gap-2"
            >
              {loginLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              <span className="font-inter">
                {loginLoading ? 'Connexion...' : 'Se connecter'}
              </span>
            </button>
          </form>

          
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-3s-gray-light">
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        lowStockCount={lowStockCount}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={getPageTitle()}
          showAddButton={showAddButton}
          onAddClick={handleAddClick}
          searchPlaceholder={getSearchPlaceholder()}
          onSearchChange={showSearch ? setSearchQuery : undefined}
          notificationCount={lowStockCount}
          onBellClick={() => setNotificationsOpen(true)}
        />

        <main className="flex-1 overflow-y-auto bg-3s-gray-light">
          {renderPageContent()}
        </main>
      </div>

      {/* Modals */}
      <ComponentModal
        isOpen={showComponentModal}
        onClose={() => setShowComponentModal(false)}
      />
      <ProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
      />

      {/* Notification de synchronisation */}
      <SyncNotification
        isVisible={syncNotification.isVisible}
        type={syncNotification.type}
        title={syncNotification.title}
        message={syncNotification.message}
        onClose={hideSyncNotification}
      />

      {/* Panneau notifications */}
      <NotificationPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;