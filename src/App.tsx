import React, { useState } from 'react';
import { Package, Wrench, TrendingUp, DollarSign, Truck, Users, Settings, Loader2, Box, Calendar, User } from 'lucide-react';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import { ToastProvider } from './hooks/useToast';
import { useData } from './hooks/useData';
import { AssembledProduct } from './types';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Dashboard from './components/Dashboard/Dashboard';
import ComponentList from './components/Components/ComponentList';
import ComponentModal from './components/Components/ComponentModal';
import ProductList from './components/Products/ProductList';
import ProductModal from './components/Products/ProductModal';

// Composant pour afficher les produits assemblés
const AssembledProductsPage = ({ searchQuery }: { searchQuery: string }) => {
  const { assembledProducts } = useData();

  console.log('🔍 AssembledProductsPage - assembledProducts:', assembledProducts);
  console.log('🔍 AssembledProductsPage - searchQuery:', searchQuery);
  
  // Log visible pour debug
  if (assembledProducts.length > 0) {
    console.log('✅ PRODUITS ASSEMBLÉS TROUVÉS:', assembledProducts.length);
  } else {
    console.log('❌ AUCUN PRODUIT ASSEMBLÉ TROUVÉ');
  }

  const filteredProducts = assembledProducts.filter(product =>
    product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.productDescription.toLowerCase().includes(searchQuery.toLowerCase())
  );

  console.log('🔍 AssembledProductsPage - filteredProducts:', filteredProducts);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMargin = (assembledProduct: AssembledProduct) => {
    const cost = assembledProduct.totalCost;
    const price = assembledProduct.sellingPrice;
    if (price <= 0) return '0.0';
    return (((price - cost) / price) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6 p-6 bg-3s-gray-light min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-3s-black font-inter">Produits assemblés</h2>
          <p className="text-3s-gray-medium font-inter">Historique des produits assemblés</p>
        </div>
        <div className="text-sm text-3s-gray-medium font-inter">
          {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} assemblé{filteredProducts.length > 1 ? 's' : ''}
        </div>
      </div>

      {filteredProducts.map((assembledProduct) => {
        const margin = getMargin(assembledProduct);

        return (
          <div key={assembledProduct.id} className="card-3s p-6 animate-fade-in hover:shadow-card-hover transition-all duration-200">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg shadow-3s">
                  <Box className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-3s-black font-inter">{assembledProduct.productName}</h3>
                  <p className="text-3s-gray-medium mt-1 font-inter">{assembledProduct.productDescription}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-medium font-inter">Quantité assemblée</p>
                <p className="text-2xl font-bold text-blue-700 mt-1 font-inter">{assembledProduct.assembledQuantity}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-medium font-inter">Prix de vente</p>
                <p className="text-2xl font-bold text-green-700 mt-1 font-inter">{Number(assembledProduct.sellingPrice).toFixed(2)}€</p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-600 font-medium font-inter">Coût total</p>
                <p className="text-2xl font-bold text-orange-700 mt-1 font-inter">{Number(assembledProduct.totalCost).toFixed(2)}€</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600 font-medium font-inter">Marge</p>
                <p className="text-2xl font-bold text-purple-700 mt-1 font-inter">{margin}%</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 font-inter">Assemblé le</p>
                    <p className="font-medium text-3s-black font-inter">{formatDate(assembledProduct.assembledAt)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 font-inter">Assemblé par</p>
                    <p className="font-medium text-3s-black font-inter">{assembledProduct.assembledBy}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Box className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-3s-black mb-2 font-inter">Aucun produit assemblé</h3>
          <p className="text-3s-gray-medium font-inter">Les produits assemblés apparaîtront ici.</p>
        </div>
      )}
    </div>
  );
};

const AppContent = () => {
  const { isAuthenticated, login, loading: authLoading } = useAuth();
  const { getLowStockComponents } = useData();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: 'admin@stockspider.com', password: 'admin123' });
  const [loginLoading, setLoginLoading] = useState(false);

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
  const showSearch = ['components', 'products', 'assembly', 'suppliers'].includes(currentPage);

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
        return <AssembledProductsPage searchQuery={searchQuery} />;
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
                placeholder="admin@stockspider.com"
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
                placeholder="admin123"
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
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 font-inter font-medium">🔗 Connexion MySQL</p>
            <p className="text-xs text-blue-600 mt-1 font-inter">
              L'application se connecte à votre base MySQL distante
            </p>
          </div>
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
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;