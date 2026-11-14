# Kidderminster Press

A small, responsive publisher website using the original Kidderminster Press artwork and Lulu Direct Buy Button widgets.

## Preview

With Node.js installed, run `npm run dev` and open `http://localhost:3000`. There are no dependencies to install and no build step. Run `npm run check` to validate the catalogue and local assets.

## Add a book

Add an entry to `data/books.json`. Use the actual `buy-button-id` copied from the product's embed code in the Lulu Direct dashboard:

```json
[
  {
    "title": "Your book title",
    "buyButtonId": "PASTE-THE-UUID-FROM-LULU-HERE",
    "variant": "product-preview"
  }
]
```

The example ID is a placeholder and will fail validation until replaced. Lulu supplies the cover, product information, price, buy button, cart, and checkout. No product secrets or payment credentials belong in this repository.

Optional fields:

| Field | Use |
| --- | --- |
| `checkoutUrl` | The Direct Checkout Link copied from Lulu. Shown as a fallback if the widget script cannot load. |
| `pdfUrl` | A free PDF URL, or a relative path such as `./downloads/book-title.pdf`. |
| `variant` | Defaults to `product-preview`; `product-showcase` is also supported. |

The default `product-preview` includes the title inside the widget. To remove all listings, restore `[]` in `data/books.json`.

Widget appearance is controlled in Lulu Direct under **Customize Appearance**. The site's background is `#f7f5ef`, text is `#292d26`, and accent is `#4f5a40`. The official script loads once, when there are products to display. The empty site does not display a cart or load Lulu's script.

Lulu references: [Buy Button setup guide](https://blog.lulu.com/buy-button-guide/) · [Create and manage a Buy Button](https://help.luludirect.lulu.com/en/support/solutions/articles/64000311603-how-to-create-and-manage-a-lulu-direct-buy-button).

## Ebooks

The Ebooks section offers screen PDFs and reflowable EPUBs from `downloads/` and uses the finished front covers in `assets/covers/`. Covers are not interactive; downloads start only from the Download PDF and Download EPUB links. These listings work without JavaScript; Lulu's print catalogue is separate.

## Confession comparison

`confessions/` compares up to four of eleven documents across 99 reviewed topics. Its red accent, `#6b1f2a`, matches the Reader. Columns expand to fit the selection, with light dividers and sticky headings. Search covers topic names, references, and complete passage text. Reading options provide text sizing, stacked view, and printing; individual columns support copying and reordering. Shared links encode the topic, documents, and search; browser Back and Forward restore comparisons. Reading preferences and the last comparison are saved locally.

The text comes from the corrected Reader EPUB in `downloads/`. `scripts/reader_source.py` extracts 1,146 unique source passages by article, question, Westminster paragraph, or Helvetic subheading. `data/confession-topics.json` explicitly assigns these references. No prose classifier or approximate text matching determines the current mapping. The printed two-column biblical-books table is reconstructed only after its text passes a token comparison with the source.

`data/confessions-v2.json` is the current browser data. Its source hashes are checked against both downloads, and every passage has a PDF page anchor verified against the PDF's text. The original `data/confessions.json` remains available for cached first-version clients. The 82 first-version topic URLs redirect within the tool to current topics, including merged topics.

To rebuild, use Python 3 with PyMuPDF (`fitz`) installed:

```sh
python3 scripts/build-confessions.py
npm run check
```

Review mapping changes in [the audit](docs/confession-mapping-audit.md) and edit the explicit selectors in `data/confession-topics.json`. Builds reject missing, unknown, or duplicate assignments; checks verify all articles and catechism questions, all 172 Westminster Confession paragraphs, all Dort articles and rejections, the current source edition, and representative mapping corrections. The audit documents source limitations and intentional cross-listing.

## GitHub Pages

The root directory is ready for GitHub Pages. In the repository's **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/ (root)**, then save. Asset paths are relative, so the site works under `/KP-Website/` as well as on a custom domain. No workflow or paid hosting is required.

## Files

- `index.html`: page structure and initial empty state.
- `assets/styles.css`: typography, colors, and responsive layout.
- `assets/app.js`: catalogue rendering and official Lulu widget loading.
- `assets/catalogue.js`: catalogue validation.
- `data/books.json`: book listings.
- `confessions/`, `assets/confessions.*`, `data/confessions-v2.json`: the topical comparison page.
- `scripts/build-confessions.py`, `scripts/check-confessions.mjs`: corrected Reader import and verification.
- `assets/crest.svg`, `assets/monogram.svg`: existing Kidderminster Press logo assets.

No analytics, accounts, newsletter forms, or custom checkout are included.
