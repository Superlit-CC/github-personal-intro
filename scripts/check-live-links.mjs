import assert from "node:assert/strict";

const home = new URL(process.argv[2] ?? "http://127.0.0.1:4321/");
const queue = [home.href];
const checked = new Set();
for (const href of queue) {
  if (checked.has(href)) continue;
  checked.add(href);
  const response = await fetch(href);
  assert.equal(response.status, 200, `Broken page or resource: ${href}`);
  if (!response.headers.get("content-type")?.includes("text/html")) continue;
  const html = await response.text();
  for (const [, path] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = new URL(path, response.url);
    if (url.origin !== home.origin) continue;
    url.hash = "";
    queue.push(url.href);
  }
}
console.log(`Live checks passed: ${checked.size} pages and resources at ${home.href}`);
