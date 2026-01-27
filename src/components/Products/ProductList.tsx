
import { Edit2, Box, Wrench, Trash2, Download, Upload, AlertTriangle, Database, Plus, Minus } from 'lucide-react';
import { Product } from '../../types';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import ProductModal from './ProductModal';
import ConfirmDialog from '../UI/ConfirmDialog';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { formatPrice } from '../../utils/priceFormatter';

interface ProductListProps {
  searchQuery: string;
}

const ProductList = ({ searchQuery }: ProductListProps) => {
  const { products, components, deleteProduct, addProductToAssembly, addProduct, updateProduct } = useData();
  const { showSuccess, showError, showInfo } = useToast();

  const [productModal, setProductModal] = useState<{ show: boolean; product: Product | null }>({
    show: false,
    product: null
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; productId: string; productName: string }>({
    show: false,
    productId: '',
    productName: ''
  });
  const [assemblyQuantities, setAssemblyQuantities] = useState<{ [productId: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fonction pour générer un ID court pour les produits
  const generateShortProductId = (existingProducts: Product[]): string => {
    // Trouver le plus grand numéro existant
    let maxNumber = 0;
    existingProducts.forEach(prod => {
      if (prod.id.startsWith('PR')) {
        const number = parseInt(prod.id.substring(2));
        if (!isNaN(number) && number > maxNumber) {
          maxNumber = number;
        }
      }
    });

    // Retourner le prochain ID disponible
    return `PR${maxNumber + 1}`;
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getComponentName = (componentId: string) => {
    const component = components.find(c => c.id === componentId);
    return component ? component.designation : 'Composant introuvable';
  };

  // Prix d'achat unitaire (somme des composants uniquement)
  const calculateUnitPurchasePrice = (product: Product) => {
    return product.components.reduce((total, pc) => {
      const component = components.find(c => c.id === pc.componentId);
      const unitPrice = component ? Number(component.unitPrice) || 0 : 0;
      const qty = Number(pc.quantity) || 0;
      return total + unitPrice * qty;
    }, 0);
  };

  // Prix d'achat total (unitaire × quantité à assembler)
  const calculateTotalPurchasePrice = (product: Product) => {
    const unitPrice = calculateUnitPurchasePrice(product);
    const quantity = assemblyQuantities[product.id] || 1;
    return unitPrice * quantity;
  };

  const canAssemble = (product: Product) => {
    const quantity = assemblyQuantities[product.id] || 1;
    return product.components.every(pc => {
      const component = components.find(c => c.id === pc.componentId);
      const requiredQuantity = (Number(pc.quantity) || 0) * quantity;
      return component && component.quantity >= requiredQuantity;
    });
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setAssemblyQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, quantity)
    }));
  };

  const handleAssemble = async (product: Product) => {
    const quantity = assemblyQuantities[product.id] || 1;

    try {
      // Utiliser la nouvelle logique : ajouter à l'assemblage même si des composants manquent
      await addProductToAssembly(product.id, quantity);

      // Vérifier si tous les composants sont disponibles pour un assemblage immédiat
      const canAssembleNow = canAssemble(product);

      if (canAssembleNow) {
        showInfo(
          'Produit ajouté à l\'assemblage',
          `${product.name} peut être assemblé immédiatement. Consultez la page "Produits en cours d'assemblage".`
        );
      } else {
        showInfo(
          'Produit ajouté à l\'assemblage',
          `${product.name} ajouté avec des composants manquants. Consultez la page "Composants à acheter".`
        );
      }
    } catch (error) {
      console.error('Erreur ajout à l\'assemblage:', error);
      showError('Erreur', 'Impossible d\'ajouter le produit à l\'assemblage');
    }
  };


  const handleEditProduct = (product: Product) => {
    setProductModal({ show: true, product });
  };

  const handleCloseProductModal = () => {
    setProductModal({ show: false, product: null });
  };

  const handleDeleteClick = (product: Product) => {
    setDeleteConfirm({
      show: true,
      productId: product.id,
      productName: product.name
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteProduct(deleteConfirm.productId);
      showSuccess('Produit supprimé', `${deleteConfirm.productName} a été supprimé avec succès`);
      setDeleteConfirm({ show: false, productId: '', productName: '' });
    } catch (error) {
      console.error('Erreur suppression produit:', error);
      showError('Erreur', 'Impossible de supprimer le produit');
    }
  };

  // Fonction d'export Excel
  const exportToExcel = () => {
    // Trouver le nombre maximum de composants pour dimensionner les colonnes
    const maxComponents = Math.max(...filteredProducts.map(p => p.components.length), 1);

    const exportData = filteredProducts.map(product => {
      const unitPurchasePrice = calculateUnitPurchasePrice(product);
      const totalPurchasePrice = calculateTotalPurchasePrice(product);

      // Créer l'objet de base
      const baseData: any = {
        'Nom du produit': product.name,
        'Description': product.description,
        'Prix de vente (€)': Number(product.sellingPrice || 0),
        'Coût d\'achat unitaire (€)': unitPurchasePrice,
        'Coût d\'achat total (€)': totalPurchasePrice,
        'Marge (€)': Number(product.sellingPrice || 0) - unitPurchasePrice,
        'Marge (%)': unitPurchasePrice > 0 ? (((Number(product.sellingPrice || 0) - unitPurchasePrice) / unitPurchasePrice) * 100).toFixed(4) : 0,
        'Nombre de composants': product.components.length,
        'Date de création': new Date(product.createdAt).toLocaleDateString('fr-FR')
      };

      // Ajouter les colonnes de composants
      for (let i = 0; i < maxComponents; i++) {
        const component = product.components[i];
        if (component) {
          const comp = components.find(c => c.id === component.componentId);
          baseData[`Composant ${i + 1} - Nom`] = comp ? comp.designation : 'Composant inconnu';
          baseData[`Composant ${i + 1} - Quantité`] = component.quantity;
          baseData[`Composant ${i + 1} - ID`] = component.componentId;
        } else {
          baseData[`Composant ${i + 1} - Nom`] = '';
          baseData[`Composant ${i + 1} - Quantité`] = '';
          baseData[`Composant ${i + 1} - ID`] = '';
        }
      }

      return baseData;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produits finis');

    // Ajuster la largeur des colonnes
    const colWidths = [
      { wch: 25 }, // Nom du produit
      { wch: 30 }, // Description
      { wch: 15 }, // Prix de vente
      { wch: 20 }, // Coût d'achat unitaire
      { wch: 18 }, // Coût d'achat total
      { wch: 12 }, // Marge
      { wch: 12 }, // Marge %
      { wch: 15 }, // Nombre de composants
      { wch: 12 }  // Date de création
    ];

    // Ajouter les largeurs pour les colonnes de composants
    for (let i = 0; i < maxComponents; i++) {
      colWidths.push({ wch: 20 }); // Composant X - Nom
      colWidths.push({ wch: 12 }); // Composant X - Quantité
      colWidths.push({ wch: 15 }); // Composant X - ID
    }

    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `produits-finis-${new Date().toISOString().split('T')[0]}.xlsx`);
    showSuccess('Export réussi', 'Fichier Excel généré avec succès');
  };

  // Fonction d'import Excel
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let addedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;

        jsonData.forEach((row: any, index: number) => {
          try {
            const productData = {
              name: row['Nom du produit'] || row['nom_produit'] || row['name'] || '',
              description: row['Description'] || row['description'] || '',
              sellingPrice: Number(row['Prix de vente (€)'] || row['prix_vente'] || row['sellingPrice'] || 0),
              components: [] as any[]
            };

            if (!productData.name) {
              errorCount++;
              return;
            }

            // Parser les composants depuis les colonnes
            const productComponents: any[] = [];
            let componentIndex = 1;

            while (true) {
              const componentName = row[`Composant ${componentIndex} - Nom`];
              const componentQuantity = row[`Composant ${componentIndex} - Quantité`];
              const componentId = row[`Composant ${componentIndex} - ID`];

              if (!componentName && !componentId) {
                break; // Plus de composants
              }

              if (componentName && componentQuantity) {
                // Chercher le composant par ID ou par nom
                let foundComponent = null;
                if (componentId) {
                  foundComponent = components.find(c => c.id === componentId);
                }
                if (!foundComponent && componentName) {
                  foundComponent = components.find(c =>
                    c.designation.toLowerCase() === componentName.toLowerCase() ||
                    c.name.toLowerCase() === componentName.toLowerCase()
                  );
                }

                if (foundComponent) {
                  productComponents.push({
                    componentId: foundComponent.id,
                    quantity: Number(componentQuantity)
                  });
                } else {
                  console.warn(`Composant non trouvé: ${componentName} (ligne ${index + 2})`);
                }
              }

              componentIndex++;
            }

            productData.components = productComponents;

            // Vérifier si le produit existe déjà
            const existingProduct = products.find(p => p.name === productData.name);

            if (existingProduct) {
              // Mettre à jour le produit existant
              const updatedProduct = {
                ...existingProduct,
                ...productData,
                id: existingProduct.id // Garder l'ID existant
              };
              updateProduct(updatedProduct.id, updatedProduct);
              updatedCount++;
            } else {
              // Créer un nouveau produit avec ID court
              const newId = generateShortProductId(products);
              const newProduct: Product = {
                id: newId,
                ...productData,
                productNumber: '',
                productionCost: 0,
                quantity: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              addProduct(newProduct);
              addedCount++;
            }
          } catch (error) {
            console.error(`Erreur ligne ${index + 2}:`, error);
            errorCount++;
          }
        });

        // Afficher le résumé
        const totalComponents = jsonData.reduce((total: number, row: any) => {
          let componentCount = 0;
          let componentIndex = 1;
          while (row[`Composant ${componentIndex} - Nom`]) {
            componentCount++;
            componentIndex++;
          }
          return total + componentCount;
        }, 0);

        if (errorCount > 0) {
          showError('Import terminé avec erreurs', `${addedCount} produits ajoutés, ${updatedCount} mis à jour, ${errorCount} erreurs. ${totalComponents} composants traités.`);
        } else {
          showSuccess('Import réussi', `${addedCount} produits ajoutés, ${updatedCount} mis à jour. ${totalComponents} composants traités.`);
        }

        // Réinitialiser l'input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Erreur lors de l\'import:', error);
        showError('Erreur d\'import', 'Impossible de lire le fichier Excel');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-8 p-6 bg-3s-gray-light min-h-full font-inter">
      {/* Premium Header & Utility Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-3s-blue/10 rounded-2xl shadow-inner border border-3s-blue/5">
              <Box className="w-6 h-6 text-3s-blue" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-3s-black uppercase tracking-tight leading-none">Gestion de l'Assemblage</h1>
              <p className="text-[10px] text-3s-gray-medium font-bold uppercase tracking-widest mt-2 opacity-70">Configuration & Planification de Production 3S IT</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100/50">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] font-black text-3s-gray-medium uppercase tracking-widest">État du Catalogue:</span>
                <span className="text-sm font-black text-3s-blue">{filteredProducts.length} Modèles Enregistrés</span>
              </div>
            </div>

            <div className="h-8 w-px bg-gray-100 mx-2 hidden md:block"></div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportToExcel}
                className="p-2.5 bg-3s-blue/5 text-3s-blue rounded-xl hover:bg-3s-blue hover:text-white transition-all border border-3s-blue/10 active:scale-95 flex items-center gap-2"
                title="Exporter Master Catalogue"
              >
                <Download className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest px-1">Exporter</span>
              </button>

              <label className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all border border-green-100 cursor-pointer active:scale-95 flex items-center gap-2" title="Importer Configuration">
                <Upload className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest px-1">Importer</span>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileImport} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Assembly Workbench Grid */}
      <div className="grid grid-cols-1 gap-10 pb-20">
        {filteredProducts.map((product) => {
          const unitPurchasePrice = calculateUnitPurchasePrice(product);
          const totalPurchasePrice = calculateTotalPurchasePrice(product);
          const assemblyQuantity = assemblyQuantities[product.id] || 1;
          const isStockIssue = !canAssemble(product);

          return (
            <div key={product.id} className="group relative bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden">
              {/* Card Background Branding */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-3s-blue opacity-[0.02] rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-700"></div>

              <div className="relative p-8">
                <div className="flex flex-col xl:flex-row gap-10">

                  {/* Column 1: Identity & Stats */}
                  <div className="xl:w-1/3 space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-3s-blue bg-3s-blue/5 border border-3s-blue/10 px-2 py-1 rounded-lg uppercase tracking-widest">{product.id}</span>
                        <div className={`w-2 h-2 rounded-full ${isStockIssue ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
                      </div>
                      <h3 className="text-2xl font-black text-3s-black uppercase tracking-tighter leading-tight group-hover:text-3s-blue transition-colors">{product.name}</h3>
                      <p className="text-sm font-bold text-3s-gray-medium leading-relaxed opacity-80">{product.description}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {/* Workbench Control: Quantity */}
                      <div className="bg-gray-50/80 p-5 rounded-[1.8rem] border border-gray-100 group-hover:bg-white transition-all shadow-inner">
                        <span className="block text-[10px] font-black text-3s-gray-medium uppercase tracking-widest mb-3">Unités à Assembler</span>
                        <div className="flex items-center justify-between gap-4">
                          <button
                            onClick={() => handleQuantityChange(product.id, assemblyQuantity - 1)}
                            className="p-2.5 bg-white text-3s-black rounded-xl border border-gray-200 hover:border-3s-blue hover:text-3s-blue shadow-sm transition-all active:scale-95"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={assemblyQuantity}
                            onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                            className="w-full text-3xl font-black text-center text-3s-black bg-transparent outline-none font-mono"
                          />
                          <button
                            onClick={() => handleQuantityChange(product.id, assemblyQuantity + 1)}
                            className="p-2.5 bg-white text-3s-black rounded-xl border border-gray-200 hover:border-3s-blue hover:text-3s-blue shadow-sm transition-all active:scale-95"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Financial Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-3s-blue/5 rounded-2xl border border-3s-blue/10">
                          <span className="block text-[8px] font-black text-3s-blue uppercase tracking-widest mb-1.5 opacity-60">P.A. Unitaire</span>
                          <span className="text-lg font-black text-3s-black font-mono">{formatPrice(unitPurchasePrice)}</span>
                        </div>
                        <div className="p-4 bg-3s-black rounded-2xl shadow-lg shadow-black/10">
                          <span className="block text-[8px] font-black text-white/40 uppercase tracking-widest mb-1.5">Engagement Total</span>
                          <span className="text-lg font-black text-white font-mono">{formatPrice(totalPurchasePrice)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                      <button
                        onClick={() => handleAssemble(product)}
                        className={`w-full py-4 text-sm font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${isStockIssue
                          ? 'bg-orange-500 text-white shadow-orange-200 hover:bg-orange-600'
                          : 'bg-3s-blue text-white shadow-3s-blue/30 hover:bg-3s-blue-dark'
                          }`}
                      >
                        <Wrench className="w-4 h-4" />
                        Lancer la Production
                      </button>
                      <div className="flex items-center gap-2 px-1">
                        <button onClick={() => handleEditProduct(product)} className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-3s-gray-medium hover:text-3s-blue transition-colors flex items-center justify-center gap-2"><Edit2 className="w-3.5 h-3.5" /> Modifier</button>
                        <div className="w-px h-4 bg-gray-100"></div>
                        <button onClick={() => handleDeleteClick(product)} className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-3s-gray-medium hover:text-3s-red transition-colors flex items-center justify-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Supprimer</button>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Requisitions / Component List */}
                  <div className="xl:w-2/3">
                    <div className="bg-gray-50/50 rounded-[2rem] p-8 border border-gray-100 h-full">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                            <Database className="w-4 h-4 text-3s-gray-medium" />
                          </div>
                          <h4 className="text-sm font-black text-3s-black uppercase tracking-[0.1em]">Revue des Composants requis</h4>
                        </div>
                        <span className="text-[10px] font-black text-3s-gray-medium uppercase opacity-50 tracking-widest">{product.components.length} RÉFÉRENCES</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {product.components.map((pc, index) => {
                          const component = components.find(c => c.id === pc.componentId);
                          const requiredTotal = (Number(pc.quantity) || 0) * assemblyQuantity;
                          const available = component ? component.quantity : 0;
                          const isMissing = available < requiredTotal;

                          return (
                            <div key={pc.componentId || index} className={`relative p-5 rounded-2xl border transition-all duration-300 group/item ${isMissing
                              ? 'bg-red-50/40 border-red-100/50'
                              : 'bg-white border-gray-100 hover:border-3s-blue/30'
                              }`}>
                              <div className="flex justify-between items-start">
                                <div className="min-w-0 flex-1">
                                  <h5 className="text-xs font-black text-3s-black uppercase tracking-tight truncate group-hover/item:text-3s-blue transition-colors">{getComponentName(pc.componentId)}</h5>
                                  <div className="mt-2 flex items-baseline gap-2">
                                    <span className="text-[10px] font-black text-3s-gray-medium uppercase opacity-60">Besoin:</span>
                                    <span className="text-sm font-black text-3s-black font-mono">{pc.quantity} <span className="text-[10px] opacity-40">×{assemblyQuantity}</span> = {requiredTotal}</span>
                                  </div>
                                </div>
                                <div className="text-right pl-4">
                                  <div className={`px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${isMissing
                                    ? 'bg-red-500 text-white border-red-400/50 animate-pulse'
                                    : 'bg-green-50 text-green-600 border-green-100'
                                    }`}>
                                    {isMissing ? 'Manquant' : 'Disponible'}
                                  </div>
                                  <p className={`mt-2 text-[10px] font-bold ${isMissing ? 'text-red-500' : 'text-3s-gray-medium'}`}>
                                    {component ? `${available} en stock` : 'Indisponible'}
                                  </p>
                                </div>
                              </div>
                              {isMissing && (
                                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-red-400 opacity-20 transform scale-x-0 group-hover/item:scale-x-100 transition-transform"></div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {isStockIssue && (
                        <div className="mt-8 p-6 bg-orange-50 border border-orange-100 rounded-[1.8rem] flex items-start gap-4 shadow-sm border-dashed">
                          <div className="p-2 bg-white rounded-xl shadow-sm border border-orange-200 shrink-0">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1">Attention: Flux Stock Discontinu</h5>
                            <p className="text-[11px] font-bold text-orange-600/80 leading-relaxed italic uppercase tracking-tighter">
                              L'assemblage de {assemblyQuantity} unité{assemblyQuantity > 1 ? 's' : ''} présente des ruptures. Le système générera automatiquement des commandes d'approvisionnement dans le module "Composants à acheter".
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 bg-white/50 rounded-[4rem] border-2 border-dashed border-gray-100">
          <div className="p-8 bg-white rounded-full shadow-lg mb-8 border border-gray-50">
            <Box className="w-20 h-20 text-gray-200" />
          </div>
          <h3 className="text-2xl font-black text-3s-black uppercase tracking-tight">Poste de Travail Inoccupé</h3>
          <p className="text-sm font-bold text-3s-gray-medium max-w-sm text-center mt-3 leading-relaxed opacity-60">Aucun modèle de produit ne correspond à votre recherche actuelle. Veuillez vérifier le catalogue global ou créer un nouveau modèle.</p>
        </div>
      )}

      {/* Product Modal */}
      <ProductModal
        isOpen={productModal.show}
        onClose={handleCloseProductModal}
        product={productModal.product || undefined}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="Supprimer le produit"
        message={`Êtes-vous sûr de vouloir supprimer "${deleteConfirm.productName}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ show: false, productId: '', productName: '' })}
      />
    </div>
  );
};

export default ProductList;