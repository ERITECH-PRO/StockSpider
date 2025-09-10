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
    <header className="bg-white border-b border-3s-gray-light px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-3s-black font-inter">{title}</h2>
          <div className="w-12 h-1 bg-3s-blue rounded-full mt-1"></div>
        </div>

        <div className="flex items-center gap-4">
          {onSearchChange && (
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-3s-gray-medium w-4 h-4 group-focus-within:text-3s-blue transition-colors" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 py-3 border border-3s-gray-light rounded-xl focus:ring-2 focus:ring-3s-blue focus:border-3s-blue w-80 transition-all duration-200 hover:shadow-3s font-medium"
              />
              <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-3s-gray-medium hover:text-3s-blue transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          )}

          <button className="relative p-3 text-3s-gray-medium hover:text-3s-blue hover:bg-3s-blue/10 rounded-xl transition-all duration-200 hover:scale-110">
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-3s-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce-subtle shadow-lg">
                {notificationCount}
              </span>
            )}
          </button>

          {showAddButton && onAddClick && (
            <button
              onClick={onAddClick}
              className="bg-3s-blue hover:bg-3s-blue-dark text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-200 hover:scale-105 shadow-3s font-semibold"
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