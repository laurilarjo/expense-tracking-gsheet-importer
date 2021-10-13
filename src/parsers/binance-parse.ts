/**
 * Reads Binance credit card transaction files in XLSX format
 */
import * as xlsx from "xlsx";
import * as moment from "moment";
import config from "../lib/config";
import { Transaction } from "../lib/types";

const readTransactionsFromFile = async (
  filePath: string
): Promise<Transaction[]> => {
  console.log(filePath);

  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const xlsTransactionArray = xlsx.utils.sheet_to_json(sheet);
  const transactions: Transaction[] = [];

  xlsTransactionArray.forEach((line: any) => {
    const transaction = parseLine(line);
    if (transaction) {
      transactions.push(transaction);
    }
  });

  return transactions;
};

const parseLine = (line: any): Transaction | null => {
  if (!line) {
    return null;
  }

  // Timestamp -> date
  // Description -> payee
  // Paid OUT (EUR) -> amount

  // Skip, because these will be updated to "Osto" in upcoming exports
  if (line["Type"] == "Katevaraus") {
    return null;
  }

  const payment = new Transaction();
  const date = moment(line["Timestamp"]);
  payment.month = parseInt(date.format("MM"));
  payment.year = date.format("YYYY");
  payment.date = date.format("DD/MM/YYYY");
  payment.payee = line["Description"];
  payment.transactionType = "";
  payment.message = "";
  payment.amount = 0 - parseFloat(line["Paid OUT (EUR)"]); // it's not marked as negative in the xlsx
  payment.amountEur = payment.amount;

  return payment;
};

export const binanceParse = async (
  filePath: string
): Promise<Transaction[]> => {
  try {
    const transactions = await readTransactionsFromFile(filePath);

    // I want oldest transactions to top
    transactions.sort((a, b) => {
      return (
        moment(a.date, "D/M/YYYY").unix() - moment(b.date, "D/M/YYYY").unix()
      );
    });

    if (config.LOG == "debug") {
      console.log("Binance-parse results:");
      console.log(transactions);
    }
    return transactions;
  } catch (e) {
    console.error(e);
    throw new Error(e);
  }
};
