import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppSettings, SettingsContextType } from '../lib/types/settings';
import { User } from '../lib/types/user';
import { SettingsService } from '../lib/services/settings-service';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const settingsService = SettingsService.getInstance();
    return settingsService.getSettings();
  });

  // Refresh settings from localStorage when component mounts or when storage changes
  useEffect(() => {
    const refreshSettings = () => {
      const settingsService = SettingsService.getInstance();
      const freshSettings = settingsService.getSettings();
      setSettings(freshSettings);
    };

    // Refresh on mount
    refreshSettings();

    // Listen for storage changes (when settings are updated in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'google-sheets-uploader-settings') {
        refreshSettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const updateSettings = (updates: Partial<AppSettings>) => {
    const settingsService = SettingsService.getInstance();
    settingsService.updateSettings(updates);
    setSettings(settingsService.getSettings());
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const settingsService = SettingsService.getInstance();
    const newUser = settingsService.addUser(userData);
    setSettings(settingsService.getSettings());
    return newUser;
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    const settingsService = SettingsService.getInstance();
    const updatedUser = settingsService.updateUser(userId, updates);
    if (updatedUser) {
      setSettings(settingsService.getSettings());
    }
    return updatedUser;
  };

  const deleteUser = (userId: string) => {
    const settingsService = SettingsService.getInstance();
    const success = settingsService.deleteUser(userId);
    if (success) {
      setSettings(settingsService.getSettings());
    }
    return success;
  };

  const setGoogleSheetsId = (id: string) => {
    const settingsService = SettingsService.getInstance();
    settingsService.setGoogleSheetsId(id);
    setSettings(settingsService.getSettings());
  };

  const setLastSelectedUser = (userId: string) => {
    const settingsService = SettingsService.getInstance();
    settingsService.setLastSelectedUser(userId);
    setSettings(settingsService.getSettings());
  };

  const setExchangeratesApiKey = (key: string) => {
    const settingsService = SettingsService.getInstance();
    settingsService.setExchangeratesApiKey(key);
    setSettings(settingsService.getSettings());
  };

  const refreshSettings = useCallback(() => {
    const settingsService = SettingsService.getInstance();
    setSettings(settingsService.forceRefreshSettings());
  }, []);

  const value: SettingsContextType = {
    settings,
    updateSettings,
    addUser,
    updateUser,
    deleteUser,
    setGoogleSheetsId,
    setLastSelectedUser,
    setExchangeratesApiKey,
    refreshSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
