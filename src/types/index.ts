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
  productionCost: number;
  sellingPrice: number;
  quantity: number;
  // Suivi détaillé des 5 états de production (inventaire SpiderRoll)
  pcbRemaining?: number;      // PCB nus restants
  inProgress?: number;        // en cours d'assemblage
  assembledFinished?: number; // assemblés finis
  sold?: number;              // vendus
  defective?: number;         // en panne
  imageUrl?: string;
  components: {
    componentId: string;
    quantity: number;
  }[];
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

export interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  matriculeFiscal?: string;
  logoUrl?: string;
}

export interface AppSettings {
  company: CompanySettings;
  inventory?: {
    lowStockThreshold?: number;
    autoReorder?: boolean;
    currency?: string;
  };
  notifications?: {
    lowStock?: boolean;
    newMovements?: boolean;
    emailAlerts?: boolean;
  };
  system?: {
    timezone?: string;
    dateFormat?: string;
    language?: string;
  };
}

export interface Client {
  id: string;
  companyName: string;
  matriculeFiscal?: string;
  address: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chantier {
  id: string;
  clientId?: string | null;
  clientCompanyName?: string | null;
  name: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface BonSortieListItem {
  id: string;
  clientId: string;
  clientCompanyName: string;
  chantierId: string;
  chantierName: string;
  personnel?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface BonSortieItem {
  id: string;
  bonSortieId: string;
  productId: string;
  productCode: string;
  productName: string;
  productDescription: string;
  quantity: number;
}

export interface BonSortieDetail {
  id: string;
  clientId: string;
  clientCompanyName: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  chantierId: string;
  chantierName: string;
  chantierAddress: string;
  personnel?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  items: BonSortieItem[];
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
  | 'alimentation'
  | 'bornier'
  | 'bouton'
  | 'expanseur'
  | 'fusible'
  | 'led'
  | 'optocoupleur'
  | 'pcb'
  | 'regulateur'
  | 'support'
  | 'autre';

export interface DashboardStats {
  totalComponents: number;
  totalProducts: number;
  lowStockAlerts: number;
  totalValue: number;
  recentMovements: StockMovement[];
}