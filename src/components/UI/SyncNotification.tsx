import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';

interface SyncNotificationProps {
  isVisible: boolean;
  type: 'success' | 'error' | 'loading';
  title: string;
  message?: string;
  onClose: () => void;
  duration?: number;
}

export const SyncNotification: React.FC<SyncNotificationProps> = ({
  isVisible,
  type,
  title,
  message,
  onClose,
  duration = 3000
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      
      if (type !== 'loading' && duration > 0) {
        const timer = setTimeout(() => {
          setIsAnimating(false);
          setTimeout(onClose, 300); // Attendre la fin de l'animation
        }, duration);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, type, duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'loading':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'loading':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full transform transition-all duration-300 ${
        isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`p-4 rounded-lg border shadow-lg ${getBgColor()}`}>
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium ${getTextColor()}`}>{title}</h4>
            {message && (
              <p className={`text-sm mt-1 ${getTextColor()} opacity-80`}>
                {message}
              </p>
            )}
          </div>
          {type !== 'loading' && (
            <button
              onClick={() => {
                setIsAnimating(false);
                setTimeout(onClose, 300);
              }}
              className={`flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors ${getTextColor()}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SyncNotification;
