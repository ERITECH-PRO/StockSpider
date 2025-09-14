 
import { Edit2, Box, Wrench, Trash2, Download, Upload } from 'lucide-react';
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
    <div className="space-y-6 p-6 bg-3s-gray-light min-h-full">
      {/* Boutons d'export/import */}
      <div className="card-3s p-4 animate-fade-in">
        <div className="flex justify-end gap-2">
          <button
            onClick={exportToExcel}
            className="btn-3s-primary px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="font-inter">Exporter Excel</span>
          </button>
          
          <label className="btn-3s-secondary px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span className="font-inter">Importer Excel</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {filteredProducts.map((product) => {
        const unitPurchasePrice = calculateUnitPurchasePrice(product);
        const totalPurchasePrice = calculateTotalPurchasePrice(product);
        // Le bouton est toujours activé selon le nouveau workflow
        const assemblyQuantity = assemblyQuantities[product.id] || 1;

        return (
          <div key={product.id} className="card-3s p-6 animate-fade-in hover:shadow-card-hover transition-all duration-200">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg shadow-3s">
                  <Box className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-3s-black font-inter">{product.name}</h3>
                  <p className="text-3s-gray-medium mt-1 font-inter">{product.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEditProduct(product)}
                  className="p-2 text-gray-400 hover:text-3s-blue hover:bg-blue-50 rounded-lg transition-all duration-200"
                  title="Modifier le produit"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDeleteClick(product)}
                  className="p-2 text-gray-400 hover:text-3s-red hover:bg-red-50 rounded-lg transition-all duration-200"
                  title="Supprimer le produit"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleAssemble(product)}
                  className="btn-3s-primary px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Wrench className="w-4 h-4" />
                  <span className="font-inter">Assembler</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-medium font-inter">Quantité à assembler</p>
                <input
                  type="number"
                  min="1"
                  value={assemblyQuantity}
                  onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                  className="text-2xl font-bold text-blue-700 mt-1 font-inter bg-transparent border-none outline-none w-full"
                />
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-medium font-inter">Prix d'achat</p>
                <p className="text-2xl font-bold text-green-700 mt-1 font-inter">{formatPrice(unitPurchasePrice)}</p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-600 font-medium font-inter">Prix d'achat total</p>
                <p className="text-2xl font-bold text-orange-700 mt-1 font-inter">{formatPrice(totalPurchasePrice)}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-3s-black mb-4 font-inter">Composants requis</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.components.map((pc, index) => {
                  const component = components.find(c => c.id === pc.componentId);
                  const requiredQuantity = (Number(pc.quantity) || 0) * assemblyQuantity;
                  const hasStock = component && component.quantity >= requiredQuantity;
                  
                  return (
                    <div key={pc.componentId || index} className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-card-hover ${
                      hasStock ? 'border-green-200 bg-green-50' : 'border-3s-red bg-red-50'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-3s-black font-inter">{getComponentName(pc.componentId)}</p>
                          <p className="text-sm text-3s-gray-medium font-inter">
                            Quantité requise: {pc.quantity} × {assemblyQuantity} = {requiredQuantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium font-inter ${hasStock ? 'text-green-600' : 'text-3s-red'}`}>
                            {component ? `${component.quantity} dispo` : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 font-inter">
                            {component ? formatPrice((Number(component.unitPrice) || 0) * requiredQuantity) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!canAssemble(product) && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-600 font-medium font-inter">ℹ️ Composants manquants détectés</p>
                <p className="text-orange-600 text-sm mt-1 font-inter">
                  Certains composants ne sont pas disponibles en quantité suffisante pour assembler {assemblyQuantity} unité{assemblyQuantity > 1 ? 's' : ''}.
                  <br />
                  <strong>Le produit sera ajouté à l'assemblage et les composants manquants à la liste d'achat.</strong>
                </p>
                <div className="mt-2 text-xs text-orange-500 font-inter">
                  Composants manquants : {product.components
                    .filter(pc => {
                      const component = components.find(c => c.id === pc.componentId);
                      if (!component) return false;
                      const requiredQuantity = (Number(pc.quantity) || 0) * assemblyQuantity;
                      return component.quantity < requiredQuantity;
                    })
                    .map(pc => {
                      const component = components.find(c => c.id === pc.componentId);
                      if (!component) return null;
                      const requiredQuantity = (Number(pc.quantity) || 0) * assemblyQuantity;
                      return `${component.designation}: ${requiredQuantity} requis, ${component.quantity} disponible`;
                    })
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Box className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-3s-black mb-2 font-inter">Aucun produit trouvé</h3>
          <p className="text-3s-gray-medium font-inter">Essayez de modifier votre recherche ou d'ajouter des produits.</p>
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