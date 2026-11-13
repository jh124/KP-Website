import { LULU_SCRIPT_URL, validateBooks } from "./catalogue.js";

const catalogue = document.querySelector("#catalogue");
const emptyState = catalogue.firstElementChild.cloneNode(true);
document.querySelector("#year").textContent = String(new Date().getFullYear());
let luluLoading;
let catalogueRequest = 0;
let printPurchasesClosed;
let dayChangeTimer;

function isLordsDay() {
  return new Date().getDay() === 0;
}

function showLordsDayMessage() {
  const message = document.createElement("div");
  message.className = "empty-state";
  message.setAttribute("role", "status");
  const text = document.createElement("p");
  text.textContent = "Books are not available for purchase on the Lord’s Day. Please check back tomorrow.";
  message.append(text);
  catalogue.replaceChildren(message);
  catalogue.setAttribute("aria-busy", "false");
}

function loadLulu() {
  if (customElements.get("lulu-buy-button")) return Promise.resolve();
  if (luluLoading) return luluLoading;
  luluLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(() => reject(new Error("Lulu did not load in time.")), 15000);
    script.src = LULU_SCRIPT_URL;
    script.defer = true;
    script.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("Lulu could not be loaded."));
    }, { once: true });
    customElements.whenDefined("lulu-buy-button").then(() => {
      clearTimeout(timer);
      resolve();
    });
    document.head.append(script);
  });
  return luluLoading;
}

function makeLink(href, label) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  return link;
}

function renderBooks(books) {
  const grid = document.createElement("div");
  grid.className = "book-grid";
  const widgets = [];

  for (const book of books) {
    const article = document.createElement("article");
    article.className = "book";
    article.setAttribute("aria-label", book.title);

    const heading = document.createElement("h3");
    heading.className = "book-title";
    heading.textContent = book.title;
    heading.hidden = true;
    article.append(heading);

    // These are Lulu's own widgets; Lulu owns the cart, prices, and checkout.
    const widget = document.createElement("lulu-buy-button");
    widget.setAttribute("buy-button-id", book.buyButtonId);
    widget.setAttribute("variant", book.variant);
    article.append(widget);

    const status = document.createElement("p");
    status.className = "book-status";
    status.setAttribute("role", "status");
    status.textContent = "Loading purchase options…";
    article.append(status);

    const links = document.createElement("div");
    links.className = "book-links";
    if (book.pdfUrl) links.append(makeLink(book.pdfUrl, "Free PDF"));
    const fallback = book.checkoutUrl ? makeLink(book.checkoutUrl, "Buy from Lulu") : null;
    if (fallback) {
      fallback.hidden = true;
      links.append(fallback);
    }
    if (links.childElementCount) article.append(links);
    grid.append(article);
    widgets.push({ status, fallback, heading });
  }

  catalogue.replaceChildren(grid);
  loadLulu().then(() => {
    for (const { status } of widgets) status.remove();
  }).catch(() => {
    for (const { status, fallback, heading } of widgets) {
      heading.hidden = false;
      status.textContent = "Purchase options are temporarily unavailable.";
      if (fallback) fallback.hidden = false;
    }
  });
}

async function loadCatalogue() {
  const request = ++catalogueRequest;
  if (isLordsDay()) {
    showLordsDayMessage();
    return;
  }

  catalogue.setAttribute("aria-busy", "true");
  try {
    const response = await fetch(new URL("../data/books.json", import.meta.url), { cache: "no-cache" });
    if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
    const books = validateBooks(await response.json());
    if (request !== catalogueRequest) return;
    if (isLordsDay()) {
      showLordsDayMessage();
      return;
    }
    if (books.length) renderBooks(books);
    else catalogue.replaceChildren(emptyState.cloneNode(true));
  } catch (error) {
    if (request !== catalogueRequest) return;
    if (isLordsDay()) {
      showLordsDayMessage();
      return;
    }
    console.error("Unable to load the catalogue:", error);
    const message = document.createElement("div");
    message.className = "empty-state";
    message.setAttribute("role", "status");
    const text = document.createElement("p");
    text.textContent = "The catalogue is temporarily unavailable.";
    const retry = document.createElement("button");
    retry.className = "retry";
    retry.type = "button";
    retry.textContent = "Try again";
    retry.addEventListener("click", () => { retry.disabled = true; loadCatalogue(); });
    message.append(text, retry);
    catalogue.replaceChildren(message);
  } finally {
    if (request === catalogueRequest) catalogue.setAttribute("aria-busy", "false");
  }
}

function refreshLocalDay() {
  const now = new Date();
  const closed = now.getDay() === 0;
  if (closed !== printPurchasesClosed) {
    printPurchasesClosed = closed;
    loadCatalogue();
  }

  // Use the visitor's next local midnight, including daylight-saving changes.
  clearTimeout(dayChangeTimer);
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  dayChangeTimer = setTimeout(refreshLocalDay, midnight.getTime() - now.getTime());
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshLocalDay();
});
window.addEventListener("pageshow", refreshLocalDay);
window.addEventListener("focus", refreshLocalDay);
refreshLocalDay();
