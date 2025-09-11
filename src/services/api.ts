import { Component, Product, User, DashboardStats } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

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

  async assembleProduct(productId: string): Promise<void> {
    await this.request(`/products/${productId}/assemble`, {
      method: 'POST',
    });
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
}

export const apiService = new ApiService();