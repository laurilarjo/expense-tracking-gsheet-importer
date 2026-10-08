import { Bank } from '../types/bank';
import { Transaction } from '../types/transaction';
import { parseOPFile } from './op-parse';
import { parseOPCreditCardFile } from './op-credit-card-parse';
import { parseNordeaFiFile } from './nordea-fi-parse';
import { parseNordeaSeFile } from './nordea-se-parse';
import { parseNorwegianFile } from './norwegian-parse';
import { parseHandelsbankenFile } from './handelsbanken-parse';
import { parseBinanceFile } from './binance-parse';

export async function parseBankFile(bank: Bank, file: File): Promise<Transaction[]> {
  switch (bank) {
    case Bank.OP:
      return parseOPFile(file);
    case Bank.OP_CREDIT_CARD:
      return parseOPCreditCardFile(file);
    case Bank.NORDEA_FI:
      return parseNordeaFiFile(file);
    case Bank.NORDEA_SE:
      return parseNordeaSeFile(file);
    case Bank.NORWEGIAN:
      return parseNorwegianFile(file);
    case Bank.HANDELSBANKEN:
      return parseHandelsbankenFile(file);
    case Bank.BINANCE:
      return parseBinanceFile(file);
    default:
      throw new Error(`Unsupported bank: ${bank}`);
  }
}
