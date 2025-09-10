import { useState, useEffect } from 'react';
import { Component, Product, Supplier, StockMovement, DashboardStats, ComponentCategory } from '../types';

// Mock data for demonstration
const mockComponents: Component[] = [
  {
    id: '1',
    designation: 'Résistance 10kΩ',
    name: 'R10K',
    productNumber: 'R10K-0603',
    footprint: '0603',
    quantity: 1500,
    unitPrice: 0.02,
    supplier: 'Farnell',
    category: 'resistance',
    minStock: 100,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    designation: 'Condensateur 100nF',
    name: 'C100N',
    productNumber: 'C100N-0603',
    footprint: '0603',
    quantity: 50,
    unitPrice: 0.05,
    supplier: 'Mouser',
    category: 'condensateur',
    minStock: 200,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '3',
    designation: 'Microcontrôleur STM32',
    name: 'STM32F103',
    productNumber: 'STM32F103C8T6',
    footprint: 'LQFP48',
    quantity: 25,
    unitPrice: 3.50,
    supplier: 'STMicroelectronics',
    category: 'microcontroleur',
    minStock: 10,
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
  },
];

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Module Spider Basic',
    description: 'Module de base avec STM32 et composants essentiels',
    components: [
      { componentId: '1', quantity: 4 },
      { componentId: '2', quantity: 8 },
      { componentId: '3', quantity: 1 },
    ],
    productionCost: 15.50,
    sellingPrice: 25.00,
    quantity: 10,
    createdAt: '2024-01-15T12:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z',
  },
];

const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Farnell',
    contact: 'John Smith',
    email: 'orders@farnell.com',
    phone: '+33 1 23 45 67 89',
    address: '123 Electronics Street, Paris',
    createdAt: '2024-01-15T09:00:00Z',
  },
  {
    id: '2',
    name: 'Mouser Electronics',
    contact: 'Sarah Johnson',
    email: 'sales@mouser.fr',
    phone: '+33 1 98 76 54 32',
    address: '456 Component Avenue, Lyon',
    createdAt: '2024-01-15T09:30:00Z',
  },
];

export const useData = () => {
  const [components, setComponents] = useState<Component[]>(mockComponents);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);

  const addComponent = (component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newComponent: Component = {
      ...component,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setComponents(prev => [...prev, newComponent]);
  };

  const updateComponent = (id: string, updates: Partial<Component>) => {
    setComponents(prev => 
      prev.map(comp => 
        comp.id === id 
          ? { ...comp, ...updates, updatedAt: new Date().toISOString() }
          : comp
      )
    );
  };

  const deleteComponent = (id: string) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
  };

  const addProduct = (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProducts(prev => [...prev, newProduct]);
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

  const updateStock = (componentId: string, quantity: number, type: 'in' | 'out' | 'adjustment', reason: string) => {
    const component = components.find(c => c.id === componentId);
    if (!component) return;

    let newQuantity = component.quantity;
    if (type === 'in') {
      newQuantity += quantity;
    } else if (type === 'out') {
      newQuantity -= quantity;
    } else {
      newQuantity = quantity;
    }

    updateComponent(componentId, { quantity: Math.max(0, newQuantity) });

    const movement: StockMovement = {
      id: Date.now().toString(),
      componentId,
      type,
      quantity,
      reason,
      userId: '1',
      createdAt: new Date().toISOString(),
    };
    setMovements(prev => [movement, ...prev]);
  };

  const assembleProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return false;

    // Vérifier si l'assemblage est possible
    const canAssemble = product.components.every(pc => {
      const component = components.find(c => c.id === pc.componentId);
      return component && component.quantity >= pc.quantity;
    });

    if (!canAssemble) return false;

    // Décrémenter le stock des composants
    product.components.forEach(pc => {
      updateStock(pc.componentId, pc.quantity, 'out', `Assemblage produit: ${product.name}`);
    });

    // Incrémenter le stock du produit
    updateProduct(productId, { quantity: product.quantity + 1 });

    return true;
  };

  const getDashboardStats = (): DashboardStats => {
    const lowStockComponents = components.filter(c => c.quantity <= c.minStock);
    const totalValue = components.reduce((sum, c) => sum + (c.quantity * c.unitPrice), 0);
    
    return {
      totalComponents: components.length,
      totalProducts: products.length,
      lowStockAlerts: lowStockComponents.length,
      totalValue,
      recentMovements: movements.slice(0, 5),
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