import React from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info, Package, Database, ShieldAlert, ArrowRight, BellOff } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useDataContext } from '../../contexts/DataContext';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
} as const;

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { toasts, removeToast } = useToast();
  const { getLowStockComponents, getOutOfStockProducts, getOutOfStockComponents } = useDataContext();

  const componentsUnderMin = getLowStockComponents();
  const componentsOutOfStock = getOutOfStockComponents();
  const productsOutOfStock = getOutOfStockProducts();

  // Filter components that are critically low but NOT 0 (to avoid duplicates with the Rupture section)
  const componentsCritical = componentsUnderMin.filter(c => (Number(c.quantity) || 0) > 0);

  return (
    <div className={`fixed inset-y-0 right-0 z-[100] w-96 bg-white shadow-2xl transform transition-all duration-500 ease-in-out border-l border-gray-100 ${isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      role="dialog"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 bg-gray-50/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-3s-blue/10 rounded-lg shadow-inner">
            <ShieldAlert className="w-5 h-5 text-3s-blue" />
          </div>
          <div>
            <h3 className="text-lg font-black text-3s-black uppercase tracking-tight leading-none">Centre de Contrôle</h3>
            <p className="text-[10px] text-3s-gray-medium font-bold uppercase tracking-widest mt-1">Inventaire & Alertes 3S IT</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all text-gray-400 hover:text-3s-black">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="h-[calc(100vh-80px)] overflow-y-auto custom-scrollbar p-6 pb-20 space-y-10">

        {/* SECTION: RUPTURE TOTALE (PRODUITS) */}
        {productsOutOfStock.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-3s-red animate-ping" />
                <h4 className="text-[11px] font-black text-3s-black uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-3s-red" />
                  Rupture Produits
                </h4>
              </div>
              <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black rounded-full shadow-sm">{productsOutOfStock.length}</span>
            </div>

            <div className="grid gap-2">
              {productsOutOfStock.map((p) => (
                <div key={p.id} className="p-4 bg-red-50 border border-red-100 rounded-2xl group transition-all relative overflow-hidden ring-1 ring-red-200">
                  <div className="absolute -top-6 -right-6 w-16 h-16 bg-red-500/10 rounded-full blur-xl animate-pulse"></div>
                  <h5 className="text-sm font-black text-3s-black uppercase truncate pr-4">{p.name}</h5>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[9px] font-black py-0.5 px-2 bg-3s-red text-white uppercase rounded shadow-sm tracking-tight">Stock Épuisé</span>
                    <span className="text-[10px] font-mono font-bold text-red-600/60 uppercase">{p.productNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: RUPTURE TOTALE (COMPOSANTS) */}
        {componentsOutOfStock.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-3s-red animate-ping" />
                <h4 className="text-[11px] font-black text-3s-black uppercase tracking-widest flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-3s-red" />
                  Rupture Composants
                </h4>
              </div>
              <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black rounded-full shadow-sm">{componentsOutOfStock.length}</span>
            </div>

            <div className="grid gap-2">
              {componentsOutOfStock.map((c) => (
                <div key={c.id} className="p-4 bg-red-50 border border-red-100 rounded-2xl group transition-all relative overflow-hidden ring-1 ring-red-200">
                  <h5 className="text-sm font-black text-3s-black uppercase truncate">{c.designation}</h5>
                  <div className="mt-2 text-[10px] text-red-600 font-bold uppercase flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    Zéro stock disponible
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: SEUIL CRITIQUE */}
        {componentsCritical.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-500" />
                <h4 className="text-[11px] font-black text-3s-black uppercase tracking-widest">Alerte Seuil (Compo)</h4>
              </div>
              <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-black rounded-full border border-orange-100">{componentsCritical.length}</span>
            </div>

            <div className="space-y-2">
              {componentsCritical.map((c) => (
                <div key={c.id} className="p-4 bg-orange-50/20 border border-orange-100 rounded-2xl group hover:border-orange-200 transition-all border-dashed">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-black text-3s-black leading-tight uppercase truncate">{c.designation}</h5>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-3s-gray-medium font-black uppercase">Stock Actuel</span>
                          <span className="text-xs font-black text-orange-600">{c.quantity}</span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-gray-300" />
                        <div className="flex flex-col text-right">
                          <span className="text-[8px] text-3s-gray-medium font-black uppercase">Seuil Min</span>
                          <span className="text-xs font-black text-3s-black">{c.minStock}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION: JOURNAL */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
            <BellOff className="w-4 h-4 text-3s-gray-medium" />
            <h4 className="text-[11px] font-black text-3s-black uppercase tracking-widest">Journal des Notifications</h4>
          </div>

          {toasts.length === 0 ? (
            <div className="py-12 bg-gray-50/50 flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-100">
              <Info className="w-8 h-8 text-gray-200 mb-2" />
              <p className="text-[10px] font-black text-3s-gray-medium uppercase tracking-tight">Aucun message de session</p>
            </div>
          ) : (
            <div className="space-y-2">
              {toasts.slice().reverse().map((t) => {
                const Icon = iconMap[t.type];
                const color =
                  t.type === 'success' ? 'text-green-600' :
                    t.type === 'error' ? 'text-red-600' :
                      t.type === 'warning' ? 'text-orange-600' : 'text-blue-600';
                const bg =
                  t.type === 'success' ? 'bg-green-50/30' :
                    t.type === 'error' ? 'bg-red-50/30' :
                      t.type === 'warning' ? 'bg-orange-50/30' : 'bg-blue-50/30';

                return (
                  <div key={t.id} className={`p-4 ${bg} border border-transparent hover:border-gray-100 rounded-2xl group transition-all relative`}>
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-[11px] font-black text-3s-black uppercase leading-tight tracking-tight">{t.title}</h5>
                        {t.message && (
                          <div className="text-[10px] font-bold text-3s-gray-medium mt-1 leading-relaxed opacity-70 line-clamp-2">{t.message}</div>
                        )}
                      </div>
                      <button onClick={() => removeToast(t.id)} className="p-1 rounded-lg hover:bg-white text-gray-300 hover:text-3s-red transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {productsOutOfStock.length === 0 && componentsOutOfStock.length === 0 && componentsCritical.length === 0 && toasts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 opacity-40 grayscale select-none pointer-events-none">
            <Package className="w-20 h-20 text-3s-blue/20 mb-6" />
            <h3 className="text-lg font-black text-3s-black uppercase tracking-widest">Centre Opérationnel</h3>
            <p className="text-xs font-bold text-3s-gray-medium mt-2">Aucune anomalie détectée sur le stock</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
