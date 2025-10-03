import React from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

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

  return (
    <div className={`fixed inset-y-0 right-0 z-50 w-80 bg-white border-l border-gray-200 shadow-xl transform transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 font-inter">Notifications</h3>
        <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="h-full overflow-y-auto no-scrollbar p-3">
        {toasts.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 font-inter">
            Aucune notification
          </div>
        ) : (
          <ul className="space-y-2">
            {toasts.slice().reverse().map((t) => {
              const Icon = iconMap[t.type];
              const color =
                t.type === 'success' ? 'text-green-600' :
                t.type === 'error' ? 'text-red-600' :
                t.type === 'warning' ? 'text-orange-600' : 'text-blue-600';
              const bg =
                t.type === 'success' ? 'bg-green-50 border-green-200' :
                t.type === 'error' ? 'bg-red-50 border-red-200' :
                t.type === 'warning' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200';

              return (
                <li key={t.id} className={`border ${bg} rounded-lg p-3`}> 
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 font-inter">{t.title}</div>
                      {t.message && (
                        <div className="text-sm text-gray-600 font-inter mt-0.5 break-words whitespace-normal">{t.message}</div>
                      )}
                    </div>
                    <button onClick={() => removeToast(t.id)} className="p-1 rounded hover:bg-black/5">
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
