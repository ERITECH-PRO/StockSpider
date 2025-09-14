import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, ArrowUp, ArrowDown, RotateCcw, User, Clock } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import { formatPriceCurrency } from '../../utils/priceFormatter';

interface StockMovement {
  id: string;
  componentId?: string;
  componentDesignation?: string;
  componentName?: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unitPrice?: number;
  reason: string;
  userId: string;
  userName?: string;
  createdAt: string;
}

const StockMovements = () => {
  const { components, updateStock } = useData();
  const { showSuccess, showError } = useToast();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [movementQuantity, setMovementQuantity] = useState<number>(0);
  const [movementReason, setMovementReason] = useState<string>('');
  const [movementPrice, setMovementPrice] = useState<number>(0);

  // Charger les mouvements depuis localStorage (simulation)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stockMovements');
      if (saved) {
        setMovements(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Erreur chargement mouvements:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMovement = async () => {
    if (!selectedComponent) {
      showError('Erreur', 'Veuillez sélectionner un composant');
      return;
    }

    if (movementQuantity <= 0) {
      showError('Erreur', 'La quantité doit être supérieure à 0');
      return;
    }

    if (!movementReason.trim()) {
      showError('Erreur', 'Veuillez indiquer la raison du mouvement');
      return;
    }

    try {
      await updateStock(selectedComponent, movementQuantity, movementType, movementReason);
      
      // Ajouter le mouvement à la liste
      const component = components.find(c => c.id === selectedComponent);
      if (component) {
        const newMovement: StockMovement = {
          id: `movement_${Date.now()}`,
          componentId: selectedComponent,
          componentDesignation: component.designation,
          componentName: component.name,
          type: movementType,
          quantity: movementQuantity,
          unitPrice: movementPrice || component.unitPrice,
          reason: movementReason,
          userId: 'current_user', // TODO: Récupérer l'utilisateur connecté
          userName: 'Utilisateur actuel',
          createdAt: new Date().toISOString()
        };

        const updatedMovements = [newMovement, ...movements];
        setMovements(updatedMovements);
        
        // Sauvegarder dans localStorage
        localStorage.setItem('stockMovements', JSON.stringify(updatedMovements));
        
        showSuccess('Mouvement enregistré', `Mouvement de ${movementQuantity} unité${movementQuantity > 1 ? 's' : ''} enregistré`);
        
        // Réinitialiser le formulaire
        setSelectedComponent('');
        setMovementQuantity(0);
        setMovementReason('');
        setMovementPrice(0);
      }
    } catch (error) {
      console.error('Erreur mouvement:', error);
      showError('Erreur', 'Impossible d\'enregistrer le mouvement');
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <ArrowUp className="w-4 h-4 text-green-600" />;
      case 'out':
        return <ArrowDown className="w-4 h-4 text-red-600" />;
      case 'adjustment':
        return <RotateCcw className="w-4 h-4 text-blue-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'in':
        return 'text-green-600 bg-green-100';
      case 'out':
        return 'text-red-600 bg-red-100';
      case 'adjustment':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'in':
        return 'Entrée';
      case 'out':
        return 'Sortie';
      case 'adjustment':
        return 'Ajustement';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  // Utilisation de la fonction de formatage centralisée avec 4 décimales

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mouvements de stock</h1>
          <p className="text-gray-600">Gérez les entrées, sorties et ajustements de stock</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <TrendingUp className="w-4 h-4" />
          <span>{movements.length} mouvement{movements.length > 1 ? 's' : ''} enregistré{movements.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Movement Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nouveau mouvement</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Composant
            </label>
            <select
              value={selectedComponent}
              onChange={(e) => setSelectedComponent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner un composant</option>
              {components.map(component => (
                <option key={component.id} value={component.id}>
                  {component.designation} (Stock: {component.quantity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de mouvement
            </label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as 'in' | 'out' | 'adjustment')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="in">Entrée</option>
              <option value="out">Sortie</option>
              <option value="adjustment">Ajustement</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantité
            </label>
            <input
              type="number"
              min="1"
              value={movementQuantity}
              onChange={(e) => setMovementQuantity(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prix unitaire (€)
            </label>
            <input
              type="number"
              min="0"
              step="0.0001"
              value={movementPrice}
              onChange={(e) => setMovementPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Raison du mouvement
          </label>
          <input
            type="text"
            value={movementReason}
            onChange={(e) => setMovementReason(e.target.value)}
            placeholder="Ex: Réception commande, Ajustement inventaire, Assemblage produit..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="mt-4">
          <button
            onClick={handleMovement}
            disabled={!selectedComponent || movementQuantity <= 0 || !movementReason.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Enregistrer le mouvement
          </button>
        </div>
      </div>

      {/* Movements History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Historique des mouvements</h2>
        </div>

        {movements.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>Aucun mouvement enregistré</p>
            <p className="text-sm">Les mouvements de stock apparaîtront ici</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Composant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Raison
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {movement.componentDesignation}
                          </div>
                          <div className="text-sm text-gray-500">
                            {movement.componentName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMovementColor(movement.type)}`}>
                        {getMovementIcon(movement.type)}
                        <span className="ml-1">{getMovementLabel(movement.type)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movement.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {movement.unitPrice ? formatPriceCurrency(movement.unitPrice) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {movement.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        {movement.userName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        {formatDate(movement.createdAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockMovements;
