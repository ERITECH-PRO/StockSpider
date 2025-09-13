import React, { useState, useCallback } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { parseBOMFile, validateBOMItems, BOMItem } from '../../utils/bomParser';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';

interface ComponentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImportResult {
  newComponents: number;
  updatedComponents: number;
  errors: string[];
  totalProcessed: number;
}

const ComponentImportModal = ({ isOpen, onClose }: ComponentImportModalProps) => {
  const { addComponent, updateComponent, components, reloadComponents } = useData();
  const { showSuccess, showError, showInfo } = useToast();
  
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<BOMItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = async (file: File) => {
    const allowedExtensions = ['xlsx', 'xls', 'csv', 'txt', 'md'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      showError('Format non supporté', 'Veuillez sélectionner un fichier .xlsx, .xls, .csv, .txt ou .md');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showError('Fichier trop volumineux', 'Le fichier ne doit pas dépasser 10MB');
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    setImportResult(null);
    setPreviewData([]);

    try {
      const result = await parseBOMFile(file);
      
      if (!result.success) {
        showError('Erreur de parsing', result.errors.join('\n'));
        setSelectedFile(null);
        setIsProcessing(false);
        return;
      }

      // Validation des données
      const validationErrors = validateBOMItems(result.items);
      if (validationErrors.length > 0) {
        showError('Erreurs de validation', validationErrors.join('\n'));
        setSelectedFile(null);
        setIsProcessing(false);
        return;
      }

      setParsedItems(result.items);
      
      // Créer un aperçu des données
      const preview = result.items.slice(0, 10).map((item, index) => ({
        index: index + 1,
        designation: item.designation,
        name: item.name,
        productNumber: item.productNumber,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        category: item.category,
        footprint: item.footprint,
        supplier: item.supplier
      }));
      
      setPreviewData(preview);
      
      if (result.errors.length > 0) {
        showInfo('Avertissements', `${result.errors.length} avertissement(s) détecté(s). Vérifiez l'aperçu ci-dessous.`);
      }
      
    } catch (error) {
      console.error('Erreur lors du parsing:', error);
      showError('Erreur', 'Impossible de lire le fichier');
      setSelectedFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (parsedItems.length === 0) {
      showError('Aucune donnée', 'Aucun composant à importer');
      return;
    }

    setIsProcessing(true);
    const result: ImportResult = {
      newComponents: 0,
      updatedComponents: 0,
      errors: [],
      totalProcessed: 0
    };

    try {
      for (const item of parsedItems) {
        try {
          // Vérifier si le composant existe déjà
          const existingComponent = components.find(c => 
            c.productNumber === item.productNumber || 
            (c.designation === item.designation && c.name === item.name)
          );

          if (existingComponent) {
            // Mettre à jour la quantité du composant existant
            const newQuantity = existingComponent.quantity + item.quantity;
            await updateComponent(existingComponent.id, {
              quantity: newQuantity,
              unitPrice: item.unitPrice > 0 ? item.unitPrice : existingComponent.unitPrice,
              supplier: item.supplier || existingComponent.supplier,
              category: item.category !== 'autre' ? item.category : existingComponent.category
            });
            result.updatedComponents++;
          } else {
            // Créer un nouveau composant
            await addComponent({
              designation: item.designation,
              name: item.name,
              productNumber: item.productNumber,
              footprint: item.footprint,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              supplier: item.supplier || '',
              category: item.category,
              minStock: Math.max(1, Math.ceil(item.quantity * 0.1)) // 10% de la quantité comme stock minimum
            });
            result.newComponents++;
          }
          
          result.totalProcessed++;
        } catch (error) {
          result.errors.push(`${item.designation}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }

      setImportResult(result);
      
      // Recharger les composants pour s'assurer qu'ils sont visibles
      await reloadComponents();

      // Afficher le résumé
      let message = '';
      if (result.newComponents > 0) {
        message += `${result.newComponents} nouveau${result.newComponents > 1 ? 'x' : ''} composant${result.newComponents > 1 ? 's' : ''} créé${result.newComponents > 1 ? 's' : ''}`;
      }
      if (result.updatedComponents > 0) {
        if (message) message += ', ';
        message += `${result.updatedComponents} composant${result.updatedComponents > 1 ? 's' : ''} mis à jour`;
      }

      if (result.errors.length > 0) {
        showError('Import terminé avec erreurs', `${message}. ${result.errors.length} erreur(s) détectée(s).`);
      } else {
        showSuccess('Import réussi', message);
      }

    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      showError('Erreur', 'Impossible d\'importer les composants');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setParsedItems([]);
    setImportResult(null);
    setPreviewData([]);
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Importer des composants depuis un fichier BOM
              </h2>
              <p className="text-sm text-gray-600">
                Importez des composants en masse depuis un fichier Excel, CSV ou texte
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* File Upload Area */}
          {!selectedFile && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Glissez-déposez votre fichier ici
              </h3>
              <p className="text-gray-600 mb-4">
                ou cliquez pour sélectionner un fichier
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt,.md"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
              >
                Sélectionner un fichier
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Formats supportés: .xlsx, .xls, .csv, .txt, .md (max 10MB)
              </p>
            </div>
          )}

          {/* File Selected */}
          {selectedFile && !importResult && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              {/* Preview Data */}
              {previewData.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Aperçu des données ({parsedItems.length} composant{parsedItems.length > 1 ? 's' : ''} détecté{parsedItems.length > 1 ? 's' : ''})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Désignation</th>
                          <th className="px-3 py-2 text-left">Nom</th>
                          <th className="px-3 py-2 text-left">Référence</th>
                          <th className="px-3 py-2 text-left">Quantité</th>
                          <th className="px-3 py-2 text-left">Prix</th>
                          <th className="px-3 py-2 text-left">Catégorie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((item) => (
                          <tr key={item.index} className="border-b">
                            <td className="px-3 py-2">{item.index}</td>
                            <td className="px-3 py-2 font-medium">{item.designation}</td>
                            <td className="px-3 py-2">{item.name}</td>
                            <td className="px-3 py-2 text-gray-600">{item.productNumber}</td>
                            <td className="px-3 py-2">{item.quantity}</td>
                            <td className="px-3 py-2">{item.unitPrice.toFixed(2)}€</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {item.category}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedItems.length > 10 && (
                      <p className="text-sm text-gray-500 mt-2">
                        ... et {parsedItems.length - 10} autre{parsedItems.length - 10 > 1 ? 's' : ''} composant{parsedItems.length - 10 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4" />
                      Importer {parsedItems.length} composant{parsedItems.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
                <button
                  onClick={resetModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Changer de fichier
                </button>
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-medium text-gray-900">Import terminé</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{importResult.newComponents}</div>
                  <div className="text-sm text-gray-600">Nouveaux composants</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{importResult.updatedComponents}</div>
                  <div className="text-sm text-gray-600">Composants mis à jour</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-600">{importResult.totalProcessed}</div>
                  <div className="text-sm text-gray-600">Total traité</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h4 className="font-medium text-red-600">Erreurs détectées</h4>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <ul className="text-sm text-red-700 space-y-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Fermer
                </button>
                <button
                  onClick={resetModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Importer un autre fichier
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComponentImportModal;
