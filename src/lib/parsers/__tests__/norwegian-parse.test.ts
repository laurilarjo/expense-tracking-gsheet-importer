import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { parseNorwegianFile } from "../norwegian-parse";

function fixturePath(name: string): string {
  return path.join(process.cwd(), "test-fixtures", name);
}

function fileFromFixture(name: string): File {
  const buffer = readFileSync(fixturePath(name));
  return new File([buffer], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("parseNorwegianFile", () => {
  it("parses Norwegian Bank XLSX from fixture and returns transactions", async () => {
    const file = fileFromFixture("norwegian-sample.xlsx");
    const transactions = await parseNorwegianFile(file);

    expect(transactions.length).toBeGreaterThanOrEqual(1);
    // First row in sample: K supermarket, Osto, -64.1, Grocery Stores...
    expect(transactions[0]).toMatchObject({
      amount: -64.1,
      amountEur: -64.1,
      payee: "K supermarket",
      transactionType: "Osto",
    });
    expect(transactions[0].message).toContain("Grocery");
    expect(transactions[0].date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(transactions[0].year).toBe(2018);
  });

  it("parses all rows and skips Katevaraus type", async () => {
    const file = fileFromFixture("norwegian-sample.xlsx");
    const transactions = await parseNorwegianFile(file);
    expect(transactions.some((t) => t.transactionType === "Katevaraus")).toBe(false);
    // Real sample has 5 data rows (no Katevaraus in this file)
    expect(transactions).toHaveLength(5);
  });
});
