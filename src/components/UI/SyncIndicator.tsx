import React from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface SyncIndicatorProps {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  className?: string;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ 
  isSyncing, 
  lastSyncTime, 
  className = '' 
}) => {
  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) {
      return `Il y a ${seconds}s`;
    } else if (minutes < 60) {
      return `Il y a ${minutes}min`;
    } else if (hours < 24) {
      return `Il y a ${hours}h`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {isSyncing ? (
        <>
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="text-blue-600 font-medium">Synchronisation...</span>
        </>
      ) : lastSyncTime ? (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-gray-600">
            Synchronisé {formatLastSync(lastSyncTime)}
          </span>
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4 text-orange-500" />
          <span className="text-orange-600">Non synchronisé</span>
        </>
      )}
    </div>
  );
};

export default SyncIndicator;
