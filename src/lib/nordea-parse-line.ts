import { Payment } from './types';

function parseLine(line: string) {
    if (line === '') {
        return null;
    }

    const lineArr = line.split('\t');

    // 0 - Kirjauspäivä
    // 1 - Arvopäivä
    // 2 - Maksupäivä
    // 3 - Määrä
    // 4 - Saaja/Maksaja
    // 5 - Tilinumero
    // 6 - BIC
    // 7 - Tapahtuma
    // 8 - Viite
    // 9 - Maksajan viite
    // 10 - Viesti
    // 11 - Kortinnumero
    // 12 - Kuitti

    const dateParts = lineArr[2].split('.');
    let payment = new Payment();
    payment.month = parseInt(dateParts[1]);
    payment.year = parseInt(dateParts[2]);
    payment.date = dateParts[0] + '/' + dateParts[1] + '/' + dateParts[2];
    payment.payee = lineArr[4];
    payment.transactionType = lineArr[7];
    payment.message = lineArr[10];

    let amount = parseFloat(lineArr[3].replace(',', '.'));
    
    if (amount > 0) {
        payment.inflow = amount;
    } else {
        payment.outflow = -1 * amount;
    }

    return payment;
}

export {parseLine};

