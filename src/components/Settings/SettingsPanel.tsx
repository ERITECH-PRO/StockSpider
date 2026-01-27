import { useEffect, useState } from 'react';
import { Save, Database, Bell, Globe, Shield, Image as ImageIcon, Building2, Phone, Mail, MapPin, Hash, CheckCircle2, Info, UploadCloud, Monitor, Clock, Languages } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { apiService, getImageUrl } from '../../services/api';

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
          company: { ...prev.company, ...(remote.company || {}) },
          inventory: { ...prev.inventory, ...(remote.inventory || {}) },
          notifications: { ...prev.notifications, ...(remote.notifications || {}) },
          system: { ...prev.system, ...(remote.system || {}) }
        }));
      } catch (e) {
        // keeping defaults
      } finally {
        if (isMounted) setLoadingSettings(false);
      }
    })();
    return () => { isMounted = false; };
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
      showSuccess('Paramètres sauvegardés', 'Vos configurations ont été mises à jour avec succès');
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
        company: { ...prev.company, logoUrl: res.logoUrl },
      }));
      showSuccess('Logo mis à jour', 'Le logotype institutionnel a été uploadé');
    } catch (e) {
      showError('Erreur', 'Échec de l’upload du logo');
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

  if (loadingSettings) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-3s-blue border-t-transparent shadow-sm"></div>
        <p className="text-3s-gray-medium font-bold animate-pulse text-sm">CHARGEMENT DES CONFIGURATIONS...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-3s-gray-light min-h-full font-inter">
      {/* Header & Save Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-3s-black">Configuration Système</h1>
          <p className="text-3s-gray-medium mt-1">Personnalisez votre instance StockSpider et vos entêtes documentaires.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-3s-primary px-8 py-3 flex items-center gap-3 shadow-3s !bg-3s-blue hover:!bg-blue-700 transition-all active:scale-95"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span className="font-bold uppercase tracking-tight">Appliquer les changements</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column - Main Branding & Info */}
        <div className="xl:col-span-12">
          <div className="card-3s overflow-hidden bg-white shadow-3s border-t-4 border-t-3s-blue">
            <div className="bg-gradient-to-r from-gray-50 to-white px-8 py-6 flex flex-col md:flex-row items-center gap-8 border-b border-gray-100">
              <div className="relative group">
                <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200 overflow-hidden shadow-inner group-hover:border-3s-blue/50 transition-colors">
                  {settings.company.logoUrl ? (
                    <img src={getImageUrl(settings.company.logoUrl)} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-gray-300" />
                  )}
                  {logoUploading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-8 h-8 border-3 border-3s-blue border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 p-2 bg-3s-blue text-white rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-all hover:scale-110 active:scale-90">
                  <UploadCloud className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoSelect(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-3s-gray-medium uppercase tracking-widest mb-2">Dénomination Sociale</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={settings.company.name}
                        onChange={(e) => handleChange('company', 'name', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all font-bold text-lg"
                        placeholder="Nom de votre entreprise"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-3s-gray-medium uppercase tracking-widest mb-2">Identifiant Fiscal (M.F)</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={settings.company.matriculeFiscal || ''}
                        onChange={(e) => handleChange('company', 'matriculeFiscal', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all font-mono text-lg text-3s-blue font-black"
                        placeholder="1234567/A/B/C/000"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-3s-gray-medium uppercase tracking-widest mb-3">Siège Social / Adresse Postale</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    value={settings.company.address}
                    onChange={(e) => handleChange('company', 'address', e.target.value)}
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all resize-none font-bold"
                    placeholder="Adresse complète figurant sur vos documents..."
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-3s-gray-medium uppercase tracking-widest mb-2 text-center">Contact Téléphonique</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={settings.company.phone}
                      onChange={(e) => handleChange('company', 'phone', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all font-bold text-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-3s-gray-medium uppercase tracking-widest mb-2 text-center">Email Administratif</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={settings.company.email}
                      onChange={(e) => handleChange('company', 'email', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all font-bold text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Grid Panels */}
        <div className="xl:col-span-4 h-full">
          <div className="card-3s p-6 bg-white h-full border-t-4 border-t-green-500 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-50 rounded-lg">
                <Database className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-black text-sm uppercase tracking-tight">Paramètres Stock</h3>
            </div>

            <div className="space-y-6 flex-1">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label className="block text-[10px] font-black text-3s-gray-medium uppercase tracking-widest mb-3">Seuil d'Alerte Critique</label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={settings.inventory.lowStockThreshold}
                    onChange={(e) => handleChange('inventory', 'lowStockThreshold', parseInt(e.target.value))}
                    className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 font-black text-xl text-center"
                  />
                  <div className="p-3 bg-green-500 text-white rounded-lg shadow-sm">
                    <Monitor className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-[10px] text-green-700 font-bold mt-2 italic flex items-center gap-1">
                  <Info className="w-3 h-3" /> Notifications envoyées dès que le stock est ≤ à ce seuil.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-3s-gray-medium uppercase tracking-widest mb-1">Configuration Monétaire</label>
                <select
                  value={settings.inventory.currency}
                  onChange={(e) => handleChange('inventory', 'currency', e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold shadow-sm"
                >
                  <option value="TND">Dinar Tunisien (TND)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="USD">Dollar US ($)</option>
                </select>
              </div>

              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-green-50 transition-colors group">
                <div className="flex flex-col">
                  <span className="text-sm font-black text-3s-black uppercase tracking-tight">Auto-Réappro</span>
                  <span className="text-[10px] text-3s-gray-medium font-bold">Génération suggérée de commandes</span>
                </div>
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.inventory.autoReorder}
                    onChange={(e) => handleChange('inventory', 'autoReorder', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 h-full">
          <div className="card-3s p-6 bg-white h-full border-t-4 border-t-yellow-500 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Bell className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="font-black text-sm uppercase tracking-tight">Canaux de Notifications</h3>
            </div>

            <div className="space-y-4 flex-1">
              {[
                { id: 'lowStock', label: 'Alertes Stock Critique', desc: 'Notify on dashboard and sidebar' },
                { id: 'newMovements', label: 'Journal des Mouvements', desc: 'Real-time activity logs' },
                { id: 'emailAlerts', label: 'Alertes par Email', desc: 'Critical digests to admin email' }
              ].map((notif) => (
                <label key={notif.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-yellow-50/50 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-3s-black uppercase tracking-tight">{notif.label}</span>
                    <span className="text-[10px] text-3s-gray-medium font-bold">{notif.desc}</span>
                  </div>
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={(settings.notifications as any)[notif.id]}
                      onChange={(e) => handleChange('notifications', notif.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                  </div>
                </label>
              ))}

              <div className="mt-auto p-4 bg-yellow-50 rounded-xl flex gap-3 items-center">
                <CheckCircle2 className="w-5 h-5 text-yellow-600 shrink-0" />
                <p className="text-[10px] text-yellow-800 font-bold uppercase leading-tight">
                  Les notifications système sont actives pour tous les administrateurs
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 h-full">
          <div className="card-3s p-6 bg-white h-full border-t-4 border-t-purple-500 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Globe className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-black text-sm uppercase tracking-tight">Paramètres Locaux</h3>
            </div>

            <div className="space-y-6 flex-1">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-3s-gray-medium uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Fuseau Horaire
                </label>
                <select
                  value={settings.system.timezone}
                  onChange={(e) => handleChange('system', 'timezone', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-bold"
                >
                  <option value="Africa/Tunis">Africa/Tunis (UTC+1)</option>
                  <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                  <option value="Europe/London">Europe/London (UTC+0)</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-3s-gray-medium uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Format de Date
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['DD/MM/YYYY', 'YYYY-MM-DD'].map(f => (
                    <button
                      key={f}
                      onClick={() => handleChange('system', 'dateFormat', f)}
                      className={`py-2 px-3 rounded-lg border text-xs font-black transition-all
                                        ${settings.system.dateFormat === f ? 'bg-purple-600 border-purple-600 text-white shadow-sm' : 'bg-white border-gray-100 text-3s-gray-medium'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-3s-gray-medium uppercase tracking-widest flex items-center gap-2">
                  <Languages className="w-3 h-3" /> Langue de l'Interface
                </label>
                <select
                  value={settings.system.language}
                  onChange={(e) => handleChange('system', 'language', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-bold"
                >
                  <option value="fr">Français (Maghreb)</option>
                  <option value="en">English (Global)</option>
                  <option value="ar">العربية (International)</option>
                </select>
              </div>

              <div className="mt-auto flex items-center justify-center p-4 bg-purple-50 rounded-xl gap-2 group transition-all cursor-help opacity-70 hover:opacity-100">
                <Shield className="w-4 h-4 text-purple-600" />
                <span className="text-[10px] font-black uppercase text-purple-700 tracking-tight">Propulsé par Eritech Engine</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
