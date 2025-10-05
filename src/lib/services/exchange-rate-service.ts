import dayjs from 'dayjs';
import { SettingsService } from './settings-service';

const currencyMap: Map<string, number> = new Map();

/**
 * Convert SEK to EUR using exchange rates
 * @param amount amount to convert
 * @param date date in format DD/MM/YYYY
 * @returns converted amount in EUR
 */
export const convertSEKToEur = async (amount: number, date: string): Promise<number> => {
  const SEK = await fetchMonthRate(date, 'SEK');
  return Math.round((amount / SEK) * 100) / 100;
};

/**
 * Fetch exchange rate for a specific month
 * @param date date in format DD/MM/YYYY
 * @param currency currency code (e.g., 'SEK')
 * @param apiKey exchange rates API key
 * @returns exchange rate
 */
const fetchMonthRate = async (date: string, currency: string, apiKey?: string): Promise<number> => {
  if (currency !== 'SEK') {
    throw new Error('Non-supported currency: ' + currency);
  }
  
  // Use provided API key or get from settings
  const settingsService = SettingsService.getInstance();
  const settings = settingsService.getSettings();
  const finalApiKey = apiKey || settings.exchangeratesApiKey;
  
  if (!finalApiKey) {
    throw new Error('Exchange rates API key not configured. Please add it in Settings.');
  }
  
  const firstOfMonthString = dayjs(date, 'DD/MM/YYYY').startOf('month').format('YYYY-MM-DD');
  const found = currencyMap.get(firstOfMonthString);
  
  let SEK: number;
  if (!found) {
    console.log(`Fetching SEK rate for date: ${firstOfMonthString}`);
    
    try {
      const response = await fetch(
        `http://api.exchangeratesapi.io/v1/${firstOfMonthString}?access_key=${finalApiKey}&base=EUR&symbols=SEK`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(`API error: ${data.error.info || data.error.message}`);
      }
      
      SEK = data.rates.SEK;
      
      if (SEK && typeof SEK === 'number') {
        currencyMap.set(firstOfMonthString, SEK);
      } else {
        throw new Error('Could not find exchange rate for SEK for ' + firstOfMonthString);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      throw new Error(`Failed to fetch exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    SEK = found;
  }
  
  return SEK;
};

/**
 * Test the exchange rate API key by fetching the current month's rate
 * @param apiKey exchange rates API key
 * @returns Promise with test result
 */
export const testExchangeRateApi = async (apiKey: string): Promise<{ success: boolean; rate?: number; date?: string; error?: string }> => {
  if (!apiKey.trim()) {
    return { success: false, error: 'API key is required' };
  }

  try {
    // Test with current month's first day
    const currentDate = dayjs().format('DD/MM/YYYY');
    const testDate = dayjs().startOf('month').format('YYYY-MM-DD');
    
    // Use the same fetchMonthRate function with the provided API key
    const sekRate = await fetchMonthRate(currentDate, 'SEK', apiKey);
    
    return {
      success: true,
      rate: sekRate,
      date: testDate
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
