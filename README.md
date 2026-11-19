# Kidderminster Press

A small, responsive publisher website using the original Kidderminster Press artwork and Lulu Direct Buy Button widgets.

## Local development

With Node.js installed, run `npm run dev` and open `http://localhost:3000`. There are no dependencies to install. Run `npm run build` after catalogue edits to regenerate the homepage, book pages, shared navigation and footers, and sitemap. Run `npm run check` before publishing.

## Add or update a book

Edit `data/products.json` with the cover filename, title, author and editors, description, print format, price, page count, trim size, original publication year, edition year, and PDF/EPUB filenames. The website supplies these details. Put the Lulu widget UUID in `luluCartWidget.buyButtonId` with `variant: "button-only"`.

Each entry also lists related book slugs. Put covers in `assets/covers/`, ebooks in `downloads/`, then run `npm run build` and `npm run check`. Commit the generated pages together with the catalogue changes. The old `data/books.json` remains for compatibility with earlier clients.

The original artwork is retained. The site uses neutral grays except for covers and the red accents of the parallel confessions reader. The homepage and About page share responsive logo sizing. All pages use the same footer. The book page Back link returns to the preceding catalogue or book page, with the catalogue as a direct-entry fallback.

`assets/products.js` loads the official Lulu script once on book pages. Purchasing controls are hidden on Sundays in the visitor's local timezone, replaced by the Lord's Day message, and refreshed on midnight and tab focus.

## Ebooks

PDF and EPUB download buttons appear on each dedicated book page. The homepage catalogue and related-book cards link to those pages. All catalogue and download links work without JavaScript.

The published download buttons use GitHub's stable `releases/latest/download/<filename>` links. The editable source PDFs and EPUBs remain in `downloads/`. The **Publish ebook downloads** workflow publishes a complete snapshot whenever those files or the ebook listings change. It checks every uploaded file before switching the latest release. Unchanged snapshots reuse their assets. Earlier releases must be retained: their per-file counters are included in all-time totals, so revising an ebook never resets its history. Avoid publishing unrelated releases as "latest" in this repository; the latest release must contain the complete ebook catalogue.

For a new ebook, first add its local file and listing, wait for **Publish ebook downloads** to succeed, then use its stable release download link. Existing ebooks need only their source files replaced. The workflow can also be run manually from Actions. It uses GitHub's automatic repository token and needs no stored personal token, analytics account, browser tracking script, or new hosting service.

The owner's download report requires the complete secret link. Its JavaScript module is AES-256-GCM encrypted; the decryption key is carried only in the URL fragment and is not committed or sent in requests. The locked page contains no report and does not query GitHub. No navigation or sitemap links to the report, and its shell is marked `noindex, nofollow, noarchive, nosnippet` with `no-referrer`. The underlying release download counts are public GitHub metadata; the secret link protects access to the report, not that metadata.

These counts follow GitHub's reporting rules and update schedule. They are not guaranteed to count every repeat request or change immediately after a download. Refresh uses a unique request URL and `cache: "no-store"` to avoid reusing an earlier API response, but it cannot force GitHub to record or publish a new count. The time on the report indicates when GitHub's totals were fetched, not when GitHub processed the downloads.

The 26 setup/verification requests made on 18 November 2026 are excluded by the fixed, per-asset ledger in `assets/ebook-counts.js`. Subtraction happens once for each original asset ID before edition totals are combined. It is not a recurring reset: later downloads and replacement editions keep their full counts. GitHub's raw counters and earlier releases are retained. Use release metadata and SHA-256 digests to verify uploads; avoid requesting public download URLs for routine checks, since those requests can affect the counters.

The report offers **All-time**, **This month**, **This week**, and **Today**. Calendar dates use `America/New_York`, including daylight-saving changes; weeks start on Sunday and end on Saturday. Month and week filters use actual calendar boundaries, not the previous 30 or 7 days. All-time begins when tracking was installed, on 18 November 2026.

GitHub provides cumulative counters without individual download timestamps. **Record ebook download history** samples those counters every five minutes and saves observed increments to `download-history.json` on the separate `download-history` branch. Counts are assigned to the Eastern calendar date when first observed; GitHub or workflow delays can move a late-reported download into a later date. No earlier dates are fabricated. Initial history is valid because tracking and date recording both began on 18 November. The report adds live increments since the last saved snapshot, so it does not need to wait for the next scheduled run to display a newly reported count. It applies setup exclusions once against each asset's oldest observations. Snapshots keep the highest observed counter to withstand stale API responses and retain old editions.

The history branch is independent of the Pages source: recording a count does not republish the website. A new history commit is created only for changed counts or a new Eastern date. The workflow uses the automatic repository token, can be run manually in Actions, and must remain enabled. Date filters show an explicit unavailable state if history cannot be loaded; All-time still works. Run `node scripts/check-ebook-periods.mjs` when changing period or snapshot logic.

To change the sealed report, use the key from the owner's saved link to decrypt the module into a temporary file outside this repository, edit it, then run `node scripts/seal-report.mjs /absolute/path/to/module.mjs`, passing the existing key via stdin. Omitting the key generates a new one and revokes the old link after deployment. Never commit the key or the decrypted module. A lost key cannot be recovered from the repository; create a replacement report and key instead. Run `node scripts/check-ebook-tracking.mjs` and `node scripts/check-ebook-publisher.mjs` when changing this feature.

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

- `index.html`, `books/*/index.html`: generated catalogue and dedicated book pages.
- `assets/styles.css`: typography, colors, and responsive layout.
- `assets/products.js`: official Lulu loading and Sunday purchase policy.
- `assets/storefront.css`: catalogue cards, product pages, and shared footer.
- `assets/catalogue.js`: catalogue validation.
- `data/products.json`: current catalogue metadata and button-only widget IDs.
- `scripts/build-product-pages.mjs`: catalogue and shared page generation.
- `confessions/`, `assets/confessions.*`, `data/confessions-v2.json`: the topical comparison page.
- `scripts/build-confessions.py`, `scripts/check-confessions.mjs`: corrected Reader import and verification.
- `assets/crest.svg`, `assets/monogram.svg`: existing Kidderminster Press logo assets.

No third-party analytics or custom checkout are added by the download counters.
