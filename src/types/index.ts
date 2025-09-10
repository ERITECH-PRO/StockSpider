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
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  components: ProductComponent[];
  productionCost: number;
  sellingPrice: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
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