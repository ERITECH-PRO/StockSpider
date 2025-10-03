import { Component, Product, User, DashboardStats } from '../types';
import { CLIENT_CONFIG } from '../config';

const API_BASE_URL = CLIENT_CONFIG.apiBaseUrl;

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

  async assembleProduct(productId: string, quantity: number = 1): Promise<void> {
    await this.request(`/products/${productId}/assemble`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
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