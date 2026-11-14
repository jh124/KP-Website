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

`confessions/` compares up to four confessions and catechisms across 82 topics. It shares the site's typography, colors, navigation, and logo. On phones, readers select confessions and swipe between them. The current topic and selections are encoded in shareable URL fragments; there are no accounts or remote services.

The 390 excerpts in `data/confessions.json` come from the corrected Reader EPUB in `downloads/`, checked against the matching screen PDF. Source SHA-256 hashes are retained in the data and verified by `npm run check`. The original topic framework comes from [Reformed-Confessions-Comparison](https://github.com/jh124/Reformed-Confessions-Comparison), commit `615673f1b07e8e01a473d3fd0f8ae5a2e06f64f0`.

The corrected Heidelberg Q22 is included in the creeds topic. Second Helvetic chapter 11 passages omitted by the old tool are restored to the appropriate topics on Christ; Westminster 21.3–4 is included under Prayer. The script preserves the printed reading order of the biblical-books table after checking its text against the source.

To rebuild after updating the Reader, use Python 3 and a checkout of the original framework:

```sh
python3 scripts/build-confessions.py --framework ../Reformed-Confessions-Comparison/data.json
npm run check
```

The framework supplies placement, while the corrected EPUB supplies the prose and inline styling. Uncertain matches stop the build. Review the generated text diff before publishing a changed edition. Validation checks all 129 Heidelberg, 196 Larger Catechism, and 107 Shorter Catechism questions, representative corrected readings, and both source hashes.

## GitHub Pages

The root directory is ready for GitHub Pages. In the repository's **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/ (root)**, then save. Asset paths are relative, so the site works under `/KP-Website/` as well as on a custom domain. No workflow or paid hosting is required.

## Files

- `index.html`: page structure and initial empty state.
- `assets/styles.css`: typography, colors, and responsive layout.
- `assets/app.js`: catalogue rendering and official Lulu widget loading.
- `assets/catalogue.js`: catalogue validation.
- `data/books.json`: book listings.
- `confessions/`, `assets/confessions.*`, `data/confessions.json`: the topical comparison page.
- `scripts/build-confessions.py`, `scripts/check-confessions.mjs`: corrected Reader import and verification.
- `assets/crest.svg`, `assets/monogram.svg`: existing Kidderminster Press logo assets.

No analytics, accounts, newsletter forms, or custom checkout are included.
