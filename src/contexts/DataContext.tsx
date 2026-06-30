import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Component, Product, Supplier, StockMovement, DashboardStats, AssembledProduct } from '../types';
import { apiService } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

interface DataContextType {
  // État des données
  components: Component[];
  products: Product[];
  assembledProducts: AssembledProduct[];
  suppliers: Supplier[];
  movements: StockMovement[];
  dashboardStats: DashboardStats | null;
  loading: boolean;

  // Actions pour les composants
  addComponent: (component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Component>;
  updateComponent: (id: string, updates: Partial<Component>) => Promise<Component>;
  deleteComponent: (id: string) => Promise<void>;

  // Actions pour les produits
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;

  // Actions pour les fournisseurs
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<Supplier>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<Supplier>;
  deleteSupplier: (id: string) => Promise<void>;

  // Actions pour le stock
  updateStock: (componentId: string, quantity: number, type: 'in' | 'out' | 'adjustment', reason: string) => Promise<void>;

  // Actions pour l'assemblage
  assembleProduct: (productId: string, quantity?: number) => Promise<boolean>;
  addProductToAssembly: (productId: string, quantity: number) => Promise<void>;

  // Utilitaires
  loadData: () => Promise<void>;
  reloadComponents: () => Promise<void>;
  getDashboardStats: () => DashboardStats;
  getLowStockComponents: () => Component[];
  getOutOfStockProducts: () => Product[];
  getOutOfStockComponents: () => Component[];

  // Indicateurs de synchronisation
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncNotification: {
    isVisible: boolean;
    type: 'success' | 'error' | 'loading';
    title: string;
    message?: string;
  };
  showSyncNotification: (type: 'success' | 'error' | 'loading', title: string, message?: string) => void;
  hideSyncNotification: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { showError, showSuccess } = useToast();
  const { isAuthenticated } = useAuth();

  // États des données
  const [components, setComponents] = useState<Component[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  // Données métier en mémoire uniquement (jamais persistées en localStorage)
  const [assembledProducts, setAssembledProducts] = useState<AssembledProduct[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // États de synchronisation
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncNotification, setSyncNotification] = useState({
    isVisible: false,
    type: 'success' as 'success' | 'error' | 'loading',
    title: '',
    message: ''
  });

  // Fonctions de notification de synchronisation
  const showSyncNotification = useCallback((type: 'success' | 'error' | 'loading', title: string, message?: string) => {
    setSyncNotification({
      isVisible: true,
      type,
      title,
      message: message || ''
    });
  }, []);

  const hideSyncNotification = useCallback(() => {
    setSyncNotification(prev => ({ ...prev, isVisible: false }));
  }, []);

  // Fonction de synchronisation avec indicateur visuel
  const syncWithIndicator = useCallback(async <T,>(
    operation: () => Promise<T>,
    successMessage?: string,
    errorMessage?: string
  ): Promise<T> => {
    setIsSyncing(true);
    showSyncNotification('loading', 'Synchronisation en cours...');

    try {
      const result = await operation();
      setLastSyncTime(new Date());

      if (successMessage) {
        // Afficher uniquement la notification de synchronisation pour éviter les doublons
        showSyncNotification('success', 'Synchronisation réussie', successMessage);
      } else {
        hideSyncNotification();
      }
      return result;
    } catch (error) {
      if (errorMessage) {
        // Afficher uniquement la notification de synchronisation pour éviter les doublons
        showSyncNotification('error', 'Erreur de synchronisation', errorMessage);
      } else {
        hideSyncNotification();
      }
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [showSuccess, showError, showSyncNotification]);

  // Charger les données initiales
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await syncWithIndicator(async () => {
        const [componentsData, productsData, statsData, suppliersData] = await Promise.all([
          apiService.getComponents(),
          apiService.getProducts(),
          apiService.getDashboardStats(),
          apiService.getSuppliers()
        ]);

        setComponents(componentsData);
        setProducts(productsData);
        setDashboardStats(statsData);
        setSuppliers(suppliersData);
      }, 'Données chargées avec succès', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  }, [syncWithIndicator]);

  // Actions pour les composants
  const addComponent = useCallback(async (component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>) => {
    return await syncWithIndicator(async () => {
      const newComponent = await apiService.createComponent(component);
      setComponents(prev => [...prev, newComponent]);
      showSuccess('Composant ajouté', `${component.designation} a été ajouté avec succès`);
      return newComponent;
    }, undefined, 'Impossible d\'ajouter le composant');
  }, [syncWithIndicator, showSuccess]);

  const updateComponent = useCallback(async (id: string, updates: Partial<Component>) => {
    return await syncWithIndicator(async () => {
      const updatedComponent = await apiService.updateComponent(id, updates);
      setComponents(prev =>
        prev.map(comp => comp.id === id ? updatedComponent : comp)
      );
      showSuccess('Composant mis à jour', 'Le composant a été modifié avec succès');
      return updatedComponent;
    }, undefined, 'Impossible de mettre à jour le composant');
  }, [syncWithIndicator, showSuccess]);

  const deleteComponent = useCallback(async (id: string) => {
    await syncWithIndicator(async () => {
      await apiService.deleteComponent(id);
      setComponents(prev => prev.filter(comp => comp.id !== id));
      showSuccess('Composant supprimé', 'Le composant a été supprimé avec succès');
    }, undefined, 'Impossible de supprimer le composant');
  }, [syncWithIndicator, showSuccess]);

  // Actions pour les produits
  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    return await syncWithIndicator(async () => {
      const newProduct = await apiService.createProduct(product);
      setProducts(prev => [...prev, newProduct]);

      // Recharger les composants pour mettre à jour les stocks
      const componentsData = await apiService.getComponents();
      setComponents(componentsData);

      showSuccess('Produit créé', `${product.name} a été créé avec succès`);
      return newProduct;
    }, undefined, 'Impossible d\'ajouter le produit');
  }, [syncWithIndicator, showSuccess]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    return await syncWithIndicator(async () => {
      const updatedProduct = await apiService.updateProduct(id, updates);
      setProducts(prev =>
        prev.map(prod => prod.id === id ? updatedProduct : prod)
      );

      // Recharger les composants si nécessaire
      if (updates.components) {
        const componentsData = await apiService.getComponents();
        setComponents(componentsData);
      }

      showSuccess('Produit mis à jour', 'Le produit a été modifié avec succès');
      return updatedProduct;
    }, undefined, 'Impossible de mettre à jour le produit');
  }, [syncWithIndicator, showSuccess, components]);

  const deleteProduct = useCallback(async (id: string) => {
    await syncWithIndicator(async () => {
      await apiService.deleteProduct(id);
      setProducts(prev => prev.filter(prod => prod.id !== id));
      showSuccess('Produit supprimé', 'Le produit a été supprimé avec succès');
    }, undefined, 'Impossible de supprimer le produit');
  }, [syncWithIndicator, showSuccess]);

  // Actions pour les fournisseurs
  const addSupplier = useCallback(async (supplier: Omit<Supplier, 'id' | 'createdAt'>) => {
    return await syncWithIndicator(async () => {
      const newSupplier = await apiService.createSupplier(supplier);
      setSuppliers(prev => [...prev, newSupplier]);
      showSuccess('Fournisseur ajouté', `${supplier.name} a été ajouté avec succès`);
      return newSupplier;
    }, undefined, 'Impossible d\'ajouter le fournisseur');
  }, [syncWithIndicator, showSuccess]);

  const updateSupplier = useCallback(async (id: string, updates: Partial<Supplier>) => {
    return await syncWithIndicator(async () => {
      const updatedSupplier = await apiService.updateSupplier(id, updates);
      setSuppliers(prev =>
        prev.map(s => s.id === id ? updatedSupplier : s)
      );
      showSuccess('Fournisseur mis à jour', 'Le fournisseur a été modifié avec succès');
      return updatedSupplier;
    }, undefined, 'Impossible de mettre à jour le fournisseur');
  }, [syncWithIndicator, showSuccess]);

  const deleteSupplier = useCallback(async (id: string) => {
    await syncWithIndicator(async () => {
      await apiService.deleteSupplier(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      showSuccess('Fournisseur supprimé', 'Le fournisseur a été supprimé avec succès');
    }, undefined, 'Impossible de supprimer le fournisseur');
  }, [syncWithIndicator, showSuccess]);

  // Actions pour le stock
  const updateStock = useCallback(async (componentId: string, quantity: number, type: 'in' | 'out' | 'adjustment', reason: string) => {
    await syncWithIndicator(async () => {
      const currentComponent = components.find(c => c.id === componentId);
      if (!currentComponent) {
        throw new Error('Composant non trouvé');
      }

      // Calculer la nouvelle quantité
      let newQuantity = currentComponent.quantity;
      if (type === 'in') {
        newQuantity += quantity;
      } else if (type === 'out') {
        newQuantity -= quantity;
      } else if (type === 'adjustment') {
        newQuantity = quantity;
      }
      newQuantity = Math.max(0, newQuantity);

      // Mise à jour optimiste locale
      setComponents(prev =>
        prev.map(comp =>
          comp.id === componentId
            ? { ...comp, quantity: newQuantity, updatedAt: new Date().toISOString() }
            : comp
        )
      );

      // Mise à jour serveur
      await apiService.updateStock(componentId, quantity, type, reason);

      showSuccess('Stock mis à jour', `Stock de ${currentComponent.designation} mis à jour`);
    }, undefined, 'Impossible de mettre à jour le stock');
  }, [components, syncWithIndicator, showSuccess]);

  // Actions pour l'assemblage
  const assembleProduct = useCallback(async (productId: string, quantity: number = 1) => {
    return await syncWithIndicator(async () => {
      const product = products.find(p => p.id === productId);
      if (!product) {
        throw new Error('Produit non trouvé');
      }

      // Vérifier le stock suffisant
      const insufficientComponents: Array<{
        name: string;
        required: number;
        available: number;
        componentId: string;
      }> = [];

      for (const pc of product.components) {
        const component = components.find(c => c.id === pc.componentId);
        if (!component) {
          throw new Error(`Composant introuvable: ${pc.componentId}`);
        }

        const requiredQuantity = (Number(pc.quantity) || 0) * quantity;
        const availableQuantity = component.quantity;

        if (availableQuantity < requiredQuantity) {
          insufficientComponents.push({
            name: component.designation,
            required: requiredQuantity,
            available: availableQuantity,
            componentId: component.id
          });
        }
      }

      if (insufficientComponents.length > 0) {
        const errorMessage = insufficientComponents
          .map(comp => `${comp.name}: ${comp.required} requis, ${comp.available} disponible`)
          .join('\n');
        throw new Error(`Stock insuffisant pour les composants suivants :\n${errorMessage}`);
      }

      // Soustraire les composants requis
      for (const pc of product.components) {
        const component = components.find(c => c.id === pc.componentId);
        if (component) {
          const requiredQuantity = (Number(pc.quantity) || 0) * quantity;
          const newQuantity = component.quantity - requiredQuantity;

          setComponents(prev =>
            prev.map(comp =>
              comp.id === component.id
                ? { ...comp, quantity: newQuantity, updatedAt: new Date().toISOString() }
                : comp
            )
          );

          await apiService.updateStock(component.id, requiredQuantity, 'out', `Assemblage de ${product.name} (${quantity} unité${quantity > 1 ? 's' : ''})`);
        }
      }

      // Ajouter la quantité produite au stock du produit fini
      const newProductQuantity = (Number(product.quantity) || 0) + quantity;

      setProducts(prev =>
        prev.map(prod =>
          prod.id === productId
            ? { ...prod, quantity: newProductQuantity, updatedAt: new Date().toISOString() }
            : prod
        )
      );

      await apiService.updateProduct(productId, { quantity: newProductQuantity });

      // Créer un produit assemblé pour l'historique
      const assembledProduct: AssembledProduct = {
        id: `assembled_${Date.now()}_${productId}`,
        productId: product.id,
        productName: product.name,
        productDescription: product.description,
        assembledQuantity: quantity,
        assembledAt: new Date().toISOString(),
        assembledBy: 'current_user',
        totalCost: Number(product.productionCost) || 0,
        sellingPrice: Number(product.sellingPrice) || 0
      };

      setAssembledProducts(prev => [assembledProduct, ...prev]);

      showSuccess('Produit assemblé', `${product.name} assemblé avec succès (${quantity} unité${quantity > 1 ? 's' : ''})`);
      return true;
    }, undefined, 'Impossible d\'assembler le produit');
  }, [products, components, syncWithIndicator, showSuccess]);

  // Démarrer l'assemblage : pcb_remaining -> in_progress (MySQL, transactionnel).
  // Remplace l'ancienne file d'attente localStorage.
  const addProductToAssembly = useCallback(async (productId: string, quantity: number) => {
    await syncWithIndicator(async () => {
      await apiService.transitionProduct(productId, 'start', quantity);
      // Rafraîchir produits + composants depuis MySQL
      const [productsData, componentsData] = await Promise.all([
        apiService.getProducts(),
        apiService.getComponents(),
      ]);
      setProducts(productsData);
      setComponents(componentsData);
      showSuccess('Assemblage démarré', `${quantity} unité(s) passée(s) en production`);
    }, undefined, 'Impossible de démarrer l\'assemblage');
  }, [syncWithIndicator, showSuccess]);

  // Utilitaires
  const reloadComponents = useCallback(async () => {
    await syncWithIndicator(async () => {
      const componentsData = await apiService.getComponents();
      setComponents(componentsData);
    }, 'Composants rechargés', 'Impossible de recharger les composants');
  }, [syncWithIndicator]);

  const getDashboardStats = useCallback((): DashboardStats => {
    if (dashboardStats) {
      return dashboardStats;
    }

    const lowStockComponents = components.filter(c => c.quantity <= c.minStock);
    const totalValue = components.reduce((sum, c) => sum + (c.quantity * c.unitPrice), 0);

    return {
      totalComponents: components.length,
      totalProducts: products.length,
      lowStockAlerts: lowStockComponents.length,
      totalValue,
      recentMovements: [],
    };
  }, [dashboardStats, components, products]);

  const getLowStockComponents = useCallback(() => {
    return components.filter(c => c.quantity <= c.minStock);
  }, [components]);

  const getOutOfStockProducts = useCallback(() => {
    return products.filter(p => (Number(p.quantity) || 0) <= 0);
  }, [products]);

  const getOutOfStockComponents = useCallback(() => {
    return components.filter(c => (Number(c.quantity) || 0) <= 0);
  }, [components]);

  // Charger les données au démarrage ou quand l'authentification change
  React.useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      const hasToken = !!localStorage.getItem('stockspider_token');
      if (!hasToken) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, loadData]);

  const value = useMemo(() => ({
    // État des données
    components,
    products,
    assembledProducts,
    suppliers,
    movements,
    dashboardStats,
    loading,

    // Actions
    addComponent,
    updateComponent,
    deleteComponent,
    addProduct,
    updateProduct,
    deleteProduct,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    updateStock,
    assembleProduct,
    addProductToAssembly,
    loadData,
    reloadComponents,
    getDashboardStats,
    getLowStockComponents,
    getOutOfStockProducts,
    getOutOfStockComponents,

    // Indicateurs de synchronisation
    isSyncing,
    lastSyncTime,
    syncNotification,
    showSyncNotification,
    hideSyncNotification,
  }), [
    components,
    products,
    assembledProducts,
    suppliers,
    movements,
    dashboardStats,
    loading,
    addComponent,
    updateComponent,
    deleteComponent,
    addProduct,
    updateProduct,
    deleteProduct,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    updateStock,
    assembleProduct,
    addProductToAssembly,
    loadData,
    reloadComponents,
    getDashboardStats,
    getLowStockComponents,
    getOutOfStockProducts,
    getOutOfStockComponents,
    isSyncing,
    lastSyncTime,
    syncNotification,
    showSyncNotification,
    hideSyncNotification,
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};