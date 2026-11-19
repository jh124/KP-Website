import path from "node:path";

export function productEbookFiles(products) {
  if (!Array.isArray(products) || !products.length) throw new Error("No products were found.");
  const files = new Set();
  for (const book of products) {
    for (const format of ["pdf", "epub"]) {
      const filename = book[format];
      if (typeof filename !== "string" || !new RegExp(`^[a-z0-9][a-z0-9-]*\\.${format}$`).test(filename)) {
        throw new Error(`Invalid ${format.toUpperCase()} filename for ${book.title}.`);
      }
      if (files.has(filename)) throw new Error(`Duplicate ebook link: ${filename}`);
      files.add(filename);
    }
  }
  return [...files].sort();
}

export function ebookFiles(html) {
  const files = new Set();
  for (const match of html.matchAll(/<a\b[^>]*>/g)) {
    const tag = match[0];
    const classes = tag.match(/\bclass="([^"]*)"/)?.[1].split(/\s+/) || [];
    if (!classes.includes("ebook-download")) continue;
    const href = tag.match(/\bhref="([^"]*)"/)?.[1];
    if (!href) throw new Error("An ebook download is missing its URL.");
    const url = new URL(href, "https://kidderminsterpress.com/");
    const filename = path.posix.basename(decodeURIComponent(url.pathname));
    if (!/^[a-z0-9][a-z0-9-]*\.(pdf|epub)$/.test(filename)) {
      throw new Error(`Unsupported ebook filename: ${filename}`);
    }
    if (files.has(filename)) throw new Error(`Duplicate ebook link: ${filename}`);
    files.add(filename);
  }
  if (!files.size) throw new Error("No ebook download links were found.");
  return [...files].sort();
}
