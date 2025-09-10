import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import { useData } from './hooks/useData';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './components/Dashboard/Dashboard';
import ComponentList from './components/Components/ComponentList';
import ComponentModal from './components/Components/ComponentModal';
import ProductList from './components/Products/ProductList';
import ProductModal from './components/Products/ProductModal';

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const { getLowStockComponents } = useData();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const lowStockCount = getLowStockComponents().length;

  const getPageTitle = () => {
    const titles = {
      dashboard: 'Tableau de bord',
      components: 'Composants',
      products: 'Produits finis',
      assembly: 'Assembler',
      movements: 'Stock & mouvements',
      costs: 'Coûts & marges',
      suppliers: 'Fournisseurs',
      users: 'Utilisateurs',
      settings: 'Paramètres',
    };
    return titles[currentPage as keyof typeof titles] || 'StockSpider';
  };

  const getSearchPlaceholder = () => {
    const placeholders = {
      components: 'Rechercher des composants...',
      products: 'Rechercher des produits...',
      suppliers: 'Rechercher des fournisseurs...',
    };
    return placeholders[currentPage as keyof typeof placeholders] || 'Rechercher...';
  };

  const showAddButton = ['components', 'products', 'suppliers', 'users'].includes(currentPage);
  const showSearch = ['components', 'products', 'suppliers'].includes(currentPage);

  const handleAddClick = () => {
    if (currentPage === 'components') {
      setShowComponentModal(true);
    } else if (currentPage === 'products') {
      setShowProductModal(true);
    }
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'components':
        return <ComponentList searchQuery={searchQuery} />;
      case 'products':
        return <ProductList searchQuery={searchQuery} />;
      case 'assembly':
        return (
          <div className="p-6 bg-3s-gray-light min-h-full">
            <div className="card-3s p-12 text-center animate-fade-in">
              <div className="p-4 bg-3s-blue/10 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Wrench className="w-10 h-10 text-3s-blue" />
              </div>
              <h3 className="text-2xl font-semibold text-3s-black mb-3 font-inter">Module d'assemblage</h3>
              <p className="text-3s-gray-medium font-inter">Cette fonctionnalité sera bientôt disponible.</p>
              <p className="text-sm text-gray-400 mt-2 font-inter">Workflow Kanban et gestion des assemblages</p>
            </div>
          </div>
        );
      case 'movements':
        return (
          <div className="p-6 bg-3s-gray-light min-h-full">
            <div className="card-3s p-12 text-center animate-fade-in">
              <div className="p-4 bg-green-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <TrendingUp className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-3s-black mb-3 font-inter">Stock & mouvements</h3>
              <p className="text-3s-gray-medium font-inter">Cette fonctionnalité sera bientôt disponible.</p>
              <p className="text-sm text-gray-400 mt-2 font-inter">Historique et traçabilité des mouvements</p>
            </div>
          </div>
        );
      case 'costs':
        return (
          <div className="p-6 bg-3s-gray-light min-h-full">
            <div className="card-3s p-12 text-center animate-fade-in">
              <div className="p-4 bg-purple-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <DollarSign className="w-10 h-10 text-purple-600" />
              </div>
              <h3 className="text-2xl font-semibold text-3s-black mb-3 font-inter">Coûts & marges</h3>
              <p className="text-3s-gray-medium font-inter">Cette fonctionnalité sera bientôt disponible.</p>
              <p className="text-sm text-gray-400 mt-2 font-inter">Analyse financière et rentabilité</p>
            </div>
          </div>
        );
      case 'suppliers':
        return (
          <div className="p-6 bg-3s-gray-light min-h-full">
            <div className="card-3s p-12 text-center animate-fade-in">
              <div className="p-4 bg-orange-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Truck className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-semibold text-3s-black mb-3 font-inter">Fournisseurs</h3>
              <p className="text-3s-gray-medium font-inter">Cette fonctionnalité sera bientôt disponible.</p>
              <p className="text-sm text-gray-400 mt-2 font-inter">Gestion des partenaires et commandes</p>
            </div>
          </div>
        );
      case 'users':
        return (
          <div className="p-6 bg-3s-gray-light min-h-full">
            <div className="card-3s p-12 text-center animate-fade-in">
              <div className="p-4 bg-indigo-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Users className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-semibold text-3s-black mb-3 font-inter">Utilisateurs</h3>
              <p className="text-3s-gray-medium font-inter">Cette fonctionnalité sera bientôt disponible.</p>
              <p className="text-sm text-gray-400 mt-2 font-inter">Gestion des accès et permissions</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6 bg-3s-gray-light min-h-full">
            <div className="card-3s p-12 text-center animate-fade-in">
              <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Settings className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-2xl font-semibold text-3s-black mb-3 font-inter">Paramètres</h3>
              <p className="text-3s-gray-medium font-inter">Cette fonctionnalité sera bientôt disponible.</p>
              <p className="text-sm text-gray-400 mt-2 font-inter">Configuration système et préférences</p>
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

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
          <button
            onClick={() => {/* Auto-login for demo */}}
            className="w-full btn-3s-primary py-3 text-lg"
          >
            <span className="font-inter">Connexion automatique (Demo)</span>
          </button>
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
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;