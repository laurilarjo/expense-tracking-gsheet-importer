
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
    LoginToSheets,
}

export enum Bank {
    NordeaFI,
    NordeaSWE,
    OP,
    Handelsbanken,
    Norwegian,
}
export enum User {
    Lauri,
    Becky,
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

    constructor(props: Partial<Transaction> = {}) {
        props.amount ?? 0;
        props.amountEur ?? 0;
        props.message ?? '';
        Object.assign(this, props);
    }; 
}
