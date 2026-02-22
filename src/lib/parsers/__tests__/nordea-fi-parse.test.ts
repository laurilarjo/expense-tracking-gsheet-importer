import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { parseNordeaFiFile } from "../nordea-fi-parse";

function fixturePath(name: string): string {
  return path.join(process.cwd(), "test-fixtures", name);
}

function fileFromFixture(name: string): File {
  const buffer = readFileSync(fixturePath(name));
  return new File([buffer], name);
}

describe("parseNordeaFiFile", () => {
  it("parses Nordea Finland CSV and returns transactions", async () => {
    const file = fileFromFixture("nordea-fi-sample.csv");
    const transactions = await parseNordeaFiFile(file);

    expect(transactions).toHaveLength(3);
    // Data from sample-files/Tapahtumat_nordea_sample.txt (semicolon format for parser)
    expect(transactions[0]).toMatchObject({
      date: "28/08/2019",
      amount: -5.8,
      amountEur: -5.8,
      payee: "ELISA OYJ / SAUNALAHTI",
      year: 2019,
      month: 8,
    });
    const oldest = transactions[transactions.length - 1];
    expect(oldest).toMatchObject({
      date: "15/08/2019",
      amount: -1446.59,
      payee: "BANK NORWEGIAN CREDIT CARDS",
    });
  });

  it("maps Otsikko to payee and row[6] to message", async () => {
    const file = fileFromFixture("nordea-fi-sample.csv");
    const transactions = await parseNordeaFiFile(file);

    const unicef = transactions.find((t) => t.payee === "SUOMEN UNICEF RY");
    expect(unicef).toBeDefined();
    expect(unicef).toMatchObject({
      amount: -10,
      date: "20/08/2019",
      message: "31004 13071 30607 74",
    });
  });

  it("uses statement year from Kirjauspäivä", async () => {
    const file = fileFromFixture("nordea-fi-sample.csv");
    const transactions = await parseNordeaFiFile(file);
    expect(transactions.every((t) => t.year === 2019)).toBe(true);
  });
});
