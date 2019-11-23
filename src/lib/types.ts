
export class Payment {
    month: number;
    year: number;
    date: string;
    payee: string;
    transactionType: string;
    message: string;
    outflow: number = 0;
    inflow: number = 0;
}