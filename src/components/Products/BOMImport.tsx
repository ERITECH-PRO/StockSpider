import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, X, Download } from 'lucide-react';
import FileUpload from '../UI/FileUpload';
import { parseBOMFile, BOMParseResult, BOMItem, validateBOMItems } from '../../utils/bomParser';
import { useToast } from '../../hooks/useToast';

interface BOMImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: BOMItem[]) => void;
}

const BOMImport: React.FC<BOMImportProps> = ({ isOpen, onClose, onImport }) => {
  const [parseResult, setParseResult] = useState<BOMParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setIsProcessing(true);

    try {
      const result = await parseBOMFile(file);
      setParseResult(result);

      if (result.success) {
        showSuccess('Fichier analysé avec succès', `${result.items.length} composants détectés`);
      } else {
        showError('Erreur lors de l\'analyse', result.errors.join(', '));
      }
    } catch (error) {
      showError('Erreur', 'Impossible de lire le fichier');
      setParseResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    if (!parseResult || !parseResult.success) return;

    const validationErrors = validateBOMItems(parseResult.items);
    if (validationErrors.length > 0) {
      showError('Erreurs de validation', validationErrors.join(', '));
      return;
    }

    onImport(parseResult.items);
    showSuccess('Import réussi', `${parseResult.items.length} composants importés`);
    onClose();
    setParseResult(null);
  };

  const downloadTemplate = () => {
    const csvContent = `designation,name,product_number,footprint,quantity,unit_price,supplier,category
Résistance 10kΩ,R10K,R10K-0603,0603,100,0.02,Farnell,resistance
Condensateur 100nF,C100N,C100N-0603,0603,50,0.05,Mouser,condensateur
Microcontrôleur STM32,STM32F103,STM32F103C8T6,LQFP48,10,3.50,STMicroelectronics,microcontroleur`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_bom.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-3s-blue/10 rounded-lg">
              <Upload className="w-5 h-5 text-3s-blue" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-3s-black font-inter">Import de nomenclature (BOM)</h2>
              <p className="text-sm text-3s-gray-medium font-inter">Importez vos composants depuis un fichier Excel ou CSV</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-3s-blue font-inter">Besoin d'un modèle ?</h3>
                <p className="text-sm text-blue-600 font-inter">Téléchargez notre template CSV pour structurer vos données</p>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-3s-blue text-white rounded-lg hover:bg-3s-blue-dark transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="font-inter">Template CSV</span>
              </button>
            </div>
          </div>

          {/* File Upload */}
          <FileUpload
            accept=".xlsx,.xls,.csv"
            onFileSelect={handleFileSelect}
            maxSize={10}
          />

          {/* Processing */}
          {isProcessing && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-3s-blue mx-auto mb-4"></div>
              <p className="text-3s-gray-medium font-inter">Analyse du fichier en cours...</p>
            </div>
          )}

          {/* Parse Results */}
          {parseResult && !isProcessing && (
            <div className="space-y-4">
              {/* Summary */}
              <div className={`p-4 rounded-lg border ${
                parseResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  {parseResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <h3 className={`font-medium font-inter ${
                    parseResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {parseResult.success ? 'Analyse réussie' : 'Erreurs détectées'}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium font-inter">Lignes traitées:</span> {parseResult.totalItems}
                  </div>
                  <div>
                    <span className="font-medium font-inter">Composants valides:</span> {parseResult.items.length}
                  </div>
                </div>
                
                {parseResult.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium text-red-800 mb-2 font-inter">Erreurs:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                      {parseResult.errors.map((error, index) => (
                        <li key={index} className="font-inter">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Preview */}
              {parseResult.success && parseResult.items.length > 0 && (
                <div>
                  <h3 className="font-medium text-3s-black mb-3 font-inter">Aperçu des composants ({parseResult.items.length})</h3>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 font-inter">Désignation</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 font-inter">Nom</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 font-inter">Quantité</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 font-inter">Prix</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 font-inter">Catégorie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.items.slice(0, 10).map((item, index) => (
                          <tr key={index} className="border-t border-gray-100">
                            <td className="px-3 py-2 font-inter">{item.designation}</td>
                            <td className="px-3 py-2 font-inter">{item.name}</td>
                            <td className="px-3 py-2 font-inter">{item.quantity}</td>
                            <td className="px-3 py-2 font-inter">{item.unitPrice.toFixed(2)}€</td>
                            <td className="px-3 py-2 font-inter capitalize">{item.category}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parseResult.items.length > 10 && (
                      <div className="p-3 text-center text-sm text-3s-gray-medium bg-gray-50 font-inter">
                        ... et {parseResult.items.length - 10} autres composants
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="btn-3s-secondary"
            >
              Annuler
            </button>
            {parseResult?.success && (
              <button
                onClick={handleImport}
                className="btn-3s-primary"
              >
                Importer {parseResult.items.length} composant{parseResult.items.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BOMImport;