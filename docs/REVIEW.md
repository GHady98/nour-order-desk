# Technical review and AI reflection

Author: Ghady Nazha. Prepared with AI assistance. These answers describe the actual code and recorded automated verification; they do not invent personal manual testing or a real client meeting.

## 1. Trace one Add Order action

The Add order button mounts `OrderEditor`, whose native dialog opens and focuses Customer name. The form keeps string field values locally. Save converts quantity/price to numbers and calls `apiRequest` with POST `/api/orders`. The Route Handler parses JSON, invokes `createOrder`, validates the fields, creates a UUID, forces Pending, calculates the total, and stores the complete record. It returns that saved object with 201. The client checks response.ok, replaces/inserts that returned record into the list, selects its details, and announces the saved total. Counts derive from the updated list. On rejection, the dialog remains open and its entered values are not cleared.

The recorded browser request created three Vanilla Candles at $8. The returned $24 was displayed. The test also verified that repeated Enter while saving did not produce a second POST.

## 2. Where is total calculated, and why?

`calculateTotal` in `lib/order-validation.ts` performs integer-cent multiplication. The store calls it during creation and before committing an update. The server must own the calculation because browser state and request bodies can be changed. An HTTP request containing total 0 does not make three $8 candles free: the stored response remains $24. The client never sends its own derived total as authority.

## 3. One invalid request and its effect

PATCH the actual order ID with `{ "quantity": -2, "status": "Preparing", "customerName": "Must not save" }`. Quantity must be a positive integer, so the API returns 400. Validation creates a candidate only after every supplied field passes, and the stored map is updated in one final step. The test fetched the object before and after rejection and checked deep equality, including its previous Delivered status and customer name. No partial change occurred.

## 4. PATCH versus replacing an object

PATCH applies provided editable fields to the existing record. Sending quantity 4 preserves customer, phone, product, price, and status. Replacing an object with only that body would lose those omitted values. The allowlist also prevents ID and total from being overwritten. An empty patch, including a body containing only ignored server-owned fields, is rejected because it describes no editable change.

## 5. What happens after a server restart?

The process-global map is temporary. A restart creates the three seed records again and loses newly created orders and prior edits/deletes. This was directly verified with a unique marker: it existed before restart and returned 404 after restart. A global key shares local handler state but does not provide persistence or cross-instance synchronization.

## 6. An AI suggestion checked against evidence

Suggestion: use one process-global store rather than a separate array in each handler module, and validate a full candidate before mutating. The endpoint tests verified that POST data immediately appeared in both GET-by-ID and GET-list, and that PATCH/DELETE affected those same endpoints. They also verified that a mixed invalid update did not alter any stored field. These checks supported accepting the suggestion. No fabricated bad AI suggestion was needed.

The verification harness itself was refined after Chromium could not retrieve a 204 response body through its browser page-response API. The application already skips JSON parsing on 204. Real HTTP and Newman checks independently confirmed the empty body; the browser check verifies that confirmed deletion succeeds and the UI updates without a parsing error.

## Handoff to Nour

Start with the dashboard list. Use View for the full contact/product details, Edit order for corrections or status, and Delete this order only for accidental entries after confirmation. Prices are USD, editable unit prices allow an agreed special price, and new records start Pending. The visible footer and README explain that this local learning demo resets and must use fictional data. No real production operation or data retention is promised.
