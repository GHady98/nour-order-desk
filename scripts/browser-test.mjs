import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.BASE_URL || "http://127.0.0.1:3007";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL
    ? { channel: process.env.BROWSER_CHANNEL }
    : {}),
});
const page = await browser.newPage({ viewport: { width: 1365, height: 1000 } });
const errors = [];
const requests = [];
const owned = [];
const proof = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (request.url().startsWith(base + "/api/orders"))
    requests.push({ method: request.method(), url: request.url() });
});
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let initial = true;
await page.route("**/api/orders", async (route) => {
  if (initial && route.request().method() === "GET") {
    initial = false;
    await pause(500);
  }
  await route.continue();
});
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.getByText("Gathering your orders…", { exact: true }).waitFor();
assert.ok(
  await page
    .getByRole("button", { name: "Add order", exact: true })
    .isDisabled(),
);
await page.screenshot({
  path: "docs/evidence/initial-loading.png",
  fullPage: true,
  caret: "initial",
});
await page
  .getByText("Gathering your orders…", { exact: true })
  .waitFor({ state: "hidden" });
const baseline = await (await page.request.get(base + "/api/orders")).json();
assert.ok(
  baseline.every((order) =>
    ["demo-001", "demo-002", "demo-003"].includes(order.id),
  ),
  "Only disposable demo seed data may be present in this test server.",
);
const baselinePending = baseline.filter(
  (order) => order.status === "Pending",
).length;
const baselineDelivered = baseline.filter(
  (order) => order.status === "Delivered",
).length;
const count = async (testId) =>
  Number(await page.getByTestId(testId).innerText());
assert.equal(await count("total-count"), baseline.length);
await page.screenshot({
  path: "docs/evidence/dashboard.png",
  fullPage: true,
  caret: "initial",
});
async function fill(customer, quantity = "3") {
  await page.getByLabel("Customer name", { exact: true }).fill(customer);
  await page
    .getByLabel("Phone / demo contact", { exact: true })
    .fill("DEMO-UI-001");
  await page
    .getByLabel("Product", { exact: true })
    .selectOption("Vanilla Candle");
  await page.getByLabel("Quantity", { exact: true }).fill(quantity);
  await page.getByLabel("Unit price (USD)", { exact: true }).fill("8");
}
await page.getByRole("button", { name: "Add order", exact: true }).click();
await page.getByRole("dialog").waitFor();
assert.equal(await page.locator(":focus").getAttribute("id"), "customerName");
await fill("Mira UI Demo");
await page.route("**/api/orders", async (route) => {
  if (route.request().method() === "POST") await pause(400);
  await route.fallback();
});
let responsePromise = page.waitForResponse(
  (response) =>
    response.url() === base + "/api/orders" &&
    response.request().method() === "POST",
);
await page.getByRole("button", { name: "Save order", exact: true }).click();
assert.ok(await page.getByRole("button", { name: "Saving…" }).isDisabled());
await page.keyboard.press("Enter");
await page.keyboard.press("Enter");
const createdResponse = await responsePromise;
assert.equal(createdResponse.status(), 201);
const created = await createdResponse.json();
owned.push(created.id);
assert.equal(created.total, 24);
assert.equal(created.status, "Pending");
await page.getByRole("dialog").waitFor({ state: "hidden" });
assert.equal(requests.filter((item) => item.method === "POST").length, 1);
assert.equal(await count("total-count"), baseline.length + 1);
assert.equal(await count("pending-count"), baselinePending + 1);
await page
  .getByRole("button", { name: "View order for Mira UI Demo", exact: true })
  .click();
await page
  .getByRole("heading", { name: "Mira UI Demo", exact: true })
  .waitFor();
assert.ok(
  requests.some(
    (item) => item.method === "GET" && item.url.endsWith("/" + created.id),
  ),
);
await page.screenshot({
  path: "docs/evidence/order-created.png",
  fullPage: true,
  caret: "initial",
});
await page.getByRole("button", { name: "Edit order", exact: true }).click();
await page.getByLabel("Quantity", { exact: true }).fill("4");
responsePromise = page.waitForResponse(
  (response) =>
    response.url() === base + "/api/orders/" + created.id &&
    response.request().method() === "PATCH",
);
await page.getByRole("button", { name: "Save changes", exact: true }).click();
const quantityResponse = await responsePromise;
assert.equal(quantityResponse.status(), 200);
assert.equal((await quantityResponse.json()).total, 32);
await page.getByRole("dialog").waitFor({ state: "hidden" });
assert.match(await page.locator(".detail-total").innerText(), /\$32\.00/);
await page.getByRole("button", { name: "Edit order", exact: true }).click();
await page.getByLabel("Status", { exact: true }).selectOption("Delivered");
await page.getByRole("button", { name: "Save changes", exact: true }).click();
await page.getByRole("dialog").waitFor({ state: "hidden" });
assert.equal(await count("pending-count"), baselinePending);
assert.equal(await count("delivered-count"), baselineDelivered + 1);
await page.screenshot({
  path: "docs/evidence/order-delivered.png",
  fullPage: true,
  caret: "initial",
});
const beforeInvalid = await (
  await page.request.get(base + "/api/orders/" + created.id)
).json();
const invalid = await page.request.patch(base + "/api/orders/" + created.id, {
  data: { quantity: -2, status: "Preparing" },
});
assert.equal(invalid.status(), 400);
assert.deepEqual(
  await (await page.request.get(base + "/api/orders/" + created.id)).json(),
  beforeInvalid,
);
const protectedTotal = await page.request.patch(
  base + "/api/orders/" + created.id,
  { data: { quantity: 4, total: 0, id: "client-id" } },
);
assert.equal(protectedTotal.status(), 200);
const protectedBody = await protectedTotal.json();
assert.equal(protectedBody.total, 32);
assert.equal(protectedBody.id, created.id);
proof.push(
  {
    step: "3 Vanilla candles at $8",
    status: 201,
    total: 24,
    orderId: created.id,
  },
  { step: "Quantity 4", total: 32 },
  {
    step: "Delivered",
    pending: baselinePending,
    delivered: baselineDelivered + 1,
  },
  { step: "Invalid quantity -2", status: invalid.status(), unchanged: true },
  {
    step: "Forged total and ID",
    status: protectedTotal.status(),
    total: protectedBody.total,
    idUnchanged: true,
  },
);
await page.getByRole("button", { name: "Add order", exact: true }).click();
await fill("Accidental UI Demo");
responsePromise = page.waitForResponse(
  (response) =>
    response.url() === base + "/api/orders" &&
    response.request().method() === "POST",
);
await page.getByRole("button", { name: "Save order", exact: true }).click();
const accidental = await (await responsePromise).json();
owned.push(accidental.id);
await page.getByRole("dialog").waitFor({ state: "hidden" });
await page
  .getByRole("button", { name: "Delete this order", exact: true })
  .click();
await page.getByRole("dialog", { name: "Delete this order?" }).waitFor();
await page.screenshot({
  path: "docs/evidence/delete-confirmation.png",
  fullPage: true,
  caret: "initial",
});
const deletesBefore = requests.filter(
  (item) => item.method === "DELETE",
).length;
await page.getByRole("button", { name: "Keep order", exact: true }).click();
await page.getByRole("dialog").waitFor({ state: "hidden" });
assert.equal(
  requests.filter((item) => item.method === "DELETE").length,
  deletesBefore,
);
await page
  .getByRole("button", { name: "Delete this order", exact: true })
  .click();
responsePromise = page.waitForResponse(
  (response) =>
    response.url() === base + "/api/orders/" + accidental.id &&
    response.request().method() === "DELETE",
);
await page.getByRole("button", { name: "Delete order", exact: true }).click();
const deleteResponse = await responsePromise;
assert.equal(deleteResponse.status(), 204);
assert.ok(
  !deleteResponse.headers()["content-length"] ||
    deleteResponse.headers()["content-length"] === "0",
);
await page.getByRole("dialog").waitFor({ state: "hidden" });
assert.equal(await count("total-count"), baseline.length + 1);
assert.equal(
  (await page.request.get(base + "/api/orders/" + accidental.id)).status(),
  404,
);
proof.push({
  step: "Delete accidental order",
  status: 204,
  body: "",
  remainingTotal: baseline.length + 1,
  readAfterDelete: 404,
});
await page.getByRole("button", { name: "Add order", exact: true }).click();
await fill("   ");
responsePromise = page.waitForResponse(
  (response) =>
    response.url() === base + "/api/orders" &&
    response.request().method() === "POST",
);
await page.getByRole("button", { name: "Save order", exact: true }).click();
assert.equal((await responsePromise).status(), 400);
await page
  .getByRole("alert")
  .filter({ hasText: "customerName must be nonblank text." })
  .waitFor();
assert.ok(await page.getByRole("dialog").isVisible());
assert.equal(
  await page.getByLabel("Customer name", { exact: true }).inputValue(),
  "   ",
);
assert.equal(
  await page.getByLabel("Phone / demo contact", { exact: true }).inputValue(),
  "DEMO-UI-001",
);
assert.equal(
  await page.getByLabel("Quantity", { exact: true }).inputValue(),
  "3",
);
await page.screenshot({
  path: "docs/evidence/rejected-form.png",
  fullPage: true,
  caret: "initial",
});
await page.getByRole("button", { name: "Cancel", exact: true }).click();
let failNext = true;
await page.route("**/api/orders", async (route) => {
  if (failNext && route.request().method() === "GET") {
    failNext = false;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Simulated list outage for browser verification.",
      }),
    });
  } else await route.fallback();
});
await page.getByRole("button", { name: "Refresh orders", exact: true }).click();
await page
  .getByRole("button", { name: "Retry loading orders", exact: true })
  .waitFor();
await page.screenshot({
  path: "docs/evidence/list-error.png",
  fullPage: true,
  caret: "initial",
});
await page
  .getByRole("button", { name: "Retry loading orders", exact: true })
  .click();
await page
  .getByRole("button", { name: "Retry loading orders", exact: true })
  .waitFor({ state: "hidden" });
await page.setViewportSize({ width: 360, height: 800 });
await page.screenshot({
  path: "docs/evidence/mobile.png",
  fullPage: true,
  caret: "initial",
});
assert.ok(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
await page.reload({ waitUntil: "networkidle" });
await page.keyboard.press("Tab");
assert.equal(await page.locator(":focus").innerText(), "Skip to order desk");
await page.keyboard.press("Tab");
assert.match(await page.locator(":focus").innerText(), /Add order/);
await page.keyboard.press("Enter");
await page.getByRole("dialog").waitFor();
assert.equal(await page.locator(":focus").getAttribute("id"), "customerName");
assert.equal(
  await page
    .locator(":focus")
    .evaluate((node) => getComputedStyle(node).outlineStyle),
  "solid",
);
for (let index = 0; index < 18; index++) {
  await page.keyboard.press("Tab");
  assert.ok(
    await page.evaluate(
      () =>
        document.activeElement === document.body ||
        Boolean(document.activeElement?.closest("dialog")),
    ),
    "native dialog must contain focus within the document; browser chrome may receive Tab",
  );
}
if (await page.evaluate(() => document.activeElement === document.body))
  await page.keyboard.press("Tab");
await page.screenshot({
  path: "docs/evidence/mobile-form.png",
  fullPage: true,
  caret: "initial",
});
assert.ok(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
await page.keyboard.press("Escape");
await page.getByRole("dialog").waitFor({ state: "hidden" });
const disposableIds = new Set([...baseline.map((order) => order.id), ...owned]);
const current = await (await page.request.get(base + "/api/orders")).json();
assert.ok(
  current.every((order) => disposableIds.has(order.id)),
  "Do not delete any unexpected record.",
);
for (const order of current)
  assert.equal(
    (await page.request.delete(base + "/api/orders/" + order.id)).status(),
    204,
  );
await page.getByRole("button", { name: "Refresh orders", exact: true }).click();
await page
  .getByRole("heading", { name: "A fresh page for the studio.", exact: true })
  .waitFor();
assert.equal(await count("total-count"), 0);
assert.equal(await count("pending-count"), 0);
assert.equal(await count("delivered-count"), 0);
await page.screenshot({
  path: "docs/evidence/empty.png",
  fullPage: true,
  caret: "initial",
});
const markerResponse = await page.request.post(base + "/api/orders", {
  data: {
    customerName: "Restart Marker Demo",
    phone: "DEMO-RESTART",
    productName: "Cedar Candle",
    quantity: 1,
    unitPrice: 10,
  },
});
assert.equal(markerResponse.status(), 201);
const marker = await markerResponse.json();
await writeFile(
  "docs/evidence/restart-marker.json",
  JSON.stringify({ id: marker.id }, null, 2) + "\n",
);
assert.deepEqual(errors, []);
await writeFile(
  "docs/evidence/browser-results.json",
  JSON.stringify(
    {
      status: "PASS",
      baselineCount: baseline.length,
      acceptance: proof,
      checks: [
        "initial loading",
        "no duplicate POST",
        "GET detail",
        "create/edit/status through API",
        "summary counts",
        "atomic 400",
        "server ID/total protection",
        "confirmed 204 delete",
        "deleted 404",
        "preserved rejected form",
        "list error/retry simulation",
        "actual empty store",
        "360px layout",
        "keyboard and native-dialog focus trap",
      ],
      pageErrors: errors,
      requests,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "PASS: complete acceptance flow; request states, preserved rejection, delete cancellation/204, real empty store, mobile and keyboard. Restart marker recorded for separate restart check.",
);
await browser.close();
