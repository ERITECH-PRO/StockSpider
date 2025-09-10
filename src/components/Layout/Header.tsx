import React from 'react';
import { Search, Bell, Plus } from 'lucide-react';

interface HeaderProps {
  title: string;
  onAddClick?: () => void;
  showAddButton?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  notificationCount?: number;
}

const Header = ({ 
  title, 
  onAddClick, 
  showAddButton = false, 
  searchPlaceholder = "Rechercher...",
  onSearchChange,
  notificationCount = 0
}: HeaderProps) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </div>

        <div className="flex items-center gap-4">
          {onSearchChange && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-80"
              />
            </div>
          )}

          <button className="relative p-2 text-gray-400 hover:text-gray-600">
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button>

          {showAddButton && onAddClick && (
            <button
              onClick={onAddClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;