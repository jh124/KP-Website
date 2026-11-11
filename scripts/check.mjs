import { readFile, access } from "node:fs/promises";
import { validateBooks } from "../assets/catalogue.js";

const root = new URL("../", import.meta.url);
const books = validateBooks(JSON.parse(await readFile(new URL("data/books.json", root), "utf8")));
const html = await readFile(new URL("index.html", root), "utf8");
for (const match of html.matchAll(/(?:href|src)="(\.\/[^"#]+)"/g)) {
  await access(new URL(match[1], root));
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
