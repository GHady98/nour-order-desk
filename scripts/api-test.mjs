import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const base = process.env.BASE_URL || "http://127.0.0.1:3007";
const results = [];
const owned = [];
async function call(method, path, body, raw = false) {
  const response = await fetch(base + path, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return {
    method,
    path,
    requestBody: body ?? null,
    status: response.status,
    responseBody: data,
    responseText: text,
  };
}
async function check(name, method, path, body, status, verify, raw = false) {
  const actual = await call(method, path, body, raw);
  assert.equal(actual.status, status, `${name}: ${actual.responseText}`);
  if (verify) verify(actual.responseBody, actual);
  results.push({ name, expectedStatus: status, outcome: "PASS", ...actual });
  return actual.responseBody;
}
const valid = {
  customerName: "  Mira API Demo  ",
  phone: "  DEMO-API-001  ",
  productName: "  Vanilla Candle  ",
  quantity: 3,
  unitPrice: 8,
};
try {
  await check("List orders", "GET", "/api/orders", undefined, 200, (data) =>
    assert.ok(Array.isArray(data)),
  );
  const order = await check(
    "Create trimmed order; ignore supplied id and total",
    "POST",
    "/api/orders",
    { ...valid, id: "client-id", total: 0 },
    201,
    (data) => {
      assert.equal(data.total, 24);
      assert.equal(data.status, "Pending");
      assert.equal(data.customerName, "Mira API Demo");
      assert.equal(data.phone, "DEMO-API-001");
      assert.equal(data.productName, "Vanilla Candle");
      assert.notEqual(data.id, "client-id");
    },
  );
  owned.push(order.id);
  await check(
    "Read created order from another endpoint",
    "GET",
    `/api/orders/${order.id}`,
    undefined,
    200,
    (data) => assert.deepEqual(data, order),
  );
  await check(
    "Created order appears in list",
    "GET",
    "/api/orders",
    undefined,
    200,
    (data) => assert.ok(data.some((item) => item.id === order.id)),
  );
  const minusName = { ...valid };
  delete minusName.customerName;
  await check(
    "Missing customer name",
    "POST",
    "/api/orders",
    minusName,
    400,
    (data) => assert.match(data.message, /customerName/),
  );
  await check(
    "Blank customer name",
    "POST",
    "/api/orders",
    { ...valid, customerName: "   " },
    400,
  );
  await check(
    "Blank phone",
    "POST",
    "/api/orders",
    { ...valid, phone: "  " },
    400,
  );
  await check(
    "Numeric phone stays invalid",
    "POST",
    "/api/orders",
    { ...valid, phone: 12345 },
    400,
  );
  await check(
    "Blank product",
    "POST",
    "/api/orders",
    { ...valid, productName: "" },
    400,
  );
  for (const quantity of [0, -1, 1.5, "3", null])
    await check(
      `Invalid quantity ${JSON.stringify(quantity)}`,
      "POST",
      "/api/orders",
      { ...valid, quantity },
      400,
    );
  for (const unitPrice of [-1, "8", 8.001, null])
    await check(
      `Invalid unitPrice ${JSON.stringify(unitPrice)}`,
      "POST",
      "/api/orders",
      { ...valid, unitPrice },
      400,
    );
  await check(
    "Unknown field rejected",
    "POST",
    "/api/orders",
    { ...valid, typo: "value" },
    400,
  );
  await check(
    "POST cannot skip Pending",
    "POST",
    "/api/orders",
    { ...valid, status: "Delivered" },
    400,
  );
  await check(
    "Malformed POST JSON",
    "POST",
    "/api/orders",
    '{"customerName":',
    400,
    (data) => assert.match(data.message, /Malformed JSON/),
    true,
  );
  for (const body of [null, [], "hello"])
    await check(
      `Non-object body ${JSON.stringify(body)}`,
      "POST",
      "/api/orders",
      body,
      400,
    );
  const path = `/api/orders/${order.id}`;
  await check(
    "Partial quantity update and $32 total",
    "PATCH",
    path,
    { quantity: 4 },
    200,
    (data) => {
      assert.equal(data.total, 32);
      assert.equal(data.customerName, order.customerName);
      assert.equal(data.phone, order.phone);
      assert.equal(data.status, "Pending");
    },
  );
  const delivered = await check(
    "Change status to Delivered",
    "PATCH",
    path,
    { status: "Delivered" },
    200,
    (data) => {
      assert.equal(data.total, 32);
      assert.equal(data.status, "Delivered");
    },
  );
  await check(
    "Reject quantity -2 atomically",
    "PATCH",
    path,
    { quantity: -2, status: "Preparing", customerName: "Must not save" },
    400,
  );
  await check(
    "Rejected update leaves stored record unchanged",
    "GET",
    path,
    undefined,
    200,
    (data) => assert.deepEqual(data, delivered),
  );
  await check("Reject Flying status", "PATCH", path, { status: "Flying" }, 400);
  await check("Reject empty PATCH", "PATCH", path, {}, 400);
  await check(
    "Reject server-owned-only PATCH",
    "PATCH",
    path,
    { id: "hijack", total: 0 },
    400,
  );
  await check(
    "Malformed PATCH JSON",
    "PATCH",
    path,
    '{"quantity":',
    400,
    (data) => assert.match(data.message, /Malformed JSON/),
    true,
  );
  await check(
    "ID and total cannot be overwritten",
    "PATCH",
    path,
    { id: "hijack", total: 0, quantity: 3 },
    200,
    (data) => {
      assert.equal(data.id, order.id);
      assert.equal(data.total, 24);
      assert.equal(data.status, "Delivered");
    },
  );
  await check(
    "Price update recalculates total",
    "PATCH",
    path,
    { quantity: 2, unitPrice: 8.5 },
    200,
    (data) => assert.equal(data.total, 17),
  );
  const before = await call("GET", path);
  await check(
    "Reject mixed invalid price atomically",
    "PATCH",
    path,
    { customerName: "Must not save", unitPrice: 1.234 },
    400,
  );
  await check(
    "Mixed invalid update unchanged",
    "GET",
    path,
    undefined,
    200,
    (data) => assert.deepEqual(data, before.responseBody),
  );
  await check(
    "Exact-cent arithmetic",
    "PATCH",
    path,
    { quantity: 3, unitPrice: 0.1 },
    200,
    (data) => assert.equal(data.total, 0.3),
  );
  await check(
    "Decimal 0.29 remains valid",
    "PATCH",
    path,
    { unitPrice: 0.29 },
    200,
    (data) => assert.equal(data.total, 0.87),
  );
  await check(
    "Reject unsafe quantity",
    "PATCH",
    path,
    { quantity: Number.MAX_SAFE_INTEGER + 1 },
    400,
  );
  await check(
    "Reject unsafe total",
    "PATCH",
    path,
    { quantity: Number.MAX_SAFE_INTEGER, unitPrice: 10 },
    400,
  );
  const accidental = await check(
    "Create unique accidental order",
    "POST",
    "/api/orders",
    { ...valid, customerName: "Accidental API Demo" },
    201,
    (data) => assert.notEqual(data.id, order.id),
  );
  owned.push(accidental.id);
  await check(
    "Delete accidental order with empty 204",
    "DELETE",
    `/api/orders/${accidental.id}`,
    undefined,
    204,
    (_data, actual) => assert.equal(actual.responseText, ""),
  );
  await check(
    "Deleted ID returns 404",
    "GET",
    `/api/orders/${accidental.id}`,
    undefined,
    404,
    (data) => assert.match(data.message, /not found/),
  );
  for (const method of ["GET", "PATCH", "DELETE"])
    await check(
      `${method} unknown ID`,
      method,
      "/api/orders/not-an-order",
      method === "PATCH" ? { quantity: 2 } : undefined,
      404,
      (data) => assert.ok(data.message),
    );
  await check(
    "Delete primary test record",
    "DELETE",
    path,
    undefined,
    204,
    (_data, actual) => assert.equal(actual.responseText, ""),
  );
  await writeFile(
    "docs/evidence/api-results.json",
    JSON.stringify(
      { base, checks: results.length, status: "PASS", results },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `PASS: ${results.length} live API checks, including complete acceptance sequence, shared storage, atomic rejection, ID/total protection and empty 204.`,
  );
} catch (error) {
  await writeFile(
    "docs/evidence/api-results.json",
    JSON.stringify(
      { base, status: "FAIL", error: String(error), results },
      null,
      2,
    ) + "\n",
  );
  throw error;
} finally {
  for (const id of owned)
    await fetch(base + `/api/orders/${id}`, { method: "DELETE" });
}
