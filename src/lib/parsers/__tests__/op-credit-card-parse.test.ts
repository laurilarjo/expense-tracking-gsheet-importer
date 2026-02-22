import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { parseOPCreditCardFile } from "../op-credit-card-parse";

function fixturePath(name: string): string {
  return path.join(process.cwd(), "test-fixtures", name);
}

function fileFromFixture(name: string): File {
  const buffer = readFileSync(fixturePath(name));
  return new File([buffer], name);
}

describe("parseOPCreditCardFile", () => {
  it("parses OP Credit Card XML and returns transactions", async () => {
    const file = fileFromFixture("op-credit-card-sample.xml");
    const transactions = await parseOPCreditCardFile(file);

    expect(transactions).toHaveLength(4);
    expect(transactions[0]).toMatchObject({
      date: "17/12/2026",
      amount: 305.33,
      amountEur: 305.33,
      payee: "SUPERMARKET HELSINKI",
      transactionType: "Osto",
      month: 12,
      year: 2026,
    });
    expect(transactions[1]).toMatchObject({
      date: "18/12/2026",
      amount: 70,
      payee: "SUPERMARKET HELSINKI",
    });
    expect(transactions[2]).toMatchObject({
      date: "19/12/2026",
      amount: 59.53,
      payee: "S-kaupat HOK-Elanto HELSINKI",
    });
    expect(transactions[3]).toMatchObject({
      date: "20/12/2026",
      amount: 1299,
      amountEur: 1299,
      payee: "VERKKOKAUPPA COM HELSINKI",
      transactionType: "Osto",
    });
  });

  it("parses purchases over 1 000 EUR with space as thousands separator", async () => {
    const file = fileFromFixture("op-credit-card-sample.xml");
    const transactions = await parseOPCreditCardFile(file);
    const over1000 = transactions.filter((t) => t.amount > 1000);
    expect(over1000).toHaveLength(1);
    expect(over1000[0]).toMatchObject({
      payee: "VERKKOKAUPPA COM HELSINKI",
      amount: 1299,
      date: "20/12/2026",
    });
  });

  it("uses statement year from InvoicingPeriodEndDate", async () => {
    const file = fileFromFixture("op-credit-card-sample.xml");
    const transactions = await parseOPCreditCardFile(file);
    expect(transactions.every((t) => t.year === 2026)).toBe(true);
  });
});
