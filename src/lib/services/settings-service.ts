import { AppSettings } from '../types/settings';
import { User } from '../types/user';

const SETTINGS_STORAGE_KEY = 'google-sheets-uploader-settings';

const DEFAULT_SETTINGS: AppSettings = {
  users: [],
  googleSheetsId: '',
  lastSelectedUser: undefined,
  exchangeratesApiKey: ''
};

export class SettingsService {
  private static instance: SettingsService;
  private settings: AppSettings;

  private constructor() {
    this.settings = this.loadSettings();
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  private loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new properties
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
    return DEFAULT_SETTINGS;
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  }

  public getSettings(): AppSettings {
    // Always get fresh settings from localStorage to ensure we have the latest data
    const freshSettings = this.loadSettings();
    this.settings = freshSettings;
    return { ...this.settings };
  }

  public forceRefreshSettings(): AppSettings {
    // Force refresh from localStorage and return fresh settings
    this.settings = this.loadSettings();
    return { ...this.settings };
  }

  public updateSettings(updates: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
  }

  public addUser(userData: Omit<User, 'id'>): User {
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...userData
    };
    
    this.settings.users.push(newUser);
    this.saveSettings();
    return newUser;
  }

  public updateUser(userId: string, updates: Partial<User>): User | null {
    const userIndex = this.settings.users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      return null;
    }

    this.settings.users[userIndex] = { ...this.settings.users[userIndex], ...updates };
    this.saveSettings();
    return this.settings.users[userIndex];
  }

  public deleteUser(userId: string): boolean {
    const userIndex = this.settings.users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      return false;
    }

    this.settings.users.splice(userIndex, 1);
    
    // If deleted user was last selected, clear the selection
    if (this.settings.lastSelectedUser === userId) {
      this.settings.lastSelectedUser = undefined;
    }
    
    this.saveSettings();
    return true;
  }

  public setGoogleSheetsId(id: string): void {
    this.settings.googleSheetsId = id;
    this.saveSettings();
  }

  public setExchangeratesApiKey(key: string): void {
    this.settings.exchangeratesApiKey = key;
    this.saveSettings();
  }

  public setLastSelectedUser(userId: string): void {
    this.settings.lastSelectedUser = userId;
    this.saveSettings();
  }

  public getUserById(userId: string): User | null {
    return this.settings.users.find(user => user.id === userId) || null;
  }

  public getLastSelectedUser(): User | null {
    if (!this.settings.lastSelectedUser) {
      return null;
    }
    return this.getUserById(this.settings.lastSelectedUser);
  }
}
