import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'warning',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      button: 'btn-3s-danger',
    },
    warning: {
      bg: 'bg-orange-50',
      icon: 'text-orange-600',
      button: 'bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200',
    },
    info: {
      bg: 'bg-blue-50',
      icon: 'text-3s-blue',
      button: 'btn-3s-primary',
    },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-fade-in">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 ${colors[type].bg} rounded-full`}>
              <AlertTriangle className={`w-6 h-6 ${colors[type].icon}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-3s-black font-inter">{title}</h3>
            </div>
          </div>
          
          <p className="text-3s-gray-medium mb-6 font-inter">{message}</p>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="btn-3s-secondary"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={colors[type].button}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;