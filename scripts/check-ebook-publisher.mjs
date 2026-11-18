import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const realFetch = globalThis.fetch;
const oldToken = process.env.GITHUB_TOKEN;
const oldRepository = process.env.GITHUB_REPOSITORY;
const realLog = console.log;
process.env.GITHUB_TOKEN = "test-token";
process.env.GITHUB_REPOSITORY = "jh124/KP-Website";
console.log = () => {};
let snapshot;
let requests;
let published;
let mode;
let uploads;
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
globalThis.fetch = async (url, options = {}) => {
  const parsed = new URL(url);
  const method = options.method || "GET";
  requests.push({ path: parsed.pathname, method });
  assert.notEqual(method, "DELETE", "Published assets must never be deleted.");
  if (parsed.pathname.endsWith("/releases/latest")) return response(mode === "unchanged" ? snapshot : { id: 99 });
  if (parsed.pathname.includes("/releases/tags/")) return snapshot ? response(snapshot) : response({}, 404);
  if (method === "POST" && parsed.pathname.endsWith("/releases")) {
    const input = JSON.parse(options.body);
    assert.equal(input.draft, true, "Never publish before uploading all assets.");
    snapshot = { ...input, id: 123, upload_url: "https://uploads.github.com/repos/jh124/KP-Website/releases/123/assets{?name,label}", assets: [], html_url: "https://github.com/jh124/KP-Website/releases/tag/test" };
    return response(snapshot, 201);
  }
  if (method === "GET" && parsed.pathname.endsWith("/assets")) return response(snapshot.assets);
  if (method === "POST" && parsed.pathname.endsWith("/assets")) {
    uploads++;
    if (mode === "interrupted" && uploads === 3) return response({ message: "Temporary upload failure" }, 503);
    const asset = { id: uploads, name: parsed.searchParams.get("name"), size: options.body.length, state: "uploaded", download_count: 0, digest: `sha256:${createHash("sha256").update(options.body).digest("hex")}` };
    snapshot.assets.push(asset);
    return response(asset, 201);
  }
  if (method === "PATCH" && parsed.pathname.endsWith("/releases/123")) {
    const input = JSON.parse(options.body);
    assert.ok(snapshot.assets.length >= 12);
    assert.equal(input.make_latest, "true");
    snapshot = { ...snapshot, ...input };
    published = true;
    return response(snapshot);
  }
  throw new Error(`Unexpected test request: ${method} ${parsed.pathname}`);
};

async function run(name) {
  mode = name;
  requests = [];
  published = false;
  uploads = 0;
  await import(`./publish-ebooks.mjs?test=${name}-${Date.now()}`);
}

try {
  await run("initial");
  assert.equal(published, true);
  assert.equal(snapshot.draft, false);
  assert.equal(snapshot.assets.length, 12);
  snapshot.assets[0].download_count = 137;
  await run("unchanged");
  assert.equal(uploads, 0);
  assert.equal(published, false);
  assert.equal(snapshot.assets[0].download_count, 137);
  snapshot = undefined;
  await assert.rejects(run("interrupted"), /503/);
  assert.equal(published, false, "An interrupted upload must leave the prior latest release in place.");
  assert.equal(snapshot.draft, true);
  await run("resume");
  assert.equal(published, true);
  assert.equal(snapshot.assets.length, 12, "Retry should reuse the successfully uploaded files.");
  snapshot.assets[0].size = 1;
  await assert.rejects(run("mismatch"), /refusing to replace/);
  assert.equal(uploads, 0);
} finally {
  globalThis.fetch = realFetch;
  console.log = realLog;
  if (oldToken === undefined) delete process.env.GITHUB_TOKEN;
  else process.env.GITHUB_TOKEN = oldToken;
  if (oldRepository === undefined) delete process.env.GITHUB_REPOSITORY;
  else process.env.GITHUB_REPOSITORY = oldRepository;
}
console.log("Checked atomic publication, unchanged counters, interrupted uploads, safe retries, and refusal to overwrite published assets.");
