# Verification record

Date: 31 October 2026. Next.js 16.4.3, React 19.3.0, Node.js 24, headless Microsoft Edge through Playwright. Tests ran against one local production server on port 3007. All customers/contacts are fictional. Verification was carried out by the coding agent; no manual student or Postman desktop session is claimed.

## Commands and actual outcomes

| Command                                                                                                                                     | Actual outcome                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm install`                                                                                                                               | Completed. 16 moderate development-tool advisories reported.                                                     |
| `npm run lint`                                                                                                                              | Passed without diagnostics after removing unused imports/test variables and naming the PostCSS config export.    |
| `npm run build`                                                                                                                             | Passed compilation, TypeScript, and route generation. `/api/orders` and `/api/orders/[id]` are dynamic handlers. |
| `npm run test:api`                                                                                                                          | PASS, 47 real HTTP checks.                                                                                       |
| `npx newman run docs/Nour-Order-Desk.postman_collection.json --reporters cli,json --reporter-json-export docs/evidence/newman-results.json` | PASS, 17 requests, 18 assertions, zero failures.                                                                 |
| `npm run test:browser` with `BROWSER_CHANNEL=msedge`                                                                                        | PASS, complete browser acceptance/state/mobile/keyboard checks; no page JavaScript errors.                       |
| `node scripts/render-api-evidence.mjs` with `BROWSER_CHANNEL=msedge`                                                                        | Generated seven screenshot receipts from passing actual API results.                                             |
| Restart marker check                                                                                                                        | PASS, marker returned 404 after restarting the server; exactly the three seed IDs returned.                      |
| `npm audit --omit=dev`                                                                                                                      | Zero production dependency advisories in that check.                                                             |

The initial lint/build attempt happened while npm installation was still finishing, so executables were not yet available. Commands were run successfully after installation; the incomplete early attempt is not counted as a passing check. The first browser runs needed two harness corrections: Chromium cannot reliably expose a response body for 204 through its page-response API, and native dialog tabbing can briefly move focus to browser chrome. The API/Newman tests independently assert an empty 204 body; the final browser test asserts no background document control receives modal focus. These were verification-harness issues, not fabricated application failures.

A combined collection-generation/run command was rejected by automatic tool review. The safer alternative wrote a static collection file and then ran it separately; that run succeeded. No manual Postman GUI activity is claimed.

## API checks

| Case                                                       | Expected                           | Actual                                                | Result |
| ---------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------- | ------ |
| List                                                       | 200 array                          | 200 array                                             | PASS   |
| Read created ID from detail endpoint                       | 200 matching object                | Matches POST response, demonstrating shared store     | PASS   |
| Create valid order                                         | 201, unique ID, $24, Pending       | Correct saved object; whitespace trimmed              | PASS   |
| Missing/blank customer, blank phone/product, numeric phone | 400 useful message                 | Rejected                                              | PASS   |
| Quantity 0, -1, 1.5, numeric string, null                  | 400                                | All rejected                                          | PASS   |
| Price negative, string, excess decimals, null              | 400                                | All rejected                                          | PASS   |
| Flying status                                              | 400 PATCH                          | Rejected                                              | PASS   |
| POST non-Pending status                                    | 400                                | Rejected; no direct Delivered creation                | PASS   |
| Malformed POST and PATCH JSON                              | 400, not 500                       | Friendly malformed-JSON errors                        | PASS   |
| Null/array/primitive bodies                                | 400                                | Rejected                                              | PASS   |
| Empty/only-server-owned PATCH                              | 400                                | Rejected as no editable change                        | PASS   |
| Quantity-only PATCH                                        | 200, preserve omissions, total $32 | Correct total and unchanged name/phone/status         | PASS   |
| Mixed invalid PATCH                                        | 400, no partial mutation           | Entire stored object unchanged                        | PASS   |
| Client id and total                                        | Server owns both                   | Supplied id ignored, total recalculated               | PASS   |
| Price update and decimal cents                             | Correct recalculation              | 2 × $8.50 = $17; 3 × $0.10 = $0.30; 3 × $0.29 = $0.87 | PASS   |
| Unsafe quantity/total                                      | 400                                | Rejected                                              | PASS   |
| Delete                                                     | 204 without body                   | Empty response text; list updated                     | PASS   |
| Read/update/delete unknown or deleted ID                   | 404 useful message                 | Correct on all three methods                          | PASS   |

The original request/response bodies and expected/actual statuses are in `evidence/api-results.json`. The independent Postman collection run is in `evidence/newman-results.json`.

## Maya’s complete acceptance sequence

1. Browser form saved Mira UI Demo, 3 Vanilla Candles at $8. POST returned 201, $24, Pending; list and counts updated.
2. Edit quantity to 4. PATCH returned 200 and $32; omitted details were preserved.
3. Edit status to Delivered. Pending returned to the seed baseline; delivered increased by one.
4. Sent quantity -2 with another editable change through the test request client. Received 400; subsequent GET was deeply equal to the prior record.
5. Sent total 0 and a forged ID with otherwise valid quantity. Server returned the original ID and $32.
6. Created Accidental UI Demo; opening confirmation and choosing Keep order sent no DELETE. Confirmed deletion returned 204 and removed the row/count.
7. GET for that deleted ID returned 404.

`evidence/browser-results.json` includes the acceptance steps, IDs, counts, request methods, and error list. This is an automated demonstration, not a claim that fictional Maya or Nour attended a real meeting.

## Frontend states and usability

| State/check         | Actual observation                                                                                                                  | Result |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Initial loading     | Delayed initial GET in browser test; loading text visible, Add disabled                                                             | PASS   |
| Pending create      | Save disabled; repeated Enter produced only one POST                                                                                | PASS   |
| Full details        | View performed GET for the selected ID; contact, product, price, quantity, total, status shown                                      | PASS   |
| Rejected form       | Whitespace customer name passed native required validation but real API returned 400; dialog and all entered values remained        | PASS   |
| List failure/retry  | Test interception supplied one labelled simulated 503; friendly message and Retry appeared, then real GET recovered                 | PASS   |
| Empty               | Deleted only known disposable demo records on isolated test instance; real GET returned []; all counts zero and empty state visible | PASS   |
| Delete confirmation | Keep sent no delete; confirm sent one successful delete                                                                             | PASS   |
| 360px layout        | No horizontal document overflow; mobile dashboard and form screenshots inspected                                                    | PASS   |
| Keyboard            | Tab/Enter opened form, labelled field focused, solid outline, modal page focus contained, Escape closed it                          | PASS   |
| Runtime             | No page JavaScript exceptions during final suite                                                                                    | PASS   |

The list failure/loading delays were deliberate browser-test interceptions and are not built-in fake API modes. Core CRUD and the rejected form used real Route Handlers. The API suite and Newman used no mocked responses.

## Restart and storage

The browser test finished by creating a uniquely identified Restart Marker Demo. The server process was stopped and started again. GET for that marker returned 404; listing returned demo-001, demo-002, demo-003. `restart-results.json` records the actual outcome. This verifies temporary single-process storage and leaves the preview with clean seed data.

## Evidence interpretation

- Endpoint images `api-get-list.png`, `api-get-one.png`, `api-post.png`, `api-patch.png`, `api-delete.png`, `api-invalid.png`, `api-not-found.png` are visual receipts rendered from actual machine-readable request results. They explicitly identify their origin and are not Postman desktop screenshots.
- `api-report.html` displays those original recorded results. `api-results.json` is the source; it was not replaced with expected-only fixtures.
- Running-app screenshots: `dashboard.png`, `initial-loading.png`, `order-created.png`, `order-delivered.png`, `rejected-form.png`, `delete-confirmation.png`, `list-error.png`, `empty.png`, `mobile.png`, `mobile-form.png`.
- Importable Postman v2.1 collection and original Newman JSON run are included. The collection was run using Postman's official Newman CLI workflow, not by clicking requests in the desktop app.

## Limits of verification

No screen-reader user test, full accessibility audit, real-client interview, optional recording, multi-instance deployment test, or durable database test was conducted. The required storage is intentionally temporary. npm audit reported moderate advisories in development lint-tool dependencies; production-only audit returned zero. No forced downgrade/breaking audit fix was applied. Newman emitted dependency deprecation warnings but passed all assertions.

## Reproduce

Follow README commands using a fresh dedicated local server. Run API and Newman suites before the browser suite. Browser verification deletes only its owned records and known seed records to prove the empty state; it refuses unexpected records. Restart the server afterward. Evidence generators and tests overwrite their own reports/screenshots when rerun.

References: [Newman installation/run](https://learning.postman.com/docs/reference/newman-cli/installing-running-newman), [Newman JSON reports](https://learning.postman.com/latest-v-12/docs/reference/newman-cli/newman-built-in-reporters).
