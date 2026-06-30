import {
  Component,
  Product,
  User,
  DashboardStats,
  AppSettings,
  Client,
  Chantier,
  BonSortieListItem,
  BonSortieDetail,
  Supplier,
} from '../types';

const resolvedApiBase = (() => {
  const envUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    // Use api subdomain for production (https) or use localhost for development
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:3002`;
    } else {
      // Production: use HTTPS with api subdomain
      return `https://apistock.spiderhome.org`;
    }
  }

  return `http://localhost:3002`;
})();

const API_BASE_URL = `${resolvedApiBase}/api`;

// Helper function to convert image URLs to use the correct API base
const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';

  // If it's already a full URL, extract the path portion and use current API base
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    try {
      // Parse the URL to extract the path
      const url = new URL(imagePath);
      const pathWithQuery = url.pathname + url.search;

      // Reconstruct with current API base
      // For uploads, use the base without /api suffix
      if (pathWithQuery.startsWith('/uploads/')) {
        return `${resolvedApiBase}${pathWithQuery}`;
      }

      // For other API routes, use the full API base
      return `${API_BASE_URL}${pathWithQuery}`;
    } catch (e) {
      // If URL parsing fails, fall back to simple replacement
      return imagePath.replace(/https?:\/\/[^/]+/i, resolvedApiBase);
    }
  }

  // If it's a relative path, prepend the correct API base
  if (!imagePath.startsWith('/')) {
    return `${resolvedApiBase}/${imagePath}`;
  }

  // Absolute path - check if it's an uploads path
  if (imagePath.startsWith('/uploads/')) {
    return `${resolvedApiBase}${imagePath}`;
  }

  return `${resolvedApiBase}${imagePath}`;
};

class ApiService {
  private token: string | null = null;

  constructor() {
    // Récupérer le token du localStorage au démarrage
    this.token = localStorage.getItem('stockspider_token');
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Non autorisé (401)');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Authentification
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const result = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.token = result.token;
    localStorage.setItem('stockspider_token', result.token);

    return result;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('stockspider_token');
  }

  // Vérifier si l'utilisateur est connecté
  isLoggedIn(): boolean {
    return !!this.token && !!localStorage.getItem('stockspider_token');
  }

  // Composants
  async getComponents(): Promise<Component[]> {
    return this.request<Component[]>('/components');
  }

  async createComponent(component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>): Promise<Component> {
    return this.request<Component>('/components', {
      method: 'POST',
      body: JSON.stringify(component),
    });
  }

  async updateComponent(id: string, updates: Partial<Component>): Promise<Component> {
    return this.request<Component>(`/components/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteComponent(id: string): Promise<void> {
    await this.request(`/components/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadComponentImage(componentId: string, imageFile: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('componentId', componentId);

    const response = await fetch(`${API_BASE_URL}/components/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Non autorisé (401)');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async deleteProduct(id: string): Promise<void> {
    await this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async updateStock(componentId: string, quantity: number, type: 'in' | 'out' | 'adjustment', reason: string): Promise<void> {
    await this.request(`/components/${componentId}/stock`, {
      method: 'POST',
      body: JSON.stringify({ quantity, type, reason }),
    });
  }

  // Approvisionnement (calcul métier centralisé côté backend)
  async getProcurement(plan?: Record<string, number>): Promise<{ rows: any[]; summary: any; blockedProducts: any[] }> {
    const suffix = plan && Object.keys(plan).length ? `?plan=${encodeURIComponent(JSON.stringify(plan))}` : '';
    return this.request(`/procurement${suffix}`);
  }

  // Vue d'ensemble dashboard (tout agrégé côté MySQL)
  async getDashboardOverview(): Promise<any> {
    return this.request(`/dashboard/overview`);
  }

  // Mouvements de stock (table MySQL stock_movements)
  async getStockMovements(params: { limit?: number; componentId?: string; type?: string } = {}): Promise<any[]> {
    const qs = new URLSearchParams();
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.componentId) qs.set('componentId', params.componentId);
    if (params.type && params.type !== 'all') qs.set('type', params.type);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<any[]>(`/stock/movements${suffix}`);
  }

  async createStockMovement(payload: { componentId: string; type: 'in' | 'out' | 'adjustment'; quantity: number; unitPrice?: number; reason: string }): Promise<void> {
    await this.request(`/stock/movements`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Produits
  async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/products');
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    return this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Transition d'état de production (start/finish/sell/defect) — backend transactionnel
  async transitionProduct(
    productId: string,
    action: 'start' | 'finish' | 'sell' | 'defect',
    quantity: number,
    from?: 'in_progress' | 'assembled_finished'
  ): Promise<Product> {
    return this.request<Product>(`/products/${productId}/transition`, {
      method: 'POST',
      body: JSON.stringify({ action, quantity, from }),
    });
  }

  async assembleProduct(productId: string, quantity: number = 1): Promise<void> {
    await this.request(`/products/${productId}/assemble`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    });
  }

  async uploadProductImage(productId: string, imageFile: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('productId', productId);

    const response = await fetch(`${API_BASE_URL}/products/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Non autorisé (401)');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats');
  }

  async getLowStockComponents(): Promise<Component[]> {
    return this.request<Component[]>('/dashboard/low-stock');
  }

  // Test de connexion
  async testConnection(): Promise<boolean> {
    try {
      // Tester avec un endpoint qui nécessite une authentification
      await this.request('/dashboard/stats');
      return true;
    } catch {
      return false;
    }
  }

  // Settings
  async getSettings(): Promise<AppSettings> {
    return this.request<AppSettings>('/settings');
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<{ message: string; settings: AppSettings }> {
    return this.request<{ message: string; settings: AppSettings }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async uploadCompanyLogo(imageFile: File): Promise<{ success: boolean; logoUrl: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${API_BASE_URL}/settings/upload-logo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Non autorisé (401)');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Clients
  async getClients(): Promise<Client[]> {
    return this.request<Client[]>('/clients');
  }

  async createClient(payload: Pick<Client, 'companyName' | 'matriculeFiscal' | 'address' | 'phone' | 'email'>): Promise<Client> {
    return this.request<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateClient(id: string, payload: Partial<Pick<Client, 'companyName' | 'matriculeFiscal' | 'address' | 'phone' | 'email'>>): Promise<Client> {
    return this.request<Client>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteClient(id: string): Promise<void> {
    await this.request(`/clients/${id}`, { method: 'DELETE' });
  }

  // Fournisseurs
  async getSuppliers(): Promise<Supplier[]> {
    return this.request<Supplier[]>('/suppliers');
  }

  async createSupplier(payload: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
    return this.request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateSupplier(id: string, payload: Partial<Omit<Supplier, 'id' | 'createdAt'>>): Promise<Supplier> {
    return this.request<Supplier>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteSupplier(id: string): Promise<void> {
    await this.request(`/suppliers/${id}`, { method: 'DELETE' });
  }

  // Chantiers
  async getChantiers(clientId?: string): Promise<Chantier[]> {
    const qs = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
    return this.request<Chantier[]>(`/chantiers${qs}`);
  }

  async createChantier(payload: { clientId?: string | null; name: string; address: string }): Promise<Chantier> {
    return this.request<Chantier>('/chantiers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateChantier(id: string, payload: Partial<{ clientId?: string | null; name: string; address: string }>): Promise<Chantier> {
    return this.request<Chantier>(`/chantiers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteChantier(id: string): Promise<void> {
    await this.request(`/chantiers/${id}`, { method: 'DELETE' });
  }

  // Bons de sortie
  async getBonsSortie(): Promise<BonSortieListItem[]> {
    return this.request<BonSortieListItem[]>('/bons-sortie');
  }

  async getBonSortie(id: string): Promise<BonSortieDetail> {
    return this.request<BonSortieDetail>(`/bons-sortie/${encodeURIComponent(id)}`);
  }

  async createBonSortie(payload: { clientId: string; chantierId: string; personnel?: string; items: Array<{ productId: string; quantity: number }> }): Promise<{ id: string; message: string }> {
    return this.request<{ id: string; message: string }>('/bons-sortie', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateBonSortie(id: string, payload: { clientId: string; chantierId: string; personnel?: string; items: Array<{ productId: string; quantity: number }> }): Promise<{ id: string; message: string }> {
    return this.request<{ id: string; message: string }>(`/bons-sortie/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteBonSortie(id: string): Promise<void> {
    await this.request(`/bons-sortie/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}

export const apiService = new ApiService();
export { getImageUrl };