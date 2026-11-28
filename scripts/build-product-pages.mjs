import { readFile, writeFile, mkdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const books = JSON.parse(await readFile(new URL("data/products.json", root), "utf8"));
const newsletter = (await readFile(new URL("templates/newsletter.html", import.meta.url), "utf8"))
  .replace("publicaions", "publications")
  .replace('<input type="email"', '<input aria-label="Email address" type="email"');
const origin = "https://kidderminsterpress.com";
const { checkoutUrl: supportCheckout } = JSON.parse(await readFile(new URL("data/support.json", root), "utf8"));
if (supportCheckout !== null && !/^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_-]+$/.test(supportCheckout)) {
  throw new Error("Use a Stripe-hosted Payment Link for reader support, or null to leave it unpublished.");
}
const release = "https://github.com/jh124/KP-Website/releases/latest/download/";
const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const json = value => JSON.stringify(value).replace(/</g, "\\u003c");
const credits = book => `Edited by ${book.editors.join(" & ")}`;
const byline = book => book.author || credits(book);
const bookUrl = book => `/books/${book.slug}/`;

function printPrice(book) {
  const regular = book.salePrice ? `<s class="regular-price">$${escape(book.price)}</s> ` : "";
  return `<p class="print-price">${regular}$${escape(book.salePrice ?? book.price)}<span>${escape(book.currency)}</span></p>`;
}

function cartButton(book) {
  const widget = book.luluCartWidget;
  if (!widget) return '<button class="add-to-cart" data-purchase-controls type="button" disabled>Add to cart</button>';
  if (widget.variant !== "button-only" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(widget.buyButtonId)) {
    throw new Error(`Invalid button-only Lulu widget for ${book.title}.`);
  }
  return `<lulu-buy-button data-purchase-controls buy-button-id="${escape(widget.buyButtonId)}" variant="button-only"></lulu-buy-button>`;
}

function head({ title, description, prefix, pathname = "/", book, schema }) {
  const image = book ? `${origin}/assets/covers/${book.cover}` : `${origin}/assets/kp-link-preview.png`;
  const imageAlt = book ? `Front cover of ${book.title}` : "Kidderminster Press logo";
  return `<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f7f7f7">
    <title>${escape(book?.title ?? title)}</title>
    <meta name="description" content="${escape(book ? book.description.join(" ") : description)}">
    <link rel="canonical" href="${origin}${pathname}">
    <meta property="og:type" content="${book ? "book" : "website"}">
    <meta property="og:site_name" content="Kidderminster Press">
    <meta property="og:url" content="${origin}${pathname}">
    <meta property="og:title" content="${escape(title)}">
    <meta property="og:description" content="${escape(description)}">
    <meta property="og:image" content="${escape(image)}">
    <meta property="og:image:alt" content="${escape(imageAlt)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escape(title)}">
    <meta name="twitter:description" content="${escape(description)}">
    <meta name="twitter:image" content="${escape(image)}">
    <meta name="twitter:image:alt" content="${escape(imageAlt)}">
    <link rel="icon" href="${prefix}favicon-32x32.png?v=kp-safari-20261116" type="image/png" sizes="32x32">
    <link rel="icon" href="${prefix}favicon-16x16.png?v=kp-safari-20261116" type="image/png" sizes="16x16">
    <link rel="apple-touch-icon" href="${prefix}apple-touch-icon.png">
    <link rel="mask-icon" href="${prefix}safari-pinned-tab.svg" color="#292929">
    <link rel="stylesheet" href="${prefix}assets/styles.css?v=shared-footer-1">
    <link rel="stylesheet" href="${prefix}assets/storefront.css?v=${book?.salePrice ? "sale-prices-1" : "simple-cards-1"}">
    <script defer src="${prefix}assets/mobile-menu.js?v=footer-back-1"></script>
    <script type="module" src="${prefix}assets/products.js"></script>
    <script type="application/ld+json">${json(schema)}</script>
  </head>`;
}

function header(prefix, current = "") {
  const nav = (mobile = false) => `<a class="nav-link${current === "books" ? " active" : ""}" href="${prefix}#books">Books</a>
        ${mobile ? "" : `<a class="nav-link" href="${prefix}confessions/"${current === "confessions" ? ' aria-current="page"' : ""}>Compare confessions</a>`}
        <a class="nav-link" href="${prefix}about/"${current === "about" ? ' aria-current="page"' : ""}>About</a>`;
  return `<header class="site-header wrap">
      <a class="brand" href="${prefix}" aria-label="Kidderminster Press home">
        <img src="${prefix}assets/monogram.svg" alt="" width="32" height="32">
        <span>Kidderminster <span class="brand-second-line">Press</span></span>
      </a>
      <nav class="desktop-nav" aria-label="Main navigation">${nav()}</nav>
      <details class="mobile-menu">
        <summary aria-label="Open navigation menu"><span class="hamburger-lines" aria-hidden="true"><span></span><span></span><span></span></span></summary>
        <nav aria-label="Mobile navigation">${nav(true)}</nav>
      </details>
    </header>`;
}

function supportLink() {
  return supportCheckout ? `<a href="${escape(supportCheckout)}">Support Kidderminster Press</a>` : "";
}

function ebookSupport() {
  return supportCheckout ? `<p class="ebook-support">${supportLink()}<br>If this free edition was useful to you, you can leave a tip to help us prepare more books like it. Every PDF and EPUB will remain free.</p>` : "";
}

function footer(prefix) {
  return `<footer class="site-footer storefront-footer wrap">
      <p>© <span id="year" data-current-year>${new Date().getFullYear()}</span> Kidderminster Press</p>
      <div><a href="${prefix}about/">About</a><a href="https://x.com/kidderpress?s=11" target="_blank" rel="noopener noreferrer">Follow on X</a><a href="mailto:jack@kidderminsterpress.com">Contact: jack@kidderminsterpress.com</a>${supportLink()}</div>
    </footer>`;
}

function card(book, prefix, index = 1) {
  return `<article class="catalogue-card">
      <a class="catalogue-cover-link" href="${prefix}books/${book.slug}/" aria-label="View ${escape(book.title)}">
        <img src="${prefix}assets/covers/${escape(book.cover)}" alt="Front cover of ${escape(book.title)}" width="${book.coverWidth}" height="${book.coverHeight}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
      </a>
      <div class="catalogue-card-copy">
        <h3><a href="${prefix}books/${book.slug}/">${escape(book.title)}</a></h3>
        <p class="catalogue-author">${escape(byline(book))}</p>
      </div>
    </article>`;
}

function downloads(book) {
  return `<div class="ebook-downloads">
      <a class="ebook-download" href="${release}${book.pdf}" download="${book.pdf}" type="application/pdf" aria-label="Download ${escape(book.title)} as a PDF">Download PDF</a>
      <a class="ebook-download" href="${release}${book.epub}" download="${book.epub}" type="application/epub+zip" aria-label="Download ${escape(book.title)} as an EPUB">Download EPUB</a>
    </div>`;
}

const homeSchema = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${origin}/#publisher`, name: "Kidderminster Press", url: `${origin}/`, logo: `${origin}/assets/kp-link-preview.png`, sameAs: ["https://x.com/kidderpress"] },
    { "@type": "ItemList", name: "Kidderminster Press catalogue", itemListElement: books.map((book, index) => ({ "@type": "ListItem", position: index + 1, name: book.title, url: origin + bookUrl(book) })) }
  ]
};

const home = `<!doctype html>
<html lang="en">
  ${head({ title: "Kidderminster Press | Reformed Books & Free Ebooks", description: "Explore English Presbyterian and Reformed theology from Kidderminster Press. Browse our print editions and download free PDF and EPUB ebooks.", prefix: "./", schema: homeSchema })}
  <body class="storefront-page">
    <a class="skip-link" href="#main">Skip to content</a>
    ${header("./", "books")}
    <main id="main" class="wrap">
      <section class="storefront-intro" aria-labelledby="site-title">
        <img class="crest" src="./assets/crest.svg?v=2" alt="" width="164" height="244">
        <h1 id="site-title">Kidderminster Press</h1>
      </section>
      <section id="books" class="storefront-catalogue" aria-labelledby="books-heading">
        <div class="catalogue-heading"><h2 id="books-heading">The catalogue</h2></div>
        <div id="catalogue" class="storefront-grid">${books.map((book, index) => card(book, "./", index)).join("\n")}</div>
      </section>
      ${newsletter}
    </main>
    ${footer("./")}
  </body>
</html>
`;
await writeFile(new URL("index.html", root), home.replace(/[ \t]+$/gm, ""));

for (const book of books) {
  const prefix = "../../";
  const url = origin + bookUrl(book);
  const bookSchema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": ["Book", "Product"], "@id": `${url}#book`, name: book.title, url, description: book.summary, image: `${origin}/assets/covers/${book.cover}`, ...(book.author ? { author: { "@type": "Person", name: book.author } } : {}), editor: book.editors.map(name => ({ "@type": "Person", name })), publisher: { "@type": "Organization", name: "Kidderminster Press", url: `${origin}/` }, inLanguage: "en", bookFormat: `https://schema.org/${book.printFormat}`, bookEdition: book.edition, numberOfPages: book.printPages, offers: { "@type": "Offer", price: book.salePrice ?? book.price, priceCurrency: book.currency, url, seller: { "@type": "Organization", name: "Kidderminster Press" } } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Books", item: `${origin}/` }, { "@type": "ListItem", position: 2, name: book.title, item: url }] }
    ]
  };
  const related = book.related.map(slug => books.find(other => other.slug === slug));
  const html = `<!doctype html>
<html lang="en">
  ${head({ title: `${book.title}${book.author ? ` | ${book.author}` : ""} | Kidderminster Press`, description: `${book.summary} ${book.printFormat} edition and free PDF and EPUB from Kidderminster Press.`, prefix, pathname: bookUrl(book), book, schema: bookSchema })}
  <body class="storefront-page product-page">
    <a class="skip-link" href="#main">Skip to content</a>
    ${header(prefix, "books")}
    <main id="main" class="wrap">
      <a class="book-back-link" href="${prefix}#books">Back</a>
      <article class="product-hero" aria-labelledby="book-title">
        <div class="product-visual"><img class="product-cover" src="${prefix}assets/covers/${escape(book.cover)}" alt="Front cover of ${escape(book.title)}" width="${book.coverWidth}" height="${book.coverHeight}" fetchpriority="high"><p>${escape(book.printFormat)} <span aria-hidden="true">·</span> ${book.printPages} pages</p></div>
        <div class="product-summary">
          <h1 id="book-title"${book.title.length > 95 ? ' class="long-title"' : ""}>${escape(book.title)}</h1>
          ${book.author ? `<p class="product-author">${escape(book.author)}</p>` : ""}
          <p class="product-editor">${escape(credits(book))}</p>
          <section class="purchase-panel" data-print-purchase aria-labelledby="print-heading">
            <div class="purchase-heading"><div><h2 id="print-heading">${escape(book.printFormat)}</h2><p>${escape(book.edition)}</p></div>${printPrice(book)}</div>
            <div class="purchase-widget-slot" data-lulu-slot="${book.slug}">${cartButton(book)}<p class="lords-day-message" data-lords-day-message role="status" hidden>Books are not available for purchase on the Lord’s Day. Please check back tomorrow.</p></div>
          </section>
          <section id="ebooks" class="product-ebooks" aria-labelledby="ebooks-heading"><h2 id="ebooks-heading">Free ebook</h2><p>Download the complete book. No sign-up required.</p>${downloads(book)}${ebookSupport()}</section>
        </div>
      </article>
      <div class="product-information">
        <section class="product-description" aria-labelledby="description-heading"><p class="eyebrow">The book</p><h2 id="description-heading">About this edition</h2>${book.description.map(paragraph => `<p>${escape(paragraph)}</p>`).join("\n")}
        ${book.compareConfessions ? `<p class="comparison-link"><a href="${prefix}confessions/">Compare the confessions online</a><span>Explore passages side by side in our free reader.</span></p>` : ""}</section>
        <aside class="edition-information" aria-labelledby="edition-heading"><h2 id="edition-heading">Edition details</h2>
          <dl class="edition-details"><div><dt>Format</dt><dd>${escape(book.printFormat)}</dd></div><div><dt>Page count</dt><dd>${book.printPages}</dd></div><div><dt>Trim size</dt><dd>${escape(book.trimSize)}</dd></div><div><dt>First published</dt><dd>${escape(book.originalPublication)}</dd></div><div><dt>This edition published</dt><dd>${book.editionPublicationYear}</dd></div></dl>
        </aside>
      </div>
      <section class="related-books" aria-labelledby="related-heading"><div class="catalogue-heading"><h2 id="related-heading">Also in the catalogue</h2><a href="${prefix}#books">Browse all books</a></div><div class="related-grid">${related.map(other => card(other, prefix)).join("\n")}</div></section>
    </main>
    ${footer(prefix)}
  </body>
</html>
`;
  const directory = new URL(`books/${book.slug}/`, root);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("index.html", directory), html.replace(/[ \t]+$/gm, ""));
}

// Retain each page's content and use the same footer as the catalogue.
for (const [page, current] of [["about/index.html", "about"], ["confessions/index.html", "confessions"], ["records/index.html", null]]) {
  const file = new URL(page, root);
  let html = await readFile(file, "utf8");
  if (current) html = html.replace(/<header class="site-header wrap">[\s\S]*?<\/header>/, header("../", current));
  html = html.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/, footer("../"));
  html = html.replace('<input type="email"', '<input aria-label="Email address" type="email"');
  await writeFile(file, html.replace(/[ \t]+$/gm, "").replace("publicaions", "publications"));
}

const sitemap = ["/", "/about/", "/confessions/", ...books.map(bookUrl)];
await writeFile(new URL("sitemap.xml", root), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map(pathname => `  <url><loc>${origin}${pathname}</loc></url>`).join("\n")}\n</urlset>\n`);
console.log(`Generated a static catalogue, ${books.length} dedicated book pages, and shared navigation.`);
