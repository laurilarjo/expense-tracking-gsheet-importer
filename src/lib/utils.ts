import * as getRates from 'ecb-fx-rates';
import moment = require('moment');
//import  { ExchangeRate, Currencies, ExchangeResponse } from 'exchange-rates-as-promised';

let currencyMap: Map<string, number> = new Map();

async function convertSEKToEur(amount: number, date: string): Promise<number> {
    
    const firstOfMonth: string = moment(date, 'D/M/YYYY').startOf('month').toString();
    const found = currencyMap.get(firstOfMonth);
    let exchangeRate;
    if (!found) {
        // TODO: This library uses old xlm2json, which has dependencies to deprecated packages. Should change.
        console.log(`Fetching SEK rate for date: ${firstOfMonth.toString()}`);
        exchangeRate = await getRates({currency: 'SEK', date: firstOfMonth});
        if (exchangeRate) {
            currencyMap.set(firstOfMonth, exchangeRate);
        }
        console.log(`Rate fetched for SEK: ${exchangeRate} for date: ${firstOfMonth.toString()}`);
    } else {
        exchangeRate = found;
    }
    return Math.round((amount / exchangeRate) * 100) / 100;
}

  /*
    This exchangeRate library is not well done as NPM package, but is otherwise promising. 
    I'm waiting for feedback on the issue: https://github.com/ToeFungi/exchange-rates-as-promised/issues/2

    const exchangeRate = new ExchangeRate();
    exchangeRate.setBaseCurrency(Currencies.EUR);
    exchangeRate.setCurrencies([Currencies.SEK]);
    exchangeRate.setDate(new Date());

    exchangeRate.getRates().then((response: ExchangeResponse) => console.log({
        base: response.base,
        date: response.date,
        rates: response.rates
    }))
    */

export { convertSEKToEur };
