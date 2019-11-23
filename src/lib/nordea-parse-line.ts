import fs = require('fs');

export function parseLine(line: string) {
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
    const month = dateParts[1];
    const year = dateParts[2];
    const date = dateParts[0] + '/' + dateParts[1] + '/' + dateParts[2];
    const payee = lineArr[4];
    const transactionType = lineArr[7];
    const message = lineArr[10];
    let amount = parseFloat(lineArr[3].replace(',', '.'));
    let outflow = 0;
    let inflow = 0;

    if (amount > 0) {
        inflow = amount;
    } else {
        outflow = -1 * amount;
    }

    const payment = {
        month: month,
        year: year,
        date: date,
        payee: payee,
        transactionType: transactionType,
        message: '"' + message + '"',
        outflow: outflow,
        inflow: inflow,
    };

    return payment;
}

