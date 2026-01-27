import { useState, useEffect } from 'react';
import { Wrench, Package, Clock, User, DollarSign, Box, History } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import { formatPrice } from '../../utils/priceFormatter';

interface AssemblyMovement {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  assembledAt: string;
  assembledBy: string;
  totalCost: number;
  imageUrl?: string;
}

const AssemblyList = () => {
  const { products, assembleProduct, assembledProducts } = useData();
  const { showSuccess, showError } = useToast();
  const [assemblies, setAssemblies] = useState<AssemblyMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [assemblyQuantity, setAssemblyQuantity] = useState<number>(1);

  useEffect(() => {
    try {
      const mapped = (assembledProducts || []).map(ap => {
        const product = products.find(p => p.id === ap.productId);
        return {
          id: ap.id,
          productId: ap.productId,
          productName: ap.productName,
          quantity: ap.assembledQuantity,
          assembledAt: ap.assembledAt,
          assembledBy: ap.assembledBy,
          totalCost: ap.totalCost,
          imageUrl: product?.imageUrl
        };
      });
      setAssemblies(mapped.sort((a, b) => new Date(b.assembledAt).getTime() - new Date(a.assembledAt).getTime()));
    } catch (error) {
      console.error('Erreur mapping produits assemblés:', error);
    } finally {
      setLoading(false);
    }
  }, [assembledProducts, products]);

  const handleAssemble = async () => {
    if (!selectedProduct) {
      showError('Erreur', 'Veuillez sélectionner un produit');
      return;
    }

    if (assemblyQuantity <= 0) {
      showError('Erreur', 'La quantité doit être supérieure à 0');
      return;
    }

    try {
      const success = await assembleProduct(selectedProduct, assemblyQuantity);

      if (success) {
        const product = products.find(p => p.id === selectedProduct);
        if (product) {
          showSuccess('Assemblage réussi', `${assemblyQuantity} unité${assemblyQuantity > 1 ? 's' : ''} de ${product.name} assemblée${assemblyQuantity > 1 ? 's' : ''}`);
        }
        setSelectedProduct('');
        setAssemblyQuantity(1);
      }
    } catch (error) {
      console.error('Erreur assemblage:', error);
      showError('Erreur', 'Impossible d\'assembler le produit');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-3s-blue border-t-transparent shadow-sm"></div>
        <p className="text-3s-gray-medium font-inter animate-pulse">Chargement de l'historique...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-3s-gray-light min-h-full font-inter">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-3s-black font-inter">Assemblage de produits</h1>
          <p className="text-3s-gray-medium mt-1">Gérez la production de vos produits finis</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-card border border-gray-100">
          <History className="w-5 h-5 text-3s-blue" />
          <span className="text-sm font-semibold text-3s-black">
            {assemblies.length} assemblage{assemblies.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Assembly Form Card */}
      <div className="card-3s overflow-hidden relative group">
        <div className="absolute top-0 left-0 w-1 h-full bg-green-500 group-hover:w-2 transition-all"></div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-50 rounded-lg">
              <PlusCircle className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-3s-black">Nouvel assemblage</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-3s-gray-medium uppercase tracking-wider mb-2">
                Produit fini
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue shadow-sm bg-gray-50/50"
              >
                <option value="">Sélectionner un produit dans l'inventaire</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.quantity} en stock)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-3s-gray-medium uppercase tracking-wider mb-2">
                Quantité
              </label>
              <input
                type="number"
                min="1"
                value={assemblyQuantity}
                onChange={(e) => setAssemblyQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue shadow-sm bg-gray-50/50"
              />
            </div>

            <button
              onClick={handleAssemble}
              disabled={!selectedProduct || assemblyQuantity <= 0}
              className="btn-3s-primary h-[50px] flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
            >
              <Wrench className="w-5 h-5" />
              <span>Lancer l'assemblage</span>
            </button>
          </div>
        </div>
      </div>

      {/* Assembly History Grid */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-3s-gray-medium" />
          <h2 className="text-lg font-bold text-3s-black">Historique récent</h2>
        </div>

        {assemblies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <Package className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-3s-black">Aucun historique d'assemblage</h3>
            <p className="text-3s-gray-medium">Les enregistrements apparaîtront ici après vos premiers assemblages.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assemblies.map((assembly) => {
              const dt = formatDate(assembly.assembledAt);
              return (
                <div key={assembly.id} className="card-3s overflow-hidden hover:scale-[1.02] transform transition-all">
                  <div className="p-5 flex gap-4">
                    {/* Visual Thumb */}
                    <div className="w-20 h-20 bg-gray-50 rounded-xl border border-gray-100 shrink-0 flex items-center justify-center overflow-hidden">
                      {assembly.imageUrl ? (
                        <img src={assembly.imageUrl} alt={assembly.productName} className="w-full h-full object-contain" />
                      ) : (
                        <Box className="w-8 h-8 text-gray-200" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-3s-black truncate pr-2">{assembly.productName}</h3>
                        <span className="bg-blue-50 text-3s-blue text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100 uppercase">
                          Qty: {assembly.quantity}
                        </span>
                      </div>

                      <div className="space-y-2 mt-3">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-3s-gray-medium">
                            <User className="w-3.5 h-3.5" />
                            <span>{assembly.assembledBy}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-green-600 font-bold">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>{formatPrice(assembly.totalCost)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-[10px] text-3s-gray-medium uppercase tracking-tight">
                          <span className="font-semibold">{dt.date}</span>
                          <span>{dt.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Simple icon for the form card
const PlusCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default AssemblyList;
