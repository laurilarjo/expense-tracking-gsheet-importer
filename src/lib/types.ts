
export interface CmdLineArguments {
    file: string;
    user: string;
    bank: string;
    runMode: string;
}

export interface Context {
    bank: Bank;
    user: User;
    filePath: string;
    runMode: RunMode;
    parser: Function;
    sheetName: string;
}

// TODO: later try to use ReadSheets = 'read-sheets'
export enum RunMode {
    Import,
    ReadFile,
    ReadSheets,
    DryRun
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
    year: string; // TODO: Change this to number
    date: string; // format is DD/MM/YYYY. It's not date because the result goes to GSheet and date messes things up.
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
