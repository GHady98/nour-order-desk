# Nour’s Order Desk

**Ghady Nazha** · TechTalks Assignment 4

A focused internal order dashboard for a fictional handmade-candle studio. List and inspect orders, add a one-product order, edit its information/status, and confirm deletion. Every operation uses Next.js Route Handlers through browser fetch. Summary counts reflect actual server responses.

Branch: `assignment-4-nour-order-desk`.

Repository: https://github.com/GHady98/nour-order-desk

Branch URL: https://github.com/GHady98/nour-order-desk/tree/assignment-4-nour-order-desk

## Run locally

Use Node.js 22.18+ or Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000, or the port printed in your terminal. For the verified production preview:

```sh
npm run build
npm run start -- --port 3007
```

Open http://localhost:3007.

## What the app does

- One dashboard with total, Pending, and Delivered counts.
- An API-backed order list and full-details panel.
- Add/edit dialogs with labelled fields, useful errors, and pending controls.
- Editable unit price; defaults from Vanilla Candle $8, Cedar Candle $10, Mini Gift Candle $6.
- New orders start Pending; updates allow Pending, Preparing, or Delivered.
- Confirm deletion, or keep the order. Successful DELETE returns 204 and is never parsed as JSON.
- Initial loading, friendly list error/retry, actual empty state, and preserved values after rejected saves.
- Native modal dialogs, visible keyboard focus, and a responsive 360px layout.

All names and phone values are fictional demo data. No Instagram/WhatsApp integration, account system, inventory, database, payments, or application secrets are present.

## Important storage limitation

Orders are held in a server-side Map on one process-global key, shared by all five handlers. **Orders are temporary. A server restart restores the three seed orders and removes new records.** Development reloads can also reset data. Multiple processes/instances do not share reliable state. No browser localStorage or durable storage is used. This is a local learning exercise, not a production customer system. Deployment is optional and is not included.

## API

| Method | Endpoint           | Success           |
| ------ | ------------------ | ----------------- |
| GET    | `/api/orders`      | 200 array         |
| GET    | `/api/orders/[id]` | 200 object        |
| POST   | `/api/orders`      | 201 saved order   |
| PATCH  | `/api/orders/[id]` | 200 updated order |
| DELETE | `/api/orders/[id]` | 204, no body      |

Invalid input/malformed JSON returns 400 with a useful message; unknown IDs return 404. The server owns IDs and totals. PATCH validates all supplied fields and calculates a valid candidate before changing the store. See [API contract and examples](docs/API.md).

## Verification

```sh
npm run lint
npm run build
```

With a fresh local production server on port 3007:

```sh
npm run test:api
npx newman run docs/Nour-Order-Desk.postman_collection.json --reporters cli,json --reporter-json-export docs/evidence/newman-results.json
```

Browser checks use Playwright. Install Chromium once with `npx playwright install chromium`, then run `npm run test:browser`. Alternatively, use installed Edge in PowerShell:

```powershell
$env:BROWSER_CHANNEL = 'msedge'
npm run test:browser
```

`BASE_URL` selects another port for the Node/Playwright tests. The Postman collection uses its `baseUrl` variable. The browser suite intentionally creates/removes only its own records and the known fictional seed records on a dedicated local test server. It ends by creating a restart marker. **Restart the server after the suite** to restore a clean three-order demo. Do not run destructive demo verification against a server containing other records.

Actual results: 47 API checks passed; the Postman v2.1 collection passed 17 requests/18 assertions through Newman; browser acceptance/mobile/keyboard checks passed; restart behaviour was directly verified. See [TESTING](docs/TESTING.md) for scope and honest limitations. Newman is Postman’s command-line collection runner; no manual Postman desktop session is claimed.

## Project map

- `app/api/orders/route.ts`: list/create handlers.
- `app/api/orders/[id]/route.ts`: read/update/delete handlers with awaited params.
- `lib/orders-store.ts`: process-local shared storage and atomic mutations.
- `lib/order-validation.ts`: input allowlist, validation, integer-cent calculation, malformed JSON handling.
- `lib/order-types.ts`: shared types, statuses, catalogue, USD formatting.
- `lib/client-api.ts`: response checking and 204 handling.
- `components/order-desk.tsx`: list/detail requests, server-response reconciliation, derived summaries.
- `components/order-editor.tsx`, `components/delete-order.tsx`: accessible pending-aware dialogs.

## Documents and evidence

- [Plan written before implementation](docs/PLAN.md)
- [API reference](docs/API.md)
- [Actual test outcomes](docs/TESTING.md)
- [Technical review and AI reflection](docs/REVIEW.md)
- [Importable Postman collection](docs/Nour-Order-Desk.postman_collection.json)
- [Evidence folder](docs/evidence/)
- [Submission record](docs/SUBMISSION.md)

Endpoint PNGs are clearly labelled visual receipts generated from actual recorded HTTP results, not fabricated Postman GUI screenshots. Original JSON results and the Newman run are included for traceability. Dashboard/mobile screenshots were captured from the running production app.

## Stack and limitations

Next.js 16.4.3, React 19.3.0, TypeScript, Tailwind CSS 4, native fetch, and no external runtime service. Implemented and documented with AI assistance; the author remains responsible for understanding the request flow. No user research or personal manual verification is invented. No optional recording is included.

At installation, npm audit found 16 moderate advisories in development lint-tool dependencies; the production-only audit reported zero. No forced downgrade or breaking audit fix was applied. The test runner also emitted dependency deprecation notices; its actual assertions passed. See TESTING.md.
