import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { productEbookFiles } from "./ebook-files.mjs";

// Every snapshot keeps its own assets. Never delete or replace a published
// asset: its download_count is part of the all-time total.
const root = new URL("../", import.meta.url);
const repository = process.env.GITHUB_REPOSITORY || "jh124/KP-Website";
const token = process.env.GITHUB_TOKEN;
const products = JSON.parse(await readFile(new URL("data/products.json", root), "utf8"));
const filenames = productEbookFiles(products);
const snapshot = createHash("sha256");
const files = [];
for (const name of filenames) {
  const bytes = await readFile(new URL(`downloads/${name}`, root));
  const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  snapshot.update(name).update("\0").update(digest).update("\0");
  files.push({ name, bytes, digest });
}
const tag = `ebooks-${snapshot.digest("hex").slice(0, 24)}`;
if (process.argv.includes("--check")) {
  console.log(`Validated ${files.length} ebook files for ${tag}.`);
  process.exit(0);
}
if (!token) throw new Error("GITHUB_TOKEN is required to publish ebook assets.");
const api = `https://api.github.com/repos/${repository}`;

async function request(url, { method = "GET", body, type, allow404 = false } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": type || "application/json" } : {}),
    },
    body: body && (type ? body : JSON.stringify(body)),
    signal: AbortSignal.timeout(120000),
  });
  if (allow404 && response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub ${method} ${new URL(url).pathname} failed (${response.status}): ${(await response.text()).slice(0, 400)}`);
  }
  return response.status === 204 ? null : response.json();
}

let release = await request(`${api}/releases/tags/${tag}`, { allow404: true });
if (!release) {
  release = await request(`${api}/releases`, {
    method: "POST",
    body: {
      tag_name: tag,
      target_commitish: process.env.GITHUB_SHA || "main",
      name: `Ebooks · ${new Date().toISOString().slice(0, 10)}`,
      body: "Current Kidderminster Press PDF and EPUB editions. Earlier ebook releases are retained so download totals survive revisions.",
      draft: true,
      prerelease: false,
    },
  });
}

const assets = [];
for (let page = 1; ; page++) {
  const batch = await request(`${api}/releases/${release.id}/assets?per_page=100&page=${page}`);
  assets.push(...batch);
  if (batch.length < 100) break;
}
for (const file of files) {
  const existing = assets.find(asset => asset.name === file.name);
  if (existing) {
    if (existing.state !== "uploaded" || existing.size !== file.bytes.length || (existing.digest && existing.digest !== file.digest)) {
      throw new Error(`Existing asset does not match ${file.name}; refusing to replace it or reset its counter.`);
    }
    continue;
  }
  if (!release.draft) throw new Error(`Published snapshot is missing ${file.name}; refusing to modify its history.`);
  const upload = new URL(release.upload_url.replace(/\{.*$/, ""));
  upload.searchParams.set("name", file.name);
  const asset = await request(upload.href, {
    method: "POST",
    body: file.bytes,
    type: file.name.endsWith(".pdf") ? "application/pdf" : "application/epub+zip",
  });
  if (asset.state !== "uploaded" || asset.size !== file.bytes.length || (asset.digest && asset.digest !== file.digest)) {
    throw new Error(`Upload verification failed for ${file.name}.`);
  }
  console.log(`Uploaded ${file.name} (${file.bytes.length} bytes).`);
}

// Only expose the new snapshot after every download exists. Stable /latest/
// links can then switch together, without an incomplete release going live.
const latest = await request(`${api}/releases/latest`, { allow404: true });
if (release.draft || latest?.id !== release.id) {
  release = await request(`${api}/releases/${release.id}`, {
    method: "PATCH", body: { draft: false, prerelease: false, make_latest: "true" },
  });
}
console.log(`Published ${files.length} verified ebook assets: ${release.html_url}`);
