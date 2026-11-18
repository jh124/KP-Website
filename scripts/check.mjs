import { readFile, access } from "node:fs/promises";
import { validateBooks } from "../assets/catalogue.js";
import { checkConfessions } from "./check-confessions.mjs";

const root = new URL("../", import.meta.url);
const books = validateBooks(JSON.parse(await readFile(new URL("data/books.json", root), "utf8")));
for (const page of ["index.html", "confessions/index.html"]) {
  const pageUrl = new URL(page, root);
  const html = await readFile(pageUrl, "utf8");
  for (const match of html.matchAll(/(?:href|src)="(\.\.?\/[^"#]*)"/g)) {
    await access(new URL(match[1].split(/[?#]/)[0], pageUrl));
  }
}
for (const book of books) {
  for (const url of [book.pdfUrl, book.checkoutUrl].filter(Boolean)) {
    if (!/^(?:https?:)?\/\//i.test(url)) {
      if (url.startsWith("/")) throw new Error(`Use a relative path for ${book.title}, so it works on GitHub Pages.`);
      await access(new URL(url.split(/[?#]/)[0], root));
    }
  }
}
console.log(`Checked local page assets and ${books.length} book listing(s).`);
await checkConfessions();
await import("./check-ebook-tracking.mjs");
await import("./check-ebook-periods.mjs");
