import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { parseOPFile } from "../op-parse";

function fixturePath(name: string): string {
  return path.join(process.cwd(), "test-fixtures", name);
}

function fileFromFixture(name: string): File {
  const content = readFileSync(fixturePath(name), "utf-8");
  return new File([content], name, { type: "text/csv" });
}

describe("parseOPFile", () => {
  it("parses OP CSV and returns transactions", async () => {
    const file = fileFromFixture("op-sample.csv");
    const transactions = await parseOPFile(file);

    expect(transactions).toHaveLength(4);
    expect(transactions[0]).toMatchObject({
      amount: -201.1,
      amountEur: -201.1,
      payee: "ACCOUNT HOLDER",
      transactionType: "TILISIIRTO",
      message: "2018xxxx/xxxx",
    });
    expect(transactions[0].date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(transactions[0].month).toBeGreaterThanOrEqual(1);
    expect(transactions[0].month).toBeLessThanOrEqual(12);
    expect(transactions[0].year).toBe(2019);

    expect(transactions[1]).toMatchObject({
      amount: 502.93,
      payee: "EMPLOYER",
      transactionType: "PALKKA",
    });
    expect(transactions[2]).toMatchObject({
      amount: -500,
      payee: "TRANSFER RECIPIENT",
      transactionType: "TILISIIRTO",
    });
    expect(transactions[3]).toMatchObject({
      amount: -5.65,
      payee: "OSUUSPANKKI",
      transactionType: "PALVELUMAKSU",
    });
  });

  it("uses value date (Arvopäivä) and parses amounts and payees", async () => {
    const file = fileFromFixture("op-sample.csv");
    const transactions = await parseOPFile(file);
    expect(transactions).toHaveLength(4);
    expect(transactions.map((t) => t.payee)).toEqual([
      "ACCOUNT HOLDER",
      "EMPLOYER",
      "TRANSFER RECIPIENT",
      "OSUUSPANKKI",
    ]);
    expect(transactions.map((t) => t.amount)).toEqual([-201.1, 502.93, -500, -5.65]);
  });
});
