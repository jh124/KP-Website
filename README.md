# Kidderminster Press

A small, responsive publisher website using the original Kidderminster Press artwork and Lulu Direct Buy Button widgets. The catalogue is intentionally empty until books are ready.

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

## GitHub Pages

The root directory is ready for GitHub Pages. In the repository's **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/ (root)**, then save. Asset paths are relative, so the site works under `/KP-Website/` as well as on a custom domain. No workflow or paid hosting is required.

## Files

- `index.html`: page structure and initial empty state.
- `assets/styles.css`: typography, colors, and responsive layout.
- `assets/app.js`: catalogue rendering and official Lulu widget loading.
- `assets/catalogue.js`: catalogue validation.
- `data/books.json`: book listings.
- `assets/crest.svg`, `assets/monogram.svg`: existing Kidderminster Press logo assets.

No analytics, accounts, newsletter forms, or custom checkout are included.
