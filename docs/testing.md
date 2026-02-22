# Testing strategy

## Two layers

| Layer | Tool | Use for |
|-------|-----|--------|
| **Unit / parser** | **Vitest** | Parser tests (sample files → parsed transactions), optional React component tests |
| **E2E** | **Cypress** | Full browser flows: auth, upload file, navigation |

## Why Vitest for parsers

- Same config and aliases as Vite (`@/`), no extra build.
- Runs in Node: read sample files from disk, build a `File`, call `parseOPCreditCardFile(file)`, assert on output.
- Fast feedback; easy to add one test per sample file.
- You can add React component tests later with `@testing-library/react` and `jsdom` in the same runner.

## Why keep Cypress for E2E

- You already have Cypress and auth/Google flows.
- Use it only for real end-to-end: “upload OP Credit Card XML and see transactions in the UI”, “re-auth when token expired”, etc.
- Parser correctness is covered by Vitest; Cypress checks that the app wires everything together.

## Where to put sample files

- **`test-fixtures/`** at project root: one folder for all parser samples.
- Naming: e.g. `op-credit-card-sample.xml`, `op-bank-sample.csv`, `nordea-fi-sample.csv`.
- Tests live next to code (`src/lib/parsers/__tests__/`) or in a top-level `src/test/` if you prefer.

## Commands

- `npm run test` — Vitest watch mode (parser + unit)
- `npm run test:run` — Vitest single run (CI / Vercel)
- `npm run cypress:open` — Cypress UI
- `npm run cypress:run` — Cypress headless (run locally or in GitHub Actions)

## Vercel

Vitest runs on every deployment. `vercel.json` sets the build command to:

```bash
npm run test:run && npm run build
```

If any test fails, the build fails and Vercel does not deploy. Cypress is not run on Vercel; run it locally or in GitHub Actions.
