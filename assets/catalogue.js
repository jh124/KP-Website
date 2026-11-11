export const LULU_SCRIPT_URL = "https://js.lulu.com/lulu-buy.js";
const VARIANTS = new Set(["product-preview", "product-showcase"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeUrl(value, field, index) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`Book ${index + 1}: ${field} must be a URL.`);
  const url = new URL(value, "https://example.com/KP-Website/");
  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error(`Book ${index + 1}: ${field} must be an HTTP(S) or relative URL.`);
  }
  return value;
}

export function validateBooks(input) {
  if (!Array.isArray(input)) throw new Error("data/books.json must contain an array.");
  const ids = new Set();
  return input.map((book, index) => {
    if (!book || typeof book !== "object" || Array.isArray(book)) {
      throw new Error(`Book ${index + 1} must be an object.`);
    }
    if (typeof book.title !== "string" || !book.title.trim()) {
      throw new Error(`Book ${index + 1} needs a title.`);
    }
    if (typeof book.buyButtonId !== "string" || !UUID.test(book.buyButtonId)) {
      throw new Error(`Book ${index + 1} needs the buy-button-id from Lulu's embed code.`);
    }
    const id = book.buyButtonId.toLowerCase();
    if (ids.has(id)) throw new Error(`Book ${index + 1} repeats a Lulu buy button ID.`);
    ids.add(id);
    const variant = book.variant ?? "product-preview";
    if (!VARIANTS.has(variant)) throw new Error(`Book ${index + 1} has an unsupported widget variant.`);
    return {
      title: book.title.trim(),
      buyButtonId: book.buyButtonId,
      variant,
      checkoutUrl: safeUrl(book.checkoutUrl, "checkoutUrl", index),
      pdfUrl: safeUrl(book.pdfUrl, "pdfUrl", index),
    };
  });
}
