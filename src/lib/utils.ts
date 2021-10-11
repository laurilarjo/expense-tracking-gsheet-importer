import moment = require('moment');
import axios from 'axios';
import config from './config';

let currencyMap: Map<string, number> = new Map();

/**
 * 
 * @param amount amount to convert
 * @param date date in format D/M/YYYY
 * @returns 
 */
export const convertSEKToEur = async (amount: number, date: string): Promise<number> => {
        
    const SEK = await fetchMonthRate(date, 'SEK');

    return Math.round((amount / SEK) * 100) / 100;
}

const fetchMonthRate = async (date: string, currency: string): Promise<number> => {
    if (currency !== 'SEK') {
        throw new Error('Non-supported currency:' + currency);
    }
    const firstOfMonthString = moment(date, 'D/M/YYYY').startOf('month').format('YYYY-MM-DD');
    const found = currencyMap.get(firstOfMonthString);
    let SEK;
    if (!found) {
        console.log(`Fetching SEK rate for date: ${firstOfMonthString}`);
        const response = await axios.get<any>(`http://api.exchangeratesapi.io/v1/${firstOfMonthString}` +
            `?access_key=${config.EXCHANGERATES_API_KEY}&base=EUR&symbols=SEK`);
        SEK = response.data.rates.SEK;
        if (SEK && typeof(SEK) == 'number') {
            currencyMap.set(firstOfMonthString, SEK);
        }
        else {
            throw new Error('Could not find exchange rate for SEK for ' + firstOfMonthString);
        }

    } else {
        SEK = found;
    }
    return SEK;
}
