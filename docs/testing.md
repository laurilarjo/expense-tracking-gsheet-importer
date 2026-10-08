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

## Cypress: mocking / bypassing auth

The app gates entry on Google Sheets OAuth (or Dev Mode). You can bypass auth so tests never hit real Google:

1. **App gate** — so you’re not redirected to `/login`:
   - **Recommended:** `cy.visitAsDevMode('/')` — sets a dev-mode user in `localStorage` before load. **Requires running the app in development** (e.g. `npm run dev` on port 8080), because `AuthContext` only honours `dev_mode_user` when `NODE_ENV !== 'production'`.

2. **Google Sheets OAuth** — so the app thinks Sheets is already authorized:
   - `cy.mockGoogleAuth()` — sets `google_sheets_token` in `localStorage` and mocks `gapi` / `google.accounts.oauth2`, so the “Authorize Google Sheets Access” flow is skipped.

**Example** (in a spec’s `beforeEach`):

```ts
cy.clearLocalStorage();
cy.visitAsDevMode('/');           // past login gate
cy.mockGoogleAuth();              // past Google Sheets; optional if test needs the auth UI
cy.reload();                      // only if you need the app to re-read localStorage
```

## Where to put sample files

- **`test-fixtures/`** at project root: one folder for all parser samples.
- Naming: e.g. `op-credit-card-sample.xml`, `op-bank-sample.csv`, `nordea-fi-sample.csv`.
- Tests live next to code (`src/lib/parsers/__tests__/`) or in a top-level `src/test/` if you prefer.

## Telegram bot (Vitest, no live Telegram)

Bot logic is tested by feeding fake Telegram `Update` objects into `handleTelegramUpdate` with in-memory Blob, fake Telegram client, and fake Sheets writer. Fixtures reuse `test-fixtures/*.csv`. See `src/lib/bot/__tests__/`.

Agent checklist (no secrets):

```bash
npm install
npm run test:run
```

## Commands

- `npm run test` — Vitest watch mode (parser + unit + bot)
- `npm run test:run` — Vitest single run (CI / Vercel)
- `npm run cypress:open` — Cypress UI
- `npm run cypress:run` — Cypress headless (run locally or in GitHub Actions)
- `npm run api:dev` / `npm run bot:dev` — local API + Telegram long poll (optional secrets)

## Vercel

Vitest runs on every deployment. `vercel.json` sets the build command to:

```bash
npm run test:run && npm run build
```

If any test fails, the build fails and Vercel does not deploy. Cypress is not run on Vercel; run it locally or in GitHub Actions.
