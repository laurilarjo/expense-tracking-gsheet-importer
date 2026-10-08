import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppSettings, SettingsContextType } from '../lib/types/settings';
import { User } from '../lib/types/user';
import { SettingsService } from '../lib/services/settings-service';
import { syncWorkspaceSettings } from '../lib/services/workspace-sync-client';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/** Best-effort sync to bot storage; ignores auth/network failures. */
function syncBotWorkspaceQuietly(settings: AppSettings) {
  syncWorkspaceSettings(settings).catch(() => {
    /* optional until Connect Telegram / api:dev is running */
  });
}

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
      if (
        e.key === 'lala-expense-tracker-settings' ||
        e.key === 'google-sheets-uploader-settings'
      ) {
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
    const next = settingsService.getSettings();
    setSettings(next);
    syncBotWorkspaceQuietly(next);
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const settingsService = SettingsService.getInstance();
    const newUser = settingsService.addUser(userData);
    const next = settingsService.getSettings();
    setSettings(next);
    syncBotWorkspaceQuietly(next);
    return newUser;
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    const settingsService = SettingsService.getInstance();
    const updatedUser = settingsService.updateUser(userId, updates);
    if (updatedUser) {
      const next = settingsService.getSettings();
      setSettings(next);
      syncBotWorkspaceQuietly(next);
    }
    return updatedUser;
  };

  const deleteUser = (userId: string) => {
    const settingsService = SettingsService.getInstance();
    const success = settingsService.deleteUser(userId);
    if (success) {
      const next = settingsService.getSettings();
      setSettings(next);
      syncBotWorkspaceQuietly(next);
    }
    return success;
  };

  const setGoogleSheetsId = (id: string) => {
    const settingsService = SettingsService.getInstance();
    settingsService.setGoogleSheetsId(id);
    const next = settingsService.getSettings();
    setSettings(next);
    syncBotWorkspaceQuietly(next);
  };

  const setLastSelectedUser = (userId: string) => {
    const settingsService = SettingsService.getInstance();
    settingsService.setLastSelectedUser(userId);
    setSettings(settingsService.getSettings());
  };

  const setExchangeratesApiKey = (key: string) => {
    const settingsService = SettingsService.getInstance();
    settingsService.setExchangeratesApiKey(key);
    const next = settingsService.getSettings();
    setSettings(next);
    syncBotWorkspaceQuietly(next);
  };

  const refreshSettings = useCallback(() => {
    const settingsService = SettingsService.getInstance();
    setSettings(settingsService.forceRefreshSettings());
  }, []);

  const replaceSettings = (next: AppSettings) => {
    const settingsService = SettingsService.getInstance();
    settingsService.replaceSettings(next);
    const saved = settingsService.getSettings();
    setSettings(saved);
    syncBotWorkspaceQuietly(saved);
  };

  const value: SettingsContextType = {
    settings,
    updateSettings,
    addUser,
    updateUser,
    deleteUser,
    setGoogleSheetsId,
    setLastSelectedUser,
    setExchangeratesApiKey,
    refreshSettings,
    replaceSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
