
export class Transaction {
    month: number; // row[0]
    year: number; // row[1]
    date: string; // row[2]
    outflow: number = 0; // row[3]
    inflow: number = 0; // row[4]
    payee: string; // row[5]
    transactionType: string; // row[6]
    message: string; // row[7]
    
}