
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
    amount: number; // row[3] - can be '0'
    payee: string; // row[4]
    transactionType: string; // row[5]
    message: string; // row[6]  can be ''
}
export class Transaction {
    month: number;
    year: string;
    date: string;
    amount: number;
    payee: string;
    transactionType: string;
    message: string;

    constructor(config: {
        month: number,
        year: string,
        date: string,
        amount: number,
        payee: string,
        transactionType: string,
        message: string,
    }) {
        this.month = config.month;
        this.year = config.year;
        this.date = config.date;
        this.amount = config.amount || 0;
        this.payee = config.payee;
        this.transactionType = config.transactionType
        this.message = config.message || '';
    };
    
}
