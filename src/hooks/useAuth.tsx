import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { apiService } from '../services/api';
import { useToast } from './useToast';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showError, showSuccess } = useToast();

  // Vérifier si l'utilisateur est déjà connecté au démarrage
  useEffect(() => {
    const token = localStorage.getItem('stockspider_token');
    if (token) {
      // Tester la validité du token en faisant un appel API
      apiService.testConnection()
        .then((isValid) => {
          if (!isValid) {
            // Token invalide, nettoyer
            localStorage.removeItem('stockspider_token');
            apiService.logout();
          }
          // Note: Dans une vraie app, on récupérerait les infos utilisateur depuis le token ou un endpoint /me
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await apiService.login(email, password);
      setUser(result.user);
      showSuccess('Connexion réussie', `Bienvenue ${result.user.name} !`);
      return true;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      showError('Erreur de connexion', error instanceof Error ? error.message : 'Identifiants invalides');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    showSuccess('Déconnexion', 'À bientôt !');
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};