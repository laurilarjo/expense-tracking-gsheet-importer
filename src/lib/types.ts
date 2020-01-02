


// TODO: later try to use ReadSheets = 'read-sheets'
export enum RunMode {
    ReadSheets,
    ReadFile,
    Import
}



export interface Context {
    bank: Bank;
    user: User;
    filePath: string;
    runMode: RunMode;
    parser: Function;
    sheetName: string;
}

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

export class Transaction {
    month: number;
    year: string;
    date: string; // format is DD/MM/YYYY
    amount: number;
    amountEur: number;
    payee: string;
    transactionType: string;
    message: string;

    constructor(props: {
        month: number,
        year: string,
        date: string,
        amount: number,
        amountEur: number;
        payee: string,
        transactionType: string,
        message: string,
    }) {
        this.month = props.month;
        this.year = props.year;
        this.date = props.date;
        this.amount = props.amount || 0;
        this.amountEur = props.amountEur || 0;
        this.payee = props.payee;
        this.transactionType = props.transactionType
        this.message = props.message || '';
    };
    
}
