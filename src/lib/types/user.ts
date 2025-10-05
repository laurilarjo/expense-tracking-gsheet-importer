import { Bank } from './bank';

export interface User {
  id: string;
  name: string;
  allowedBanks: Bank[];
}

export interface CreateUserData {
  name: string;
  allowedBanks: Bank[];
}

export interface UpdateUserData {
  name?: string;
  allowedBanks?: Bank[];
}
