// Configuration centrale du frontend
// Modifiez uniquement ce fichier pour changer l'URL de l'API

export const CLIENT_CONFIG = {
  // URL de base de l'API
  // Priorité à la variable d'environnement VITE_API_BASE_URL si définie
  apiBaseUrl:
    (import.meta as any).env?.VITE_API_BASE_URL ||
    'http://185.183.35.80:3002/api',
};


