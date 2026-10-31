# API contract

Base URL for local verification: `http://127.0.0.1:3007`.

No authentication or durable storage is part of this fictional learning app. Request and error bodies use JSON. Successful DELETE is the exception: 204 has no body. Responses send `Cache-Control: no-store`.

## Order shape

```json
{
  "id": "server-generated-uuid",
  "customerName": "Mira Demo",
  "phone": "DEMO-004",
  "productName": "Vanilla Candle",
  "quantity": 3,
  "unitPrice": 8,
  "total": 24,
  "status": "Pending"
}
```

All amounts are USD; the UI displays two decimal places. JSON uses numbers, so `24` and `24.00` are the same numeric value.

## Endpoints

| Method | Path              | Success                     | Errors                                 |
| ------ | ----------------- | --------------------------- | -------------------------------------- |
| GET    | `/api/orders`     | 200, array (possibly empty) | 500 only for unexpected failures       |
| GET    | `/api/orders/:id` | 200, matching order         | 404                                    |
| POST   | `/api/orders`     | 201, saved server object    | 400 invalid input/JSON                 |
| PATCH  | `/api/orders/:id` | 200, saved server object    | 400 invalid input/JSON; 404 missing ID |
| DELETE | `/api/orders/:id` | 204, empty body             | 404                                    |

The `[id]` folder defines a dynamic segment. Awaited route params supply the actual string ID. Unsupported methods receive Next.js's standard 405 response.

## Create an order

POST `/api/orders` with `Content-Type: application/json`:

```json
{
  "customerName": "Mira Demo",
  "phone": "DEMO-004",
  "productName": "Vanilla Candle",
  "quantity": 3,
  "unitPrice": 8
}
```

The response is 201 and includes a fresh UUID, `total: 24`, and `status: "Pending"`. An optional supplied status must be Pending; requests to create directly as Preparing/Delivered are rejected. Client `id` and `total` values are ignored, including a forged `total: 0`. Unknown fields are rejected with 400 to catch typos.

## Partial update

PATCH `/api/orders/<actual-id>`:

```json
{ "quantity": 4 }
```

Returns 200 with `total: 32`; customer, phone, product, price, and status remain unchanged.

```json
{ "status": "Delivered" }
```

Only status changes; total is recomputed from the preserved quantity/price. Any supported status can be selected, including reversing to Pending. No delivery/payment workflow is implied.

## Validation rules

- Body must be a JSON object, not null, an array, or a primitive.
- `customerName`, `phone`, `productName`: required on create; supplied values must be strings, trimmed, and nonblank. Phone is text; no real phone-format requirement is added.
- `quantity`: number, positive safe integer, minimum 1. Numeric strings, fractions, zero, and negatives are rejected.
- `unitPrice`: finite nonnegative number, at most two decimals, representable in safe integer cents. Numeric strings, null, negatives, excess decimals, and invalid numeric JSON are rejected.
- `status`: Pending, Preparing, or Delivered; create always starts Pending.
- PATCH accepts only the supplied editable fields and preserves omissions. At least one editable field is required. A body containing only ignored `id`/`total` is an empty update and returns 400.
- `id` and `total` never enter the update candidate from the body.
- A total outside the supported exact-cent range returns 400. There is no arbitrary business maximum beyond safe numeric representation.

All validation completes before the single store mutation. A mixed request such as `{ "customerName": "Must not save", "quantity": -2 }` changes nothing.

## Money calculation

The server converts valid unit price to cents with `Math.round(unitPrice * 100)`, multiplies by validated quantity, checks the result is a safe integer, and divides by 100 for the response. This keeps cases such as 3 × $0.10 at $0.30 rather than leaking multiplication noise into a stored total. Supplied prices with more than two decimals are rejected rather than silently rounded. The client never submits a calculated total.

## Errors

```json
{ "message": "quantity must be a positive safe integer (at least 1)." }
```

HTTP 400. Missing IDs use:

```json
{ "message": "Order not found. Refresh the list to see current orders." }
```

HTTP 404. Malformed JSON returns a friendly 400, not an unhandled 500. PATCH first checks record existence, so a missing ID returns 404 even if its request body is invalid. Unexpected errors use a safe generic 500 message.

## Storage and frontend reconciliation

All handlers import one store module, backed by `globalThis.nourOrderDeskStore`. This avoids separate arrays in independently compiled endpoint modules. It remains process-local and temporary; restarts restore the three seeds. Responses are copied out of the store.

The browser uses GET for list/details, POST/PATCH for saves, and DELETE for confirmed removal. It inserts/replaces the returned saved object rather than trusting unsaved input. Summary counts are derived from that same current list. Delete removes the matching row only after a successful 204; no empty JSON body is parsed.

## Reproducible client collection

Import `Nour-Order-Desk.postman_collection.json`, or run it with Newman as documented in README. It uses a `baseUrl` collection variable and stores its newly created ID for subsequent read/update/delete requests. It never needs credentials. The recorded run is `evidence/newman-results.json`.
