export class Transaction {
  month: number;
  year: string;
  date: string; // format is DD/MM/YYYY
  amount: number;
  amountEur: number;
  payee: string;
  transactionType: string;
  message: string;

  constructor(props: Partial<Transaction> = {}) {
    this.amount = props.amount ?? 0;
    this.amountEur = props.amountEur ?? 0;
    this.message = props.message ?? '';
    this.month = props.month ?? 0;
    this.year = props.year ?? '';
    this.date = props.date ?? '';
    this.payee = props.payee ?? '';
    this.transactionType = props.transactionType ?? '';
    
    // Apply any additional props that weren't explicitly set
    Object.assign(this, props);
  }
}
