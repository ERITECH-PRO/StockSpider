// Hook de compatibilité pour maintenir l'interface existante
// Maintenant utilise le contexte global DataContext
import { useDataContext } from '../contexts/DataContext';

export const useData = () => {
  return useDataContext();
};