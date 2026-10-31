import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const report = JSON.parse(
  await readFile("docs/evidence/api-results.json", "utf8"),
);
if (report.status !== "PASS")
  throw new Error("Only completed passing results can be rendered.");
const cases = [
  ["api-get-list", "List orders"],
  ["api-get-one", "Read created order from another endpoint"],
  ["api-post", "Create trimmed order; ignore supplied id and total"],
  ["api-patch", "Partial quantity update and $32 total"],
  ["api-delete", "Delete accidental order with empty 204"],
  ["api-invalid", "Reject quantity -2 atomically"],
  ["api-not-found", "Deleted ID returns 404"],
];
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const cards = cases
  .map(([id, name]) => {
    const result = report.results.find((item) => item.name === name);
    if (!result) throw new Error("Missing actual result " + name);
    return `<article class="card" id="${id}"><div class="heading"><span>NOUR’S ORDER DESK / LIVE API VERIFICATION</span><strong>${escape(result.outcome)}</strong></div><h1>${escape(name)}</h1><p class="request"><b>${escape(result.method)}</b> ${escape(result.path)}</p><div class="statuses"><span>Expected HTTP ${result.expectedStatus}</span><span>Actual HTTP ${result.status}</span></div><h2>Request body</h2><pre>${escape(result.requestBody === null ? "No request body" : typeof result.requestBody === "string" ? result.requestBody : JSON.stringify(result.requestBody, null, 2))}</pre><h2>Actual response body</h2><pre>${escape(result.status === 204 ? "(empty body — 204 No Content)" : JSON.stringify(result.responseBody, null, 2))}</pre><p class="footnote">Generated visual receipt from actual requests to ${escape(report.base)}. Source: api-results.json. This is an automated test report, not a screenshot of the Postman desktop UI. All customer data is fictional.</p></article>`;
  })
  .join("\n");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Nour — actual API results</title><style>body{font-family:Arial,sans-serif;background:#f3f0e8;color:#302e27;padding:25px;margin:0}.card{max-width:950px;margin:0 auto 28px;background:white;border:1px solid #d6d1c7;padding:30px;border-radius:12px}.heading{display:flex;justify-content:space-between;gap:30px;font-size:11px;color:#6b6255;letter-spacing:1px}.heading strong{color:#38623f}h1{font-size:25px;margin:25px 0 18px}h2{font-size:14px;margin:22px 0 10px}.request{background:#efeee9;padding:16px;border-radius:5px;font-family:monospace;overflow-wrap:anywhere}.request b{color:#5e4530}.statuses{display:flex;gap:20px;color:#3e6646;font-size:13px}pre{font-size:13px;line-height:1.6;background:#f8f8f5;border:1px solid #e4e2dc;border-radius:5px;padding:16px;white-space:pre-wrap;overflow-wrap:anywhere}.footnote{font-size:11px;color:#7a7265;line-height:1.7;border-top:1px solid #ddd;padding-top:18px}</style><body>${cards}</body></html>`;
await writeFile("docs/evidence/api-report.html", html);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL
    ? { channel: process.env.BROWSER_CHANNEL }
    : {}),
});
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
await page.setContent(html);
for (const [id] of cases)
  await page.locator("#" + id).screenshot({ path: `docs/evidence/${id}.png` });
await browser.close();
console.log(
  "Rendered seven evidence screenshots from actual recorded HTTP results.",
);
