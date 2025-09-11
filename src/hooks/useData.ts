import { useState, useEffect, useCallback } from 'react';
import { Component, Product, Supplier, StockMovement, DashboardStats, AssembledProduct } from '../types';
import { apiService } from '../services/api';
import { useToast } from './useToast';

// Mock suppliers (pas encore d'API)
const mockSuppliers: Supplier[] = [];

export const useData = () => {
  const { showError } = useToast();
  const [components, setComponents] = useState<Component[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  // Charger les produits assemblés depuis localStorage au démarrage
  const [assembledProducts, setAssembledProducts] = useState<AssembledProduct[]>(() => {
    try {
      const saved = localStorage.getItem('assembledProducts');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Erreur chargement produits assemblés:', error);
      return [];
    }
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [movements] = useState<StockMovement[]>([]);
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
      
      // console.log('📦 Données chargées:', { 
      //   components: componentsData.length, 
      //   products: productsData.length 
      // });
      
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
    const hasToken = !!localStorage.getItem('stockspider_token');
    if (hasToken) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [loadData]);

  const addComponent = async (component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // console.log('🔧 Ajout composant:', component.designation);
      const newComponent = await apiService.createComponent(component);
      setComponents(prev => {
        const updated = [...prev, newComponent];
        // console.log('📦 Composants mis à jour:', updated.length);
        return updated;
      });
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

  const deleteProduct = async (id: string) => {
    try {
      await apiService.deleteProduct(id);
      setProducts(prev => prev.filter(prod => prod.id !== id));
    } catch (error) {
      console.error('Erreur suppression produit:', error);
      showError('Erreur', 'Impossible de supprimer le produit');
      throw error;
    }
  };

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // console.log('📦 Création produit avec composants:', product.components?.length || 0);
      const newProduct = await apiService.createProduct(product);
      setProducts(prev => [...prev, newProduct]);
      // Recharger les composants pour mettre à jour les stocks et s'assurer qu'ils sont visibles
      // console.log('🔄 Rechargement des données après création produit...');
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
      // Trouver le composant actuel
      const currentComponent = components.find(c => c.id === componentId);
      if (!currentComponent) {
        throw new Error('Composant non trouvé');
      }

      console.log('📦 Mise à jour stock - Avant:', {
        componentId,
        componentName: currentComponent.designation,
        currentQuantity: currentComponent.quantity,
        quantity,
        type,
        reason
      });

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

      console.log('📦 Mise à jour stock - Calcul:', {
        currentQuantity: currentComponent.quantity,
        quantity,
        type,
        newQuantity
      });

      // Mettre à jour localement immédiatement pour un feedback instantané
      setComponents(prev => 
        prev.map(comp => 
          comp.id === componentId 
            ? { ...comp, quantity: newQuantity, updatedAt: new Date().toISOString() }
            : comp
        )
      );

      console.log('📦 Mise à jour locale effectuée');

      // Envoyer la mise à jour au serveur
      await apiService.updateStock(componentId, quantity, type, reason);
      
      console.log('📦 Mise à jour serveur effectuée');
      
    } catch (error) {
      console.error('❌ Erreur mise à jour stock:', error);
      showError('Erreur', 'Impossible de mettre à jour le stock');
      
      // En cas d'erreur, recharger les données pour restaurer l'état correct
      await loadData();
      throw error;
    }
  };

  const assembleProduct = async (productId: string) => {
    try {
      console.log('🔧 Début assemblage produit:', productId);
      
      await apiService.assembleProduct(productId);
      console.log('✅ API assemblage appelée avec succès');
      
      // Trouver le produit assemblé
      const product = products.find(p => p.id === productId);
      console.log('🔍 Produit trouvé:', product);
      
      if (product) {
        // Créer un produit assemblé
        const assembledProduct: AssembledProduct = {
          id: `assembled_${Date.now()}_${productId}`,
          productId: product.id,
          productName: product.name,
          productDescription: product.description,
          assembledQuantity: 1,
          assembledAt: new Date().toISOString(),
          assembledBy: 'current_user', // TODO: Récupérer l'utilisateur actuel
          totalCost: Number(product.productionCost) || 0,
          sellingPrice: Number(product.sellingPrice) || 0
        };
        
        console.log('📦 Produit assemblé créé:', assembledProduct);
        
        // Ajouter à la liste des produits assemblés
          setAssembledProducts(prev => {
            const newList = [assembledProduct, ...prev];
            console.log('📋 Nouvelle liste des produits assemblés:', newList);
            
            // Sauvegarder dans localStorage
            try {
              localStorage.setItem('assembledProducts', JSON.stringify(newList));
              console.log('💾 Produits assemblés sauvegardés dans localStorage');
            } catch (error) {
              console.error('Erreur sauvegarde localStorage:', error);
            }
            
            return newList;
          });
      }
      
      // Recharger les données pour mettre à jour les stocks
      await loadData();
      console.log('✅ Assemblage terminé avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur assemblage produit:', error);
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

  // Fonction pour recharger uniquement les composants
  const reloadComponents = useCallback(async () => {
    try {
      const componentsData = await apiService.getComponents();
      // console.log('🔄 Rechargement composants:', componentsData.length);
      setComponents(componentsData);
    } catch (error) {
      console.error('Erreur rechargement composants:', error);
      showError('Erreur', 'Impossible de recharger les composants');
    }
  }, [showError]);

  return {
    components,
    products,
    assembledProducts,
    suppliers,
    movements,
    loading,
    loadData,
    reloadComponents,
    addComponent,
    updateComponent,
    deleteComponent,
    addProduct,
    updateProduct,
    deleteProduct,
    addSupplier,
    updateStock,
    assembleProduct,
    getDashboardStats,
    getLowStockComponents,
  };
};