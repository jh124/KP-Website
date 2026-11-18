// Download counts are supplied by GitHub, not by visitors' browsers. Repeated
// filenames across different releases represent retained edition counters.
export function countDownloads(books, assets) {
  const counts = new Map();
  const seen = new Set();
  for (const asset of assets) {
    if (asset.state !== "uploaded" || seen.has(asset.id)) continue;
    seen.add(asset.id);
    if (!Number.isSafeInteger(asset.download_count) || asset.download_count < 0) {
      throw new Error("GitHub returned an invalid download count.");
    }
    counts.set(asset.name, (counts.get(asset.name) || 0) + asset.download_count);
  }
  return books.map(book => {
    const pdf = counts.get(book.pdf) || 0;
    const epub = counts.get(book.epub) || 0;
    return { ...book, pdfCount: pdf, epubCount: epub, total: pdf + epub };
  });
}
