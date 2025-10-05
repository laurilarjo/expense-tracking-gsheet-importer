import { User } from './user';

export interface AppSettings {
  users: User[];
  googleSheetsId: string;
  lastSelectedUser?: string;
  exchangeratesApiKey?: string;
}

export interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  setGoogleSheetsId: (id: string) => void;
  setLastSelectedUser: (userId: string) => void;
  setExchangeratesApiKey: (key: string) => void;
  refreshSettings: () => void;
}
