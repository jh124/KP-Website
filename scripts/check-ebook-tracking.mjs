import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ebookFiles } from "./ebook-files.mjs";
import { countDownloads, EXCLUDED_TEST_DOWNLOADS } from "../assets/ebook-counts.js";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const files = ebookFiles(html);
assert.equal(files.length, new Set(files).size);
for (const name of files) await readFile(new URL(`../downloads/${name}`, import.meta.url));
assert.deepEqual(ebookFiles('<a class="ebook-download" href="./downloads/example.pdf?v=123">PDF</a><a class="ebook-download" href="https://github.com/owner/repo/releases/latest/download/example.epub">EPUB</a>'), ["example.epub", "example.pdf"]);
const books = [{ title: "Example", pdf: "example.pdf", epub: "example.epub" }, { title: "New", pdf: "new.pdf", epub: "new.epub" }];
const asset = (id, name, download_count) => ({ id, name, download_count, state: "uploaded" });
const assets = [asset(1, "example.pdf", 7), asset(2, "example.pdf", 11), asset(3, "example.epub", 5), asset(1, "example.pdf", 7), asset(4, "other.pdf", 999)];
assert.deepEqual(countDownloads(books, assets).map(({ pdfCount, epubCount, total }) => [pdfCount, epubCount, total]), [[18, 5, 23], [0, 0, 0]]);
assert.throws(() => countDownloads(books, [asset(5, "example.pdf", -1)]));
assert.equal(Object.values(EXCLUDED_TEST_DOWNLOADS).reduce((sum, count) => sum + count, 0), 26);
// Reproduce the observed setup counters, then add a reader download. The
// exclusion stays fixed, so subsequent refreshes and editions keep counting.
const setup = [asset(764644916, "example.pdf", 4), asset(764644890, "example.epub", 2)];
assert.deepEqual(countDownloads(books, setup).map(({ total }) => total), [0, 0]);
assert.equal(countDownloads(books, [asset(764644916, "example.pdf", 5), setup[1]])[0].pdfCount, 1);
assert.equal(countDownloads(books, [asset(764644916, "example.pdf", 5), setup[1]])[0].pdfCount, 1);
assert.equal(countDownloads(books, [...setup, asset(900000001, "example.pdf", 3)])[0].pdfCount, 3);
assert.equal(countDownloads(books, [asset(900000001, "example.pdf", 3)])[0].pdfCount, 3);
assert.equal(countDownloads(books, [asset(764644916, "example.pdf", 1)])[0].total, 0);
const gate = await readFile(new URL("../records/index.html", import.meta.url), "utf8");
assert.match(gate, /noindex, nofollow/);
assert.match(gate, /no-referrer/);
assert.doesNotMatch(html, /(?:records\/|unlock\.js|report\.enc\.json)/);
const sealed = JSON.parse(await readFile(new URL("../records/report.enc.json", import.meta.url), "utf8"));
assert.equal(sealed.version, 1);
assert.equal(Buffer.from(sealed.iv, "base64url").length, 12);
assert.ok(Buffer.from(sealed.data, "base64url").length > 16);
assert.equal(Object.hasOwn(sealed, "key"), false);
console.log(`Checked ${files.length} ebook links, retained-edition totals, the 26 fixed test exclusions, future downloads, and the sealed dashboard.`);
