import { useState, useEffect, useCallback } from 'react';
import { Component, Product, Supplier, StockMovement, DashboardStats, ComponentCategory } from '../types';
import { apiService } from '../services/api';
import { useToast } from './useToast';

// Mock suppliers (pas encore d'API)
const mockSuppliers: Supplier[] = [];

export const useData = () => {
  const { showError } = useToast();
  const [components, setComponents] = useState<Component[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Charger les données initiales
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [componentsData, productsData, statsData] = await Promise.all([
        apiService.getComponents(),
        apiService.getProducts(),
        apiService.getDashboardStats()
      ]);
      
      setComponents(componentsData);
      setProducts(productsData);
      setDashboardStats(statsData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      showError('Erreur de connexion', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addComponent = async (component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newComponent = await apiService.createComponent(component);
      setComponents(prev => [...prev, newComponent]);
      return newComponent;
    } catch (error) {
      console.error('Erreur ajout composant:', error);
      showError('Erreur', 'Impossible d\'ajouter le composant');
      throw error;
    }
  };

  const updateComponent = async (id: string, updates: Partial<Component>) => {
    try {
      const updatedComponent = await apiService.updateComponent(id, updates);
      setComponents(prev => 
        prev.map(comp => comp.id === id ? updatedComponent : comp)
      );
      return updatedComponent;
    } catch (error) {
      console.error('Erreur mise à jour composant:', error);
      showError('Erreur', 'Impossible de mettre à jour le composant');
      throw error;
    }
  };

  const deleteComponent = async (id: string) => {
    try {
      await apiService.deleteComponent(id);
      setComponents(prev => prev.filter(comp => comp.id !== id));
    } catch (error) {
      console.error('Erreur suppression composant:', error);
      showError('Erreur', 'Impossible de supprimer le composant');
      throw error;
    }
  };

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newProduct = await apiService.createProduct(product);
      setProducts(prev => [...prev, newProduct]);
      // Recharger les composants pour mettre à jour les stocks
      await loadData();
      return newProduct;
    } catch (error) {
      console.error('Erreur ajout produit:', error);
      showError('Erreur', 'Impossible d\'ajouter le produit');
      throw error;
    }
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => 
      prev.map(prod => 
        prod.id === id 
          ? { ...prod, ...updates, updatedAt: new Date().toISOString() }
          : prod
      )
    );
  };

  const addSupplier = (supplier: Omit<Supplier, 'id' | 'createdAt'>) => {
    const newSupplier: Supplier = {
      ...supplier,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setSuppliers(prev => [...prev, newSupplier]);
  };

  const updateStock = async (componentId: string, quantity: number, type: 'in' | 'out' | 'adjustment', reason: string) => {
    try {
      await apiService.updateStock(componentId, quantity, type, reason);
      // Recharger les données pour avoir les stocks à jour
      await loadData();
    } catch (error) {
      console.error('Erreur mise à jour stock:', error);
      showError('Erreur', 'Impossible de mettre à jour le stock');
      throw error;
    }
  };

  const assembleProduct = async (productId: string) => {
    try {
      await apiService.assembleProduct(productId);
      // Recharger les données pour mettre à jour les stocks
      await loadData();
      return true;
    } catch (error) {
      console.error('Erreur assemblage produit:', error);
      showError('Erreur', error instanceof Error ? error.message : 'Impossible d\'assembler le produit');
      return false;
    }
  };

  const getDashboardStats = (): DashboardStats => {
    if (dashboardStats) {
      return dashboardStats;
    }

    // Fallback si les stats ne sont pas encore chargées
    const lowStockComponents = components.filter(c => c.quantity <= c.minStock);
    const totalValue = components.reduce((sum, c) => sum + (c.quantity * c.unitPrice), 0);
    
    return {
      totalComponents: components.length,
      totalProducts: products.length,
      lowStockAlerts: lowStockComponents.length,
      totalValue,
      recentMovements: [],
    };
  };

  const getLowStockComponents = () => {
    return components.filter(c => c.quantity <= c.minStock);
  };

  return {
    components,
    products,
    suppliers,
    movements,
    loading,
    loadData,
    addComponent,
    updateComponent,
    deleteComponent,
    addProduct,
    updateProduct,
    addSupplier,
    updateStock,
    assembleProduct,
    getDashboardStats,
    getLowStockComponents,
  };
};