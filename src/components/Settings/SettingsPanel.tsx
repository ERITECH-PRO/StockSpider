import { useEffect, useState } from 'react';
import { Save, Database, Bell, Globe, Shield, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/api';

interface AppSettings {
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    matriculeFiscal?: string;
    logoUrl?: string;
  };
  inventory: {
    lowStockThreshold: number;
    autoReorder: boolean;
    currency: string;
  };
  notifications: {
    lowStock: boolean;
    newMovements: boolean;
    emailAlerts: boolean;
  };
  system: {
    timezone: string;
    dateFormat: string;
    language: string;
  };
}

const SettingsPanel = () => {
  const { showSuccess, showError } = useToast();
  const [settings, setSettings] = useState<AppSettings>({
    company: {
      name: '3S IT',
      address: '',
      phone: '',
      email: '',
      matriculeFiscal: '',
      logoUrl: ''
    },
    inventory: {
      lowStockThreshold: 10,
      autoReorder: false,
      currency: 'EUR'
    },
    notifications: {
      lowStock: true,
      newMovements: true,
      emailAlerts: false
    },
    system: {
      timezone: 'Europe/Paris',
      dateFormat: 'DD/MM/YYYY',
      language: 'fr'
    }
  });

  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const remote = await apiService.getSettings();
        if (!isMounted) return;
        setSettings((prev) => ({
          ...prev,
          ...remote,
          company: {
            ...prev.company,
            ...(remote.company || {}),
          },
          inventory: {
            ...prev.inventory,
            ...(remote.inventory || {}),
          },
          notifications: {
            ...prev.notifications,
            ...(remote.notifications || {}),
          },
          system: {
            ...prev.system,
            ...(remote.system || {}),
          }
        }));
      } catch (e) {
        // garder defaults
      } finally {
        if (isMounted) setLoadingSettings(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await apiService.updateSettings({
        company: settings.company,
        inventory: settings.inventory,
        notifications: settings.notifications,
        system: settings.system,
      });
      setSettings((prev) => ({
        ...prev,
        ...result.settings,
        company: { ...prev.company, ...(result.settings.company || {}) },
        inventory: { ...prev.inventory, ...(result.settings.inventory || {}) },
        notifications: { ...prev.notifications, ...(result.settings.notifications || {}) },
        system: { ...prev.system, ...(result.settings.system || {}) },
      }));
      showSuccess('Paramètres sauvegardés', 'Vos paramètres ont été mis à jour avec succès');
    } catch (error) {
      showError('Erreur', 'Impossible de sauvegarder les paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoSelect = async (file: File | null) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      const res = await apiService.uploadCompanyLogo(file);
      setSettings((prev) => ({
        ...prev,
        company: {
          ...prev.company,
          logoUrl: res.logoUrl,
        },
      }));
      showSuccess('Logo mis à jour', 'Le logo a été uploadé avec succès');
    } catch (e) {
      showError('Erreur', 'Impossible d’uploader le logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleChange = (section: keyof AppSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-600">Configurez votre application StockSpider</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Sauvegarder
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Informations entreprise</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo (pour bon de sortie)
              </label>
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                  {settings.company.logoUrl ? (
                    <img src={settings.company.logoUrl} alt="Logo société" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={logoUploading || loadingSettings}
                    onChange={(e) => handleLogoSelect(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-2">PNG/JPG - 5MB max.</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'entreprise
              </label>
              <input
                type="text"
                value={settings.company.name}
                onChange={(e) => handleChange('company', 'name', e.target.value)}
                disabled={loadingSettings}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse
              </label>
              <textarea
                value={settings.company.address}
                onChange={(e) => handleChange('company', 'address', e.target.value)}
                rows={3}
                disabled={loadingSettings}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={settings.company.phone}
                  onChange={(e) => handleChange('company', 'phone', e.target.value)}
                  disabled={loadingSettings}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.company.email}
                  onChange={(e) => handleChange('company', 'email', e.target.value)}
                  disabled={loadingSettings}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Matricule Fiscal (M.F)
              </label>
              <input
                type="text"
                value={settings.company.matriculeFiscal || ''}
                onChange={(e) => handleChange('company', 'matriculeFiscal', e.target.value)}
                disabled={loadingSettings}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Matricule fiscal de votre société"
              />
            </div>
          </div>
        </div>

        {/* Inventory Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Database className="w-5 h-5 text-green-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Paramètres inventaire</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seuil de stock critique
              </label>
              <input
                type="number"
                min="1"
                value={settings.inventory.lowStockThreshold}
                onChange={(e) => handleChange('inventory', 'lowStockThreshold', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Devise
              </label>
              <select
                value={settings.inventory.currency}
                onChange={(e) => handleChange('inventory', 'currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="EUR">Euro (€)</option>
                <option value="USD">Dollar US ($)</option>
                <option value="GBP">Livre Sterling (£)</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoReorder"
                checked={settings.inventory.autoReorder}
                onChange={(e) => handleChange('inventory', 'autoReorder', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoReorder" className="ml-2 block text-sm text-gray-900">
                Réapprovisionnement automatique
              </label>
            </div>
          </div>
        </div>

        {/* Notifications Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Bell className="w-5 h-5 text-yellow-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="lowStock"
                checked={settings.notifications.lowStock}
                onChange={(e) => handleChange('notifications', 'lowStock', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="lowStock" className="ml-2 block text-sm text-gray-900">
                Alertes stock critique
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="newMovements"
                checked={settings.notifications.newMovements}
                onChange={(e) => handleChange('notifications', 'newMovements', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="newMovements" className="ml-2 block text-sm text-gray-900">
                Notifications nouveaux mouvements
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="emailAlerts"
                checked={settings.notifications.emailAlerts}
                onChange={(e) => handleChange('notifications', 'emailAlerts', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="emailAlerts" className="ml-2 block text-sm text-gray-900">
                Alertes par email
              </label>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Globe className="w-5 h-5 text-purple-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Paramètres système</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fuseau horaire
              </label>
              <select
                value={settings.system.timezone}
                onChange={(e) => handleChange('system', 'timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format de date
              </label>
              <select
                value={settings.system.dateFormat}
                onChange={(e) => handleChange('system', 'dateFormat', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Langue
              </label>
              <select
                value={settings.system.language}
                onChange={(e) => handleChange('system', 'language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
