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
          <div className="p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Module d'assemblage</h3>
              <p className="text-gray-600">Cette fonctionnalité sera bientôt disponible.</p>
            </div>
          </div>
        );
      case 'movements':
        return (
          <div className="p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Stock & mouvements</h3>
              <p className="text-gray-600">Cette fonctionnalité sera bientôt disponible.</p>
            </div>
          </div>
        );
      case 'costs':
        return (
          <div className="p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Coûts & marges</h3>
              <p className="text-gray-600">Cette fonctionnalité sera bientôt disponible.</p>
            </div>
          </div>
        );
      case 'suppliers':
        return (
          <div className="p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Fournisseurs</h3>
              <p className="text-gray-600">Cette fonctionnalité sera bientôt disponible.</p>
            </div>
          </div>
        );
      case 'users':
        return (
          <div className="p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Utilisateurs</h3>
              <p className="text-gray-600">Cette fonctionnalité sera bientôt disponible.</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Paramètres</h3>
              <p className="text-gray-600">Cette fonctionnalité sera bientôt disponible.</p>
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-3s-blue/10 via-white to-3s-blue/5 flex items-center justify-center">
        <div className="bg-white p-10 rounded-2xl shadow-3s-lg max-w-md w-full border border-3s-gray-light animate-fade-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-3s-blue rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-3s">
              <span className="text-white font-bold text-xl">SS</span>
            </div>
            <h1 className="text-3xl font-bold text-3s-black font-inter">StockSpider</h1>
            <p className="text-3s-gray-medium mt-2 font-medium">by 3S IT</p>
            <p className="text-3s-gray-medium mt-4">Connectez-vous pour accéder à votre inventaire</p>
          </div>
          <button
            onClick={() => {/* Auto-login for demo */}}
            className="w-full bg-3s-blue hover:bg-3s-blue-dark text-white py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-3s"
          >
            Connexion automatique (Demo)
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