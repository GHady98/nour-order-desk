# Nour’s Order Desk — implementation plan

Author: Ghady Nazha. Date: 31 October 2026.

## Client problem and scope

Nour’s fictional candle orders are scattered across conversations. One dashboard should let her list, inspect, add, correct, change status, and delete an accidental one-product order through a real API. Summary counts derive from the returned orders. No real customer data, accounts, database, payments, inventory, or social integrations.

Catalogue examples: Vanilla Candle ($8), Cedar Candle ($10), Mini Gift Candle ($6), all USD. Unit price remains editable. Statuses: Pending, Preparing, Delivered. New records always start Pending.

## Contract and endpoints

Order: server-generated string id, trimmed nonblank customerName/phone/productName, positive integer quantity, finite nonnegative unitPrice with at most two decimals, server-calculated total, allowed status.

- GET /api/orders → 200 array
- GET /api/orders/[id] → 200 object, or 404
- POST /api/orders → 201 saved object
- PATCH /api/orders/[id] → 200 saved object, preserving omitted fields
- DELETE /api/orders/[id] → 204 without a body

Malformed JSON/invalid input → 400 with useful message. Unknown ID → 404. Validate a whole candidate before mutating. Allowlist editable fields and never trust client id/total. Compute amounts in integer cents and reject unsafe/unrepresentable amounts rather than silently overflowing. All handlers share one process-local store; data is temporary and can reset after restart or development reload.

## Implementation steps

1. Initialize separate repository and assignment-4-nour-order-desk before feature implementation; record this plan.
2. Build typed contract, validation, shared in-memory store, and five Route Handlers.
3. Build responsive dashboard with API-driven list/detail/create/edit/delete, summary counts, pending/loading/empty/error states, and accessible labelled controls.
4. Run real endpoint tests for the acceptance sequence and all specified invalid cases. Prepare a Postman collection and retain actual request/response results.
5. Test the browser workflow, preserved forms on rejection, confirmed deletion, error recovery, keyboard operation, and 360px layout; capture evidence.
6. Run lint/build, document actual outcomes and review explanations, commit, and publish the assignment branch. Retain honest limitations and authorship; never invent student feedback or manual-tool evidence.

## Verification boundaries

Tests are not run yet at this planning checkpoint. API requests will be exercised against a running local server. Automated verification and an importable collection will not be described as a manual Postman run unless one actually occurs. The optional recording is not required.

Source: https://husky-wolf-c92.notion.site/Assignment-4-Nour-s-Order-Desk-406787fb1cd081cfa8ded0e3fc189451
