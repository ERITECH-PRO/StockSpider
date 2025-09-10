import React from 'react';
import { Search, Bell, Plus, Filter } from 'lucide-react';

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
    <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-card animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-3s-black font-inter">{title}</h2>
        </div>

        <div className="flex items-center gap-4">
          {onSearchChange && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-3s-gray-medium w-4 h-4" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-3s-blue focus:border-3s-blue w-80 font-inter transition-all duration-200 hover:shadow-card-hover"
                />
              </div>
              <button className="p-2 text-3s-gray-medium hover:text-3s-blue hover:bg-3s-gray-light rounded-lg transition-all duration-200">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          )}

          <button className="relative p-2 text-3s-gray-medium hover:text-3s-blue hover:bg-3s-gray-light rounded-lg transition-all duration-200">
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-3s-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce-subtle font-inter">
                {notificationCount}
              </span>
            )}
          </button>

          {showAddButton && onAddClick && (
            <button
              onClick={onAddClick}
              className="btn-3s-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="font-inter">Ajouter</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;