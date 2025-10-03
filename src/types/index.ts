export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'reader';
  createdAt: string;
}

export interface Component {
  id: string;
  designation: string;
  name: string;
  productNumber: string;
  footprint: string;
  quantity: number;
  unitPrice: number;
  supplier: string;
  category: ComponentCategory;
  minStock: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  productNumber: string;
  components: ProductComponent[];
  productionCost: number;
  sellingPrice: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssembledProduct {
  id: string;
  productId: string;
  productName: string;
  productDescription: string;
  assembledQuantity: number;
  assembledAt: string;
  assembledBy: string;
  totalCost: number;
  sellingPrice: number;
}

export interface ProductInAssembly {
  id: string;
  productId: string;
  productName: string;
  productDescription: string;
  quantityToAssemble: number;
  componentsRequired: Array<{
    componentId: string;
    componentName: string;
    componentDesignation: string;
    requiredQuantity: number;
    availableQuantity: number;
    isAvailable: boolean;
  }>;
  createdAt: string;
  createdBy: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface ComponentToBuy {
  id: string;
  componentId: string;
  componentName: string;
  componentDesignation: string;
  requiredQuantity: number;
  availableQuantity: number;
  quantityToBuy: number;
  unitPrice: number;
  totalCost: number;
  productInAssemblyId: string;
  productName: string;
  createdAt: string;
  status: 'pending' | 'ordered' | 'received' | 'cancelled';
}

export interface ProductComponent {
  componentId: string;
  quantity: number;
}

export interface StockMovement {
  id: string;
  componentId?: string;
  productId?: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unitPrice?: number;
  reason: string;
  userId: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}

export type ComponentCategory = 
  | 'condensateur'
  | 'resistance'
  | 'relais'
  | 'microcontroleur'
  | 'connecteur'
  | 'inducteur'
  | 'diode'
  | 'transistor'
  | 'capteur'
  | 'autre';

export interface DashboardStats {
  totalComponents: number;
  totalProducts: number;
  lowStockAlerts: number;
  totalValue: number;
  recentMovements: StockMovement[];
}