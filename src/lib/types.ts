
export interface Context {
    bank: Bank;
    user: User;
}
;
export enum Bank {
    NordeaFI,
    NordeaSWE,
    OP,
    Handelsbanken,
    Norwegian
}
export enum User {
    Lauri,
    Becky
}
export interface ITransaction {
    month: number; // row[0]
    year: string; // row[1]
    date: string; // row[2]
    outflow: number; // row[3] - can be '0'
    inflow: number; // row[4] - can be '0'
    payee: string; // row[5]
    transactionType: string; // row[6]
    message: string; // row[7]  can be ''
}
export class Transaction {
    month: number; // row[0]
    year: string; // row[1]
    date: string; // row[2]
    outflow: number; // row[3]
    inflow: number; // row[4]
    payee: string; // row[5]
    transactionType: string; // row[6]
    message: string; // row[7]

    constructor(config: {
        month: number,
        year: string,
        date: string,
        outflow: number,
        inflow: number,
        payee: string,
        transactionType: string,
        message: string,
    }) {
        this.month = config.month;
        this.year = config.year;
        this.date = config.date;
        this.outflow = config.outflow || 0;
        this.inflow = config.inflow || 0;
        this.payee = config.payee;
        this.transactionType = config.transactionType
        this.message = config.message || '';
    };
    
}
