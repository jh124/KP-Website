import { countDownloads, EXCLUDED_TEST_DOWNLOADS } from "./ebook-counts.js?v=exclude-setup-tests-20261118";

export const REPORT_TIME_ZONE = "America/New_York";
export const REPORT_PERIODS = ["all", "month", "week", "today"];

export function reportDateKey(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function calendarPeriod(period, now = new Date()) {
  if (!REPORT_PERIODS.includes(period)) throw new Error("Unknown download period.");
  const today = reportDateKey(now);
  const [year, month, day] = today.split("-").map(Number);
  const civil = new Date(Date.UTC(year, month - 1, day));
  const key = value => value.toISOString().slice(0, 10);
  let startDate = today;
  let endDate = today;
  if (period === "all") startDate = null;
  if (period === "month") {
    startDate = key(new Date(Date.UTC(year, month - 1, 1)));
    endDate = key(new Date(Date.UTC(year, month, 0)));
  }
  if (period === "week") {
    civil.setUTCDate(civil.getUTCDate() - civil.getUTCDay());
    startDate = key(civil);
    civil.setUTCDate(civil.getUTCDate() + 6);
    endDate = key(civil);
  }
  return { startDate, endDate, today, timeZone: REPORT_TIME_ZONE };
}

export function describePeriod(period, now, trackingStartedAt) {
  const range = calendarPeriod(period, now);
  const civil = date => new Date(`${date}T12:00:00Z`);
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
  if (period === "all") {
    return trackingStartedAt ? `All-time since ${formatter.format(civil(reportDateKey(trackingStartedAt)))} · Eastern time` : "All-time totals · Eastern time";
  }
  if (period === "today") return `${formatter.format(civil(range.today))} · Eastern time`;
  return `${formatter.formatRange(civil(range.startDate), civil(range.endDate))} · Eastern time${period === "week" ? " · Sunday–Saturday" : ""}`;
}

export function createDownloadHistory(trackingStartedAt) {
  return { version: 1, timeZone: REPORT_TIME_ZONE, weekStartsOn: 0, trackingStartedAt, recordedAt: null, checkedDates: [], assets: {} };
}

function validDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

export function validateDownloadHistory(history) {
  if (!history || history.version !== 1 || history.timeZone !== REPORT_TIME_ZONE || history.weekStartsOn !== 0 ||
      !Number.isFinite(Date.parse(history.trackingStartedAt)) || !Array.isArray(history.checkedDates) ||
      history.checkedDates.some(date => !validDateKey(date)) || !history.assets || typeof history.assets !== "object" || Array.isArray(history.assets)) {
    throw new Error("Download date history is unavailable. Please refresh or choose All-time.");
  }
  for (const [id, asset] of Object.entries(history.assets)) {
    if (!/^\d+$/.test(id) || !/^[a-z0-9][a-z0-9-]*\.(pdf|epub)$/.test(asset.name) ||
        !Number.isSafeInteger(asset.count) || asset.count < 0 || !asset.days || typeof asset.days !== "object" || Array.isArray(asset.days)) {
      throw new Error("Download date history contains an invalid asset.");
    }
    let sum = 0;
    for (const [date, count] of Object.entries(asset.days)) {
      if (!validDateKey(date) || !Number.isSafeInteger(count) || count < 0) throw new Error("Download date history contains an invalid daily count.");
      sum += count;
    }
    if (sum !== asset.count) throw new Error("Download date history totals do not match.");
  }
  return history;
}

export function recordDownloadSnapshot(history, assets, now = new Date()) {
  validateDownloadHistory(history);
  const date = reportDateKey(now);
  if (!history.checkedDates.length && reportDateKey(history.trackingStartedAt) !== date) {
    throw new Error("Earlier daily counts cannot be reconstructed from cumulative totals.");
  }
  const lastDate = [...history.checkedDates].sort().at(-1);
  if (lastDate && date < lastDate) throw new Error("Snapshot time is earlier than the saved history.");
  const next = structuredClone(history);
  let changed = !next.checkedDates.includes(date);
  if (changed) next.checkedDates.push(date);
  const incoming = new Map();
  for (const asset of assets) {
    if (asset.state !== "uploaded" || !/\.(pdf|epub)$/.test(asset.name)) continue;
    if (!Number.isSafeInteger(asset.id) || asset.id < 1 || !Number.isSafeInteger(asset.download_count) || asset.download_count < 0) {
      throw new Error("GitHub returned an invalid download counter.");
    }
    const existing = incoming.get(String(asset.id));
    if (!existing || asset.download_count > existing.download_count) incoming.set(String(asset.id), asset);
  }
  for (const [id, asset] of incoming) {
    let entry = next.assets[id];
    if (!entry) {
      entry = next.assets[id] = { name: asset.name, count: 0, days: {} };
      changed = true;
    }
    if (entry.name !== asset.name) throw new Error("A tracked release asset was renamed.");
    const delta = Math.max(0, asset.download_count - entry.count);
    if (delta) {
      entry.days[date] = (entry.days[date] || 0) + delta;
      entry.count += delta;
      changed = true;
    }
  }
  if (!changed) return history;
  next.checkedDates.sort();
  next.recordedAt = new Date(now).toISOString();
  return validateDownloadHistory(next);
}

export function periodDownloadCounts(books, assets, history, period = "all", now = new Date()) {
  const range = calendarPeriod(period, now);
  if (!history) {
    if (period === "all") return countDownloads(books, assets);
    throw new Error("Download date history is unavailable. Please refresh or choose All-time.");
  }
  const current = recordDownloadSnapshot(history, assets, now);
  const totals = new Map();
  for (const [id, asset] of Object.entries(current.assets)) {
    let excluded = EXCLUDED_TEST_DOWNLOADS[id] || 0;
    let total = 0;
    // Consume setup exclusions against the oldest observations only. They
    // must never be subtracted again on a new day, week, month, or edition.
    for (const [date, count] of Object.entries(asset.days).sort(([a], [b]) => a.localeCompare(b))) {
      const deduction = Math.min(excluded, count);
      excluded -= deduction;
      if ((!range.startDate || date >= range.startDate) && date <= range.today && date <= range.endDate) total += count - deduction;
    }
    totals.set(asset.name, (totals.get(asset.name) || 0) + total);
  }
  return books.map(book => {
    const pdfCount = totals.get(book.pdf) || 0;
    const epubCount = totals.get(book.epub) || 0;
    return { ...book, pdfCount, epubCount, total: pdfCount + epubCount };
  });
}
