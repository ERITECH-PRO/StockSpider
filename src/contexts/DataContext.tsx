import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { Component, Product, Supplier, StockMovement, DashboardStats, AssembledProduct, ProductInAssembly, ComponentToBuy } from '../types';
import { apiService } from '../services/api';
import { useToast } from '../hooks/useToast';

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
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
  
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
  
  // États des données
  const [components, setComponents] = useState<Component[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [assembledProducts, setAssembledProducts] = useState<AssembledProduct[]>(() => {
    try {
      const saved = localStorage.getItem('assembledProducts');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Erreur chargement produits assemblés:', error);
      return [];
    }
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
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
        showSyncNotification('success', 'Synchronisation réussie', successMessage);
        showSuccess('Synchronisation réussie', successMessage);
      }
      return result;
    } catch (error) {
      if (errorMessage) {
        showSyncNotification('error', 'Erreur de synchronisation', errorMessage);
        showError('Erreur de synchronisation', errorMessage);
      }
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [showSuccess, showError, showSyncNotification]);

  // Charger les données initiales
  const loadData = useCallback(async () => {
    await syncWithIndicator(async () => {
      setLoading(true);
      const [componentsData, productsData, statsData] = await Promise.all([
        apiService.getComponents(),
        apiService.getProducts(),
        apiService.getDashboardStats()
      ]);
      
      setComponents(componentsData);
      setProducts(productsData);
      setDashboardStats(statsData);
    }, 'Données chargées avec succès', 'Impossible de charger les données');
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
  }, [syncWithIndicator, showSuccess]);

  const deleteProduct = useCallback(async (id: string) => {
    await syncWithIndicator(async () => {
      await apiService.deleteProduct(id);
      setProducts(prev => prev.filter(prod => prod.id !== id));
      showSuccess('Produit supprimé', 'Le produit a été supprimé avec succès');
    }, undefined, 'Impossible de supprimer le produit');
  }, [syncWithIndicator, showSuccess]);

  // Actions pour les fournisseurs
  const addSupplier = useCallback((supplier: Omit<Supplier, 'id' | 'createdAt'>) => {
    const newSupplier: Supplier = {
      ...supplier,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setSuppliers(prev => [...prev, newSupplier]);
    showSuccess('Fournisseur ajouté', `${supplier.name} a été ajouté avec succès`);
  }, [showSuccess]);

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
      
      setAssembledProducts(prev => {
        const newList = [assembledProduct, ...prev];
        try {
          localStorage.setItem('assembledProducts', JSON.stringify(newList));
        } catch (error) {
          console.error('Erreur sauvegarde localStorage:', error);
        }
        return newList;
      });
      
      showSuccess('Produit assemblé', `${product.name} assemblé avec succès (${quantity} unité${quantity > 1 ? 's' : ''})`);
      return true;
    }, undefined, 'Impossible d\'assembler le produit');
  }, [products, components, syncWithIndicator, showSuccess]);

  // Fonction pour regrouper les produits identiques
  const groupProductsById = useCallback((products: ProductInAssembly[]): ProductInAssembly[] => {
    const grouped = new Map<string, ProductInAssembly>();
    
    products.forEach(product => {
      const key = product.productId;
      
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        
        // Fusionner seulement si les deux sont en statut "pending"
        if (existing.status === 'pending' && product.status === 'pending') {
          // Cumuler les quantités
          const newQuantity = existing.quantityToAssemble + product.quantityToAssemble;
          
          // Cumuler les composants requis
          const mergedComponents = existing.componentsRequired.map(existingComp => {
            const matchingComp = product.componentsRequired.find(comp => 
              comp.componentId === existingComp.componentId
            );
            
            if (matchingComp) {
              return {
                ...existingComp,
                requiredQuantity: existingComp.requiredQuantity + matchingComp.requiredQuantity,
                isAvailable: existingComp.availableQuantity >= (existingComp.requiredQuantity + matchingComp.requiredQuantity)
              };
            }
            
            return existingComp;
          });
          
          // Créer le produit fusionné
          const mergedProduct: ProductInAssembly = {
            ...existing,
            quantityToAssemble: newQuantity,
            componentsRequired: mergedComponents,
            createdAt: existing.createdAt, // Garder la date de création la plus ancienne
            createdBy: existing.createdBy
          };
          
          grouped.set(key, mergedProduct);
        } else {
          // Si les statuts sont différents, garder les deux séparément
          grouped.set(`${key}_${product.id}`, product);
        }
      } else {
        grouped.set(key, product);
      }
    });
    
    return Array.from(grouped.values());
  }, []);

  // Fonction pour synchroniser les composants à acheter avec le stock actuel
  const syncComponentsToBuy = useCallback(() => {
    try {
      const saved = localStorage.getItem('componentsToBuy');
      if (saved) {
        const componentsToBuy: ComponentToBuy[] = JSON.parse(saved);
        
        const syncedComponents = componentsToBuy
          .map(comp => {
            const currentComponent = components.find(c => c.id === comp.componentId);
            if (currentComponent) {
              const newAvailableQuantity = currentComponent.quantity;
              const newQuantityToBuy = Math.max(0, comp.requiredQuantity - newAvailableQuantity);
              const newTotalCost = newQuantityToBuy * Number(comp.unitPrice || 0);
              
              return {
                ...comp,
                availableQuantity: newAvailableQuantity,
                quantityToBuy: newQuantityToBuy,
                totalCost: newTotalCost
              };
            }
            return comp;
          })
          .filter(comp => comp.quantityToBuy > 0); // Ne garder que les composants qui nécessitent un achat
        
        // Sauvegarder les composants synchronisés
        localStorage.setItem('componentsToBuy', JSON.stringify(syncedComponents));
      }
    } catch (error) {
      console.error('Erreur synchronisation composants à acheter:', error);
    }
  }, [components]);

  // Ajouter un produit à l'assemblage (nouvelle logique)
  const addProductToAssembly = useCallback(async (productId: string, quantity: number) => {
    await syncWithIndicator(async () => {
      const product = products.find(p => p.id === productId);
      if (!product) {
        throw new Error('Produit non trouvé');
      }

      // Analyser les composants requis
      const componentsRequired = product.components.map(pc => {
        const component = components.find(c => c.id === pc.componentId);
        if (!component) {
          throw new Error(`Composant introuvable: ${pc.componentId}`);
        }
        
        const requiredQuantity = (Number(pc.quantity) || 0) * quantity;
        const availableQuantity = component.quantity;
        
        return {
          componentId: component.id,
          componentName: component.name,
          componentDesignation: component.designation,
          requiredQuantity,
          availableQuantity,
          isAvailable: availableQuantity >= requiredQuantity
        };
      });

      // Créer le produit en cours d'assemblage
      const productInAssembly: ProductInAssembly = {
        id: `assembly_${Date.now()}_${productId}`,
        productId: product.id,
        productName: product.name,
        productDescription: product.description,
        quantityToAssemble: quantity,
        componentsRequired,
        createdAt: new Date().toISOString(),
        createdBy: 'current_user',
        status: 'pending'
      };

      // Sauvegarder dans localStorage avec regroupement automatique
      try {
        const existing = JSON.parse(localStorage.getItem('productsInAssembly') || '[]');
        const updated = [productInAssembly, ...existing];
        const grouped = groupProductsById(updated);
        localStorage.setItem('productsInAssembly', JSON.stringify(grouped));
      } catch (error) {
        console.error('Erreur sauvegarde produits en cours:', error);
      }

      // Ajouter les composants manquants à la liste d'achat
      const componentsToBuy: ComponentToBuy[] = [];
      componentsRequired.forEach(comp => {
        if (!comp.isAvailable) {
          const component = components.find(c => c.id === comp.componentId);
          if (component) {
            const quantityToBuy = comp.requiredQuantity - comp.availableQuantity;
            componentsToBuy.push({
              id: `buy_${Date.now()}_${comp.componentId}`,
              componentId: comp.componentId,
              componentName: comp.componentName,
              componentDesignation: comp.componentDesignation,
              requiredQuantity: comp.requiredQuantity,
              availableQuantity: comp.availableQuantity,
              quantityToBuy,
              unitPrice: component.unitPrice,
              totalCost: quantityToBuy * component.unitPrice,
              productInAssemblyId: productInAssembly.id,
              productName: product.name,
              createdAt: new Date().toISOString(),
              status: 'pending'
            });
          }
        }
      });

      // Sauvegarder les composants à acheter
      if (componentsToBuy.length > 0) {
        try {
          const existing = JSON.parse(localStorage.getItem('componentsToBuy') || '[]');
          const updated = [...componentsToBuy, ...existing];
          localStorage.setItem('componentsToBuy', JSON.stringify(updated));
        } catch (error) {
          console.error('Erreur sauvegarde composants à acheter:', error);
        }
      }

      const missingCount = componentsRequired.filter(c => !c.isAvailable).length;
      if (missingCount > 0) {
        showSuccess('Produit ajouté à l\'assemblage', `${product.name} ajouté avec ${missingCount} composant${missingCount > 1 ? 's' : ''} manquant${missingCount > 1 ? 's' : ''}`);
      } else {
        showSuccess('Produit ajouté à l\'assemblage', `${product.name} prêt à être assemblé`);
      }
    }, undefined, 'Impossible d\'ajouter le produit à l\'assemblage');
  }, [products, components, syncWithIndicator, showSuccess]);

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

  // Charger les données au démarrage
  React.useEffect(() => {
    const hasToken = !!localStorage.getItem('stockspider_token');
    if (hasToken) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [loadData]);

  // Synchroniser automatiquement les composants à acheter quand le stock change
  useEffect(() => {
    if (components.length > 0) {
      syncComponentsToBuy();
    }
  }, [components, syncComponentsToBuy]);

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
    updateStock,
    assembleProduct,
    addProductToAssembly,
    loadData,
    reloadComponents,
    getDashboardStats,
    getLowStockComponents,
    
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
    updateStock,
    assembleProduct,
    addProductToAssembly,
    loadData,
    reloadComponents,
    getDashboardStats,
    getLowStockComponents,
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