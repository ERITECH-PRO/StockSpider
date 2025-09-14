import React, { useState } from 'react';
import { Upload, CheckCircle, AlertTriangle, X, Download, Edit3, Save, RotateCcw } from 'lucide-react';
import FileUpload from '../UI/FileUpload';
import { parseBOMFile, BOMParseResult, BOMItem, validateBOMItems } from '../../utils/bomParser';
import { useToast } from '../../hooks/useToast';
import { ComponentCategory } from '../../types';
import { formatPrice } from '../../utils/priceFormatter';

interface BOMImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: BOMItem[]) => void;
}

const BOMImport: React.FC<BOMImportProps> = ({ isOpen, onClose, onImport }) => {
  const [parseResult, setParseResult] = useState<BOMParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editableItems, setEditableItems] = useState<BOMItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setIsProcessing(true);

    try {
      const result = await parseBOMFile(file);
      setParseResult(result);

      if (result.success) {
        setEditableItems([...result.items]);
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
    const itemsToImport = isEditing ? editableItems : (parseResult?.items || []);
    
    if (itemsToImport.length === 0) return;

    const validationErrors = validateBOMItems(itemsToImport);
    if (validationErrors.length > 0) {
      showError('Erreurs de validation', validationErrors.join(', '));
      return;
    }

    onImport(itemsToImport);
    showSuccess('Import réussi', `${itemsToImport.length} composants importés`);
    onClose();
    setParseResult(null);
    setEditableItems([]);
    setIsEditing(false);
  };

  const handleEditItem = (index: number, field: keyof BOMItem, value: any) => {
    const updatedItems = [...editableItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setEditableItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = editableItems.filter((_, i) => i !== index);
    setEditableItems(updatedItems);
  };

  const handleResetItems = () => {
    if (parseResult?.items) {
      setEditableItems([...parseResult.items]);
      setIsEditing(false);
    }
  };

  const calculateTotalCost = () => {
    return editableItems.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
  };

  const downloadTemplate = () => {
    const csvContent = `designation,name,product_number,footprint,quantity,unit_price,supplier,category
R1,Résistance 10kΩ,R10K-0603,0603,100,0.02,Farnell,resistance
C1,Condensateur 100nF,C100N-0603,0603,50,0.05,Mouser,condensateur
U1,Microcontrôleur STM32,STM32F103C8T6,LQFP48,10,3.50,STMicroelectronics,microcontroleur
D1,LED Rouge,LED-RED-0603,0603,25,0.15,DigiKey,diode
Q1,MOSFET N-Channel,IRF540N,TO-220,5,1.20,Infineon,transistor
J1,Connecteur USB,USB-A-2.0,USB-A,2,0.80,Molex,connecteur
L1,Inducteur 100µH,L100U-0603,0603,20,0.45,Coilcraft,inducteur
S1,Capteur Température,DS18B20,TO-92,8,2.10,Maxim,capteur
K1,Relais 5V,SRD-05VDC,Relay,3,1.50,Songle,relais
R2,Résistance 1kΩ,R1K-0805,0805,200,0.015,Vishay,resistance`;

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
            accept=".xlsx,.xls,.csv,.txt,.md"
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

              {/* Editable Preview */}
              {parseResult.success && editableItems.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-3s-black font-inter">
                      Aperçu des composants ({editableItems.length})
                    </h3>
                    <div className="flex gap-2">
                      {!isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span className="font-inter">Modifier</span>
                        </button>
                      )}
                      {isEditing && (
                        <>
                          <button
                            onClick={handleResetItems}
                            className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span className="font-inter">Annuler</span>
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                          >
                            <Save className="w-4 h-4" />
                            <span className="font-inter">Sauvegarder</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Cost Summary */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-blue-800 font-inter">Coût total estimé:</span>
                      <span className="text-lg font-bold text-blue-900 font-inter">
                        {formatPrice(calculateTotalCost())}
                      </span>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 font-inter">Désignation</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 font-inter">Nom</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 font-inter">Référence</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 font-inter">Footprint</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 font-inter">Quantité</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 font-inter">Prix unit.</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 font-inter">Catégorie</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 font-inter">Fournisseur</th>
                          {isEditing && (
                            <th className="px-3 py-2 text-left font-medium text-gray-700 font-inter">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {editableItems.map((item, index) => (
                          <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.designation}
                                  onChange={(e) => handleEditItem(index, 'designation', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              ) : (
                                <span className="font-inter">{item.designation}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleEditItem(index, 'name', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              ) : (
                                <span className="font-inter">{item.name}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.productNumber}
                                  onChange={(e) => handleEditItem(index, 'productNumber', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              ) : (
                                <span className="font-inter text-xs">{item.productNumber}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.footprint}
                                  onChange={(e) => handleEditItem(index, 'footprint', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              ) : (
                                <span className="font-inter">{item.footprint}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleEditItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              ) : (
                                <span className="font-inter">{item.quantity}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.0001"
                                  value={item.unitPrice}
                                  onChange={(e) => handleEditItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              ) : (
                                <span className="font-inter">{formatPrice(item.unitPrice)}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <select
                                  value={item.category}
                                  onChange={(e) => handleEditItem(index, 'category', e.target.value as ComponentCategory)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                >
                                  <option value="condensateur">Condensateur</option>
                                  <option value="resistance">Résistance</option>
                                  <option value="relais">Relais</option>
                                  <option value="microcontroleur">Microcontrôleur</option>
                                  <option value="connecteur">Connecteur</option>
                                  <option value="inducteur">Inducteur</option>
                                  <option value="diode">Diode</option>
                                  <option value="transistor">Transistor</option>
                                  <option value="capteur">Capteur</option>
                                  <option value="autre">Autre</option>
                                </select>
                              ) : (
                                <span className="font-inter capitalize">{item.category}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.supplier || ''}
                                  onChange={(e) => handleEditItem(index, 'supplier', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                />
                              ) : (
                                <span className="font-inter">{item.supplier || '-'}</span>
                              )}
                            </td>
                            {isEditing && (
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => handleRemoveItem(index)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Supprimer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
            {parseResult?.success && editableItems.length > 0 && (
              <button
                onClick={handleImport}
                className="btn-3s-primary"
              >
                Importer {editableItems.length} composant{editableItems.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BOMImport;