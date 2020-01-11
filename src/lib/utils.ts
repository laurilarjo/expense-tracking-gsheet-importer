import * as getRates from 'ecb-fx-rates';
import moment = require('moment');
import  { ExchangeRate, Currencies, ExchangeResponse, HistoricalRates } from 'exchange-rates-as-promised';

let currencyMap: Map<string, number> = new Map();

async function convertSEKToEur(amount: number, date: string): Promise<number> {

    const firstOfMonth: string = moment(date, 'D/M/YYYY').startOf('month').toString();
    const found = currencyMap.get(firstOfMonth);
    let SEK;
    if (!found) {
        console.log(`Fetching SEK rate for date: ${firstOfMonth.toString()}`);
        //exchangeRate = await getRates({currency: 'SEK', date: firstOfMonth});
        const exchangeRate = new ExchangeRate();
        exchangeRate.setBaseCurrency(Currencies.EUR);
        exchangeRate.setCurrencies([Currencies.SEK]);
        exchangeRate.setDate(new Date(firstOfMonth));
        const response = await exchangeRate.getRates();
        SEK = response.rates.SEK;

        if (SEK && typeof(SEK) == 'number') {
            currencyMap.set(firstOfMonth, SEK);
        }
        else {
            throw new Error('Could not find exchange rate for SEK for ' + firstOfMonth);
        }
        console.log(`Rate fetched for SEK: ${SEK} for date: ${response.date}. Wanted for date: ${firstOfMonth.toString()}`);
    } else {
        SEK = found;
    }
    return Math.round((amount / SEK) * 100) / 100;
}


    

export { convertSEKToEur };
