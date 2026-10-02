import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { parseNordeaFiFile } from "../../parsers/nordea-fi-parse";
import { GoogleSheetsService } from "../google-sheets-service";
import { Transaction } from "../../types/transaction";

/** Private helpers exercised via cast — keep in sync with GoogleSheetsService. */
type DuplicateDetectionInternals = {
  mapRowsToTransactions(rows: (string | number)[][], sheetName?: string): Transaction[];
  mapTransactionsToRows(transactions: Transaction[]): (string | number)[][];
  findNewTransactions(
    newTransactions: Transaction[],
    existingTransactions: Transaction[]
  ): Transaction[];
  parseLocaleNumber(value: unknown): number;
  toAppDateString(value: unknown): string;
  areTransactionsEqual(t1: Transaction, t2: Transaction): boolean;
};

function fileFromFixture(name: string): File {
  const buffer = readFileSync(path.join(process.cwd(), "test-fixtures", name));
  return new File([buffer], name);
}

describe("GoogleSheetsService duplicate detection", () => {
  const service = GoogleSheetsService.getInstance() as unknown as DuplicateDetectionInternals;

  it("treats perfect sheet round-trip as all duplicates", async () => {
    const txs = await parseNordeaFiFile(fileFromFixture("nordea-fi-sample.csv"));
    const existing = service.mapRowsToTransactions(service.mapTransactionsToRows(txs), "test");
    expect(service.findNewTransactions(txs, existing)).toHaveLength(0);
  });

  it("matches Finnish-locale formatted amounts and dot dates from Sheets", async () => {
    const txs = await parseNordeaFiFile(fileFromFixture("nordea-fi-sample.csv"));
    const finnishRows = service.mapTransactionsToRows(txs).map((r: (string | number)[]) => [
      r[0],
      r[1],
      String(r[2]).replace(/\//g, "."), // 28.08.2019
      String(r[3]).replace(".", ","), // -1446,59
      String(r[4]).replace(".", ","),
      r[5],
      r[6],
      r[7],
      r[8],
    ]);

    const existing = service.mapRowsToTransactions(finnishRows, "test");
    expect(service.findNewTransactions(txs, existing)).toHaveLength(0);
  });

  it("matches Finnish thousands separators in amount strings", () => {
    const fromFile = new Transaction({
      month: 4,
      year: 2024,
      date: "15/04/2024",
      amount: -1249.74,
      amountEur: -1249.74,
      payee: "BANK NORWEGIAN CREDIT CARDS",
      transactionType: "",
      message: "",
    });
    const fromSheet = new Transaction({
      month: 4,
      year: 2024,
      date: "15.04.2024",
      amount: service.parseLocaleNumber("-1 249,74"),
      amountEur: service.parseLocaleNumber("-1\u00A0249,74"),
      payee: "BANK NORWEGIAN CREDIT CARDS",
      transactionType: "",
      message: "",
    });

    expect(service.areTransactionsEqual(fromFile, fromSheet)).toBe(true);
  });

  it("matches Sheets serial dates against DD/MM/YYYY", () => {
    // 15/04/2024 → Sheets serial
    const serial = Math.round(
      (Date.UTC(2024, 3, 15) - Date.UTC(1899, 11, 30)) / 86400000
    );
    const fromFile = new Transaction({
      month: 4,
      year: 2024,
      date: "15/04/2024",
      amount: -10,
      amountEur: -10,
      payee: "Test",
      transactionType: "",
      message: "",
    });
    const fromSheet = new Transaction({
      month: 4,
      year: 2024,
      date: service.toAppDateString(serial),
      amount: -10,
      amountEur: -10,
      payee: "Test",
      transactionType: "",
      message: "",
    });

    expect(fromSheet.date).toBe("15/04/2024");
    expect(service.areTransactionsEqual(fromFile, fromSheet)).toBe(true);
  });

  it("parseLocaleNumber handles common locale forms", () => {
    expect(service.parseLocaleNumber(-1249.74)).toBeCloseTo(-1249.74);
    expect(service.parseLocaleNumber("-1249,74")).toBeCloseTo(-1249.74);
    expect(service.parseLocaleNumber("-1.249,74")).toBeCloseTo(-1249.74);
    expect(service.parseLocaleNumber("-1,249.74")).toBeCloseTo(-1249.74);
    expect(service.parseLocaleNumber("-1 249,74")).toBeCloseTo(-1249.74);
  });
});
