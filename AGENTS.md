# AGENTS.md

## Cursor Cloud specific instructions

This is a client-side React 19 + Vite + TypeScript SPA (a bank-transaction file parser that imports into Google Sheets). There is no backend service in this repo — everything runs in the browser. Auth (Firebase) and Google Sheets config are hardcoded/dev values; no `.env` is required to run the app.

### Services / commands
Standard scripts live in `package.json`. Key ones:
- Dev server: `npm run dev` — Vite on `http://localhost:8080` (port set in `vite.config.ts`).
- Tests: `npm run test:run` (Vitest single run) or `npm run test` (watch). Parser unit tests live in `src/lib/parsers/__tests__/`.
- Type check: `npm run check-types` (`tsc --noEmit`).
- Build: `npm run build` (Vite production build; large-bundle chunk-size warning is expected and harmless).
- Lint: `npm run lint`. NOTE: lint currently exits non-zero due to two pre-existing `no-useless-escape` errors in `src/lib/utils/text-preprocessing.ts` and several `react-refresh` warnings — these are pre-existing in the repo, not environment issues.
- E2E: Cypress (`npm run cypress:run`) targets `http://localhost:8080`, so the dev server must be running first. Cypress is not run on Vercel.

### Non-obvious gotchas
- To exercise the app without real Google auth, use **Dev Mode login**: on `/login`, triple-click the "Welcome back" title to reveal a "Use Dev Mode Login" button (only available when `NODE_ENV !== 'production'`, i.e. under `npm run dev`). It stores a mock user in `localStorage` (`dev_mode_user`).
- The home upload area is empty until you create a user with at least one bank assigned via `/settings` → User Management, then select that user on the home page. Users are persisted in `localStorage`, not a database.
- After uploading a bank file, the app parses it and shows "Review and categorize your N transactions". The **per-transaction list only renders after an ML model is trained** (TensorFlow.js model stored in IndexedDB via the Categorization Trainer). Without a trained model, `CategorizationPredictor` intentionally shows a "No trained model available" card — this is expected, not a bug.
- Uploading to Google Sheets requires a real Google OAuth token (set via `/dev` page or the Google Sheets auth flow); parsing/preview works fully offline without it.
- Sample bank files for manual testing live in `sample-files/` and `test-fixtures/` (e.g. OP CSV, Nordea, Norwegian XLSX, OP credit-card XML).
