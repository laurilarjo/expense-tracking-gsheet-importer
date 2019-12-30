import * as getRates from 'ecb-fx-rates';
//import  { ExchangeRate, Currencies, ExchangeResponse } from 'exchange-rates-as-promised';

let exchangeRateSEK: number;


async function convertSEKToEur(amount: number): Promise<number> {
    if (this.exchangeRateSEK === undefined) {
        // TODO: This library uses old xlm2json, which has dependencies to deprecated packages. Should change.
        this.exchangeRateSEK = await getRates({currency: 'SEK'});
        console.log('Rate fetched for SEK: ' + this.exchangeRateSEK);
    }
    return Math.round((amount / this.exchangeRateSEK) * 100) / 100;
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
