import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isLordsDay } from "../assets/products.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const products = JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));
assert.equal(products.length, 6);
assert.equal(new Set(products.map(book => book.slug)).size, products.length);
const paths = ["index.html", "about/index.html", "confessions/index.html", ...products.map(book => `books/${book.slug}/index.html`)];
const htmlByFile = new Map(await Promise.all(paths.map(async filename => {
  const file = path.join(root, filename);
  return [file, await readFile(file, "utf8")];
})));
const titles = new Set();
let checkedLinks = 0;
for (const [file, html] of htmlByFile) {
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  assert.ok(title);
  assert.ok(!titles.has(title), `Duplicate page title: ${title}`);
  titles.add(title);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `Expected one H1: ${file}`);
  assert.doesNotMatch(html, /class="catalogue-category"|class="catalogue-price"|class="book-detail-link"|href="[^"]*#ebooks"[^>]*>Ebooks</);
  assert.match(html, /<meta name="description" content="[^"]+">/);
  assert.doesNotMatch(html, /name="robots" content="noindex|kp-preview-mode|preview-banner|data-preview-form|Purchasing is disabled in this preview\./);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `Duplicate IDs: ${file}`);
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const href = match[1].replaceAll("&amp;", "&");
    if (/^(?:https?:|mailto:|data:|tel:)/.test(href)) continue;
    const url = new URL(href, `https://preview.test/${path.relative(root, file)}`);
    let target = path.join(root, decodeURIComponent(url.pathname));
    if (url.pathname.endsWith("/")) target = path.join(target, "index.html");
    await access(target);
    if (url.hash) {
      const targetHtml = htmlByFile.get(target) ?? await readFile(target, "utf8");
      assert.ok(targetHtml.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `Missing anchor: ${href} in ${file}`);
    }
    checkedLinks++;
  }
}
for (const book of products) {
  const html = htmlByFile.get(path.join(root, `books/${book.slug}/index.html`));
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const info = schema["@graph"].find(item => Array.isArray(item["@type"]) && item["@type"].includes("Book"));
  assert.equal(info.name, book.title);
  assert.equal(info.offers.price, book.price);
  assert.equal(info.offers.priceCurrency, "USD");
  assert.equal(info.numberOfPages, book.printPages);
  assert.deepEqual(info.editor.map(editor => editor.name), book.editors);
  if (book.luluCartWidget) {
    assert.ok(html.includes(`buy-button-id="${book.luluCartWidget.buyButtonId}" variant="button-only"></lulu-buy-button>`));
    assert.doesNotMatch(html, /<button class="add-to-cart"/);
  } else {
    assert.match(html, /<button class="add-to-cart"[^>]+disabled/);
    assert.doesNotMatch(html, /<lulu-buy-button/);
  }
  assert.ok(html.includes(`data-lulu-slot="${book.slug}"`));
  assert.match(html, /<lulu-buy-button data-purchase-controls /);
  assert.match(html, /class="purchase-widget-slot"[^>]*><lulu-buy-button[^>]*>[\s\S]*?<\/lulu-buy-button><p class="lords-day-message"/);
  assert.doesNotMatch(html, /<(?:main|article|section|div)\b[^>]*data-purchase-controls/);
  assert.doesNotMatch(html, /product-showcase/);
  assert.doesNotMatch(html, /class="product-lede"|class="contents-list|<details class="edition-disclosure"/);
  const editionDetails = html.match(/<dl class="edition-details">([\s\S]*?)<\/dl>/)?.[1];
  assert.ok(editionDetails);
  assert.deepEqual([...editionDetails.matchAll(/<dt>(.*?)<\/dt>/g)].map(match => match[1]), ["Format", "Page count", "Trim size", "First published", "This edition published"]);
  assert.ok(book.trimSize && book.originalPublication && book.editionPublicationYear);
  for (const format of ["pdf", "epub"]) {
    assert.ok(html.includes(`https://github.com/jh124/KP-Website/releases/latest/download/${book[format]}`));
    await access(path.join(root, "downloads", book[format]));
  }
  for (const slug of book.related) assert.ok(products.some(other => other.slug === slug));
}
const homepage = htmlByFile.get(path.join(root, "index.html"));
assert.doesNotMatch(homepage, /id="ebooks"|class="ebook-download"|English Presbyterian and Reformed works, in print and as free ebooks\.|Six editions · All available as free ebooks/);
assert.equal(isLordsDay(new Date(2026, 10, 22, 12)), true);
assert.equal(isLordsDay(new Date(2026, 10, 23, 12)), false);
assert.equal(isLordsDay(new Date(2026, 10, 21, 12)), false);
const js = await readFile(path.join(root, "assets/products.js"), "utf8");
assert.match(js, /visibilitychange/);
assert.match(js, /midnight\.setHours\(24, 0, 0, 0\)/);
assert.match(js, /data-lords-day-message/);
const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
for (const book of products) assert.ok(sitemap.includes(`/books/${book.slug}/`));
assert.doesNotMatch(sitemap, /records/);
for (const file of ["index.html", "about/index.html"]) {
  const html = htmlByFile.get(path.join(root, file));
  assert.match(html, /action="https:\/\/assets\.mailerlite\.com\//);
  assert.match(html, /groot\.mailerlite\.com\/js\/w\/webforms/);
}
console.log(`Verified ${products.length} production product pages, unique metadata, prices, credits, ${checkedLinks} local links/assets/anchors, release downloads, live purchase widgets, mailing forms, and Sunday purchasing policy.`);
