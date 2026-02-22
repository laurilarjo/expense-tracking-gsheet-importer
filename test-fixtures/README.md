# Parser test fixtures

Sample bank/credit card files used by Vitest parser tests. Add new files here when you add or extend parsers.

- **op-credit-card-sample.xml** — Minimal OP Credit Card Finvoice XML (used by `op-credit-card-parse.test.ts`)
- **op-sample.csv** — OP bank CSV (from `sample-files/tapahtumat20190101-20191015 OP.csv`), anonymized; used by `op-parse.test.ts`
- **nordea-fi-sample.csv** — Nordea Finland CSV (structure from `sample-files/Tapahtumat_nordea_sample.txt`, semicolon format for parser), anonymized; used by `nordea-fi-parse.test.ts`
- **norwegian-sample.xlsx** — Norwegian Bank XLSX (copy of `sample-files/Statement Norwegian.xlsx`), used by `norwegian-parse.test.ts`

Parsers without fixtures yet (add samples from `sample-files/` when available): Nordea SE, Handelsbanken, Binance.

Naming: `{bank-or-source}-sample.{ext}` (e.g. `nordea-fi-sample.csv`).
