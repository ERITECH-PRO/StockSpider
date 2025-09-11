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
    const initializeAuth = async () => {
      const token = localStorage.getItem('stockspider_token');
      const savedUser = localStorage.getItem('stockspider_user');
      
      if (token && apiService.isLoggedIn()) {
        try {
          // Tester la validité du token en faisant un appel API authentifié
          const isValid = await apiService.testConnection();
          
          if (isValid) {
            // Token valide, restaurer l'état de connexion
            if (savedUser) {
              // Restaurer l'utilisateur depuis le localStorage
              try {
                const user = JSON.parse(savedUser);
                setUser(user);
              } catch (error) {
                console.error('Erreur lors du parsing de l\'utilisateur sauvegardé:', error);
                // Fallback vers l'utilisateur par défaut
                const defaultUser: User = {
                  id: '1',
                  name: 'Administrateur',
                  email: 'admin@stockspider.com',
                  role: 'admin',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                setUser(defaultUser);
              }
            } else {
              // Pas d'utilisateur sauvegardé, utiliser l'utilisateur par défaut
              const defaultUser: User = {
                id: '1',
                name: 'Administrateur',
                email: 'admin@stockspider.com',
                role: 'admin',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              setUser(defaultUser);
            }
          } else {
            // Token invalide, nettoyer
            localStorage.removeItem('stockspider_token');
            localStorage.removeItem('stockspider_user');
            apiService.logout();
          }
        } catch (error) {
          // Erreur réseau ou autre, nettoyer le token
          console.error('Erreur lors de la vérification du token:', error);
          localStorage.removeItem('stockspider_token');
          localStorage.removeItem('stockspider_user');
          apiService.logout();
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await apiService.login(email, password);
      setUser(result.user);
      
      // Sauvegarder les informations utilisateur dans localStorage pour la persistance
      localStorage.setItem('stockspider_user', JSON.stringify(result.user));
      
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
    // Nettoyer complètement l'état de connexion
    apiService.logout();
    setUser(null);
    setLoading(false);
    
    // Nettoyer aussi les informations utilisateur du localStorage
    localStorage.removeItem('stockspider_user');
    
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