import { GoogleSheetsService } from '../services/google-sheets-service';
import { getServiceAccountAccessToken } from '../services/google-service-account';
import type { SheetsWriter } from './types';

export function createServiceAccountSheetsWriter(): SheetsWriter {
  const sheets = GoogleSheetsService.getInstance();
  return {
    async importToSheets(transactions, context, spreadsheetId, options) {
      const accessToken = await getServiceAccountAccessToken();
      return sheets.importToSheets(transactions, context, spreadsheetId, accessToken, options);
    },
  };
}
