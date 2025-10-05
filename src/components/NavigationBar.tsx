import React from 'react';
import { Button } from '@/components/ui/button';
import { Home, Settings, Code, Info } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const NavigationBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Home button - always on the left */}
          <Button
            variant={isActive('/') ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center space-x-2"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Button>

          {/* Right side navigation */}
          <div className="flex space-x-2">
            <Button
              variant={isActive('/dev') ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate('/dev')}
              className="flex items-center space-x-2"
            >
              <Code className="h-4 w-4" />
              <span>Dev Mode</span>
            </Button>
            <Button
              variant={isActive('/settings') ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate('/settings')}
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>
            <Button
              variant={isActive('/about') ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate('/about')}
              className="flex items-center space-x-2"
            >
              <Info className="h-4 w-4" />
              <span>About</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
