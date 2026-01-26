import React, { useState, useEffect, useRef } from 'react';
import { X, Package, Upload, Image, Trash2 } from 'lucide-react';
import { Component, ComponentCategory } from '../../types';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/api';
import ComponentImportModal from './ComponentImportModal';

interface ComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  component?: Component;
}

const ComponentModal = ({ isOpen, onClose, component }: ComponentModalProps) => {
  const { addComponent, updateComponent, suppliers } = useData();
  const { showSuccess, showError } = useToast();
  const isEdit = !!component;
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    designation: component?.designation || '',
    name: component?.name || '',
    productNumber: component?.productNumber || '',
    footprint: component?.footprint || '',
    quantity: component?.quantity || 0,
    unitPrice: component?.unitPrice || 0,
    supplier: component?.supplier || '',
    category: component?.category || 'autre' as ComponentCategory,
    minStock: component?.minStock || 0,
  });

  // Mettre à jour le formulaire quand le composant change
  useEffect(() => {
    console.log('🔧 ComponentModal - Component reçu:', component);

    if (component) {
      console.log('🔧 ComponentModal - Pré-remplissage du formulaire avec:', {
        designation: component.designation,
        name: component.name,
        productNumber: component.productNumber,
        quantity: component.quantity,
        unitPrice: component.unitPrice
      });

      setFormData({
        designation: component.designation || '',
        name: component.name || '',
        productNumber: component.productNumber || '',
        footprint: component.footprint || '',
        quantity: component.quantity || 0,
        unitPrice: component.unitPrice || 0,
        supplier: component.supplier || '',
        category: component.category || 'autre' as ComponentCategory,
        minStock: component.minStock || 0,
      });

      // Charger l'image existante si elle existe
      setImagePreview(component.imageUrl || null);
      setSelectedImage(null);
    } else {
      console.log('🔧 ComponentModal - Réinitialisation du formulaire pour nouveau composant');
      // Réinitialiser le formulaire pour un nouveau composant
      setFormData({
        designation: '',
        name: '',
        productNumber: '',
        footprint: '',
        quantity: 0,
        unitPrice: 0,
        supplier: '',
        category: 'autre' as ComponentCategory,
        minStock: 0,
      });

      // Réinitialiser l'image
      setImagePreview(null);
      setSelectedImage(null);
    }
  }, [component]);

  const categories: ComponentCategory[] = [
    'condensateur', 'resistance', 'relais', 'microcontroleur',
    'connecteur', 'inducteur', 'diode', 'transistor', 'capteur', 'autre'
  ];

  const getCategoryLabel = (category: ComponentCategory) => {
    const labels = {
      'condensateur': 'Condensateur',
      'resistance': 'Résistance',
      'relais': 'Relais',
      'microcontroleur': 'Microcontrôleur',
      'connecteur': 'Connecteur',
      'inducteur': 'Inducteur',
      'diode': 'Diode',
      'transistor': 'Transistor',
      'capteur': 'Capteur',
      'autre': 'Autre'
    };
    return labels[category];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let imageUrl = component?.imageUrl; // Garder l'image existante par défaut

      if (isEdit && component) {
        // Pour un composant existant, uploader l'image si nécessaire
        if (selectedImage) {
          imageUrl = await uploadImage(selectedImage);
        }

        const componentData = {
          ...formData,
          imageUrl
        };

        updateComponent(component.id, componentData);
        showSuccess('Composant mis à jour', `${formData.designation} a été mis à jour avec succès`);
      } else {
        // Pour un nouveau composant, créer d'abord le composant
        const componentData = {
          ...formData,
          imageUrl: undefined // Pas d'image pour l'instant
        };

        const newComponent = await addComponent(componentData);

        // Puis uploader l'image si nécessaire
        if (selectedImage && newComponent) {
          try {
            const { imageUrl: uploadedImageUrl } = await apiService.uploadComponentImage(newComponent.id, selectedImage);
            // Mettre à jour le composant avec l'URL de l'image
            updateComponent(newComponent.id, { ...componentData, imageUrl: uploadedImageUrl });
          } catch (uploadError) {
            console.error('Erreur upload image:', uploadError);
            showError('Attention', 'Composant créé mais image non uploadée');
          }
        }

        showSuccess('Composant ajouté', `${formData.designation} a été ajouté avec succès`);
      }

      // Reset form
      setFormData({
        designation: '',
        name: '',
        productNumber: '',
        footprint: '',
        quantity: 0,
        unitPrice: 0,
        supplier: '',
        category: 'autre' as ComponentCategory,
        minStock: 0,
      });

      // Reset image
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showError('Erreur', 'Impossible de sauvegarder le composant');
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('🖼️ Fichier sélectionné:', file.name, file.type, file.size);

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        showError('Erreur', 'Veuillez sélectionner un fichier image (PNG, JPG, etc.)');
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('Erreur', 'L\'image ne doit pas dépasser 5MB');
        return;
      }

      setSelectedImage(file);

      // Créer une prévisualisation
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        console.log('🖼️ Prévisualisation créée:', result ? 'Oui' : 'Non');
        if (result) {
          setImagePreview(result);
        } else {
          console.error('❌ Résultat de FileReader vide');
          showError('Erreur', 'Impossible de créer la prévisualisation');
        }
      };
      reader.onerror = (error) => {
        console.error('❌ Erreur lors de la lecture du fichier:', error);
        showError('Erreur', 'Impossible de lire le fichier image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    // Pour un nouveau composant, on utilise une URL locale temporaire
    if (!isEdit || !component) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    }

    // Pour un composant existant, on fait un vrai upload
    try {
      const { imageUrl } = await apiService.uploadComponentImage(component.id, file);
      return imageUrl;
    } catch (error) {
      console.error('Erreur upload image:', error);
      throw error;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-3s-blue/10 rounded-lg shadow-3s">
              <Package className="w-5 h-5 text-3s-blue" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-3s-black font-inter">
                {isEdit ? 'Modifier le composant' : 'Ajouter un composant'}
              </h2>
              <p className="text-sm text-3s-gray-medium font-inter">
                {isEdit ? 'Modifiez les informations du composant' : 'Saisissez les informations du nouveau composant'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Import Button - Only show for new components */}
          {!isEdit && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-900">Importation en masse</h3>
                  <p className="text-sm text-blue-700">
                    Importez plusieurs composants depuis un fichier BOM (Excel, CSV, TXT)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Importer BOM
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                Désignation *
              </label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => handleChange('designation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
                placeholder="Ex: Résistance 10kΩ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                Nom *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
                placeholder="Ex: R10K"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                N° produit *
              </label>
              <input
                type="text"
                required
                value={formData.productNumber}
                onChange={(e) => handleChange('productNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
                placeholder="Ex: R10K-0603"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                Footprint *
              </label>
              <input
                type="text"
                required
                value={formData.footprint}
                onChange={(e) => handleChange('footprint', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
                placeholder="Ex: 0603"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                Quantité en stock *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                Stock minimum *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.minStock}
                onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                Prix unitaire (€) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.0001"
                value={formData.unitPrice}
                onChange={(e) => handleChange('unitPrice', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
                Catégorie *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
              Fournisseur
            </label>
            <select
              value={formData.supplier}
              onChange={(e) => handleChange('supplier', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue font-inter transition-all duration-200 hover:shadow-card-hover"
            >
              <option value="">Choisir un fournisseur</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Upload d'image */}
          <div>
            <label className="block text-sm font-medium text-3s-black mb-2 font-inter">
              Image du composant
            </label>
            <div className="space-y-4">
              {/* Prévisualisation de l'image */}
              {imagePreview && (
                <div className="relative inline-block">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Prévisualisation"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-300 shadow-sm"
                      onLoad={() => console.log('🖼️ Image chargée avec succès:', imagePreview)}
                      onError={(e) => {
                        console.error('❌ Erreur de chargement de l\'image:', imagePreview);
                        console.error('❌ Erreur détail:', e);
                        // Afficher un message d'erreur à l'utilisateur
                        showError('Erreur', 'Impossible de charger l\'image');
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                      title="Supprimer l'image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Image sélectionnée
                  </p>
                </div>
              )}

              {/* Zone de téléchargement */}
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${imagePreview
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-3s-blue hover:bg-blue-50'
                }`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 text-gray-600 hover:text-3s-blue transition-colors w-full"
                >
                  <Image className={`w-8 h-8 ${imagePreview ? 'text-green-600' : ''}`} />
                  <span className="text-sm font-medium">
                    {imagePreview ? 'Changer l\'image' : 'Ajouter une image'}
                  </span>
                  <span className="text-xs text-gray-500">
                    PNG, JPG jusqu'à 5MB
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-3s-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-3s-primary"
            >
              {isEdit ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>

        {/* Import Modal */}
        <ComponentImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
        />
      </div>
    </div>
  );
};

export default ComponentModal;