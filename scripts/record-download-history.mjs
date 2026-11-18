import { recordDownloadSnapshot } from "../assets/ebook-history.js";

const repository = process.env.GITHUB_REPOSITORY || "jh124/KP-Website";
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error("GITHUB_TOKEN is required to record download history.");
const api = `https://api.github.com/repos/${repository}`;
const branch = "download-history";
const filename = "download-history.json";

async function request(path, { method = "GET", body, allow404 = false } = {}) {
  const url = new URL(`${api}${path}`);
  if (method === "GET") url.searchParams.set("_snapshot", crypto.randomUUID());
  const response = await fetch(url, {
    method,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body && JSON.stringify(body), signal: AbortSignal.timeout(30000),
  });
  if (allow404 && response.status === 404) return null;
  if (!response.ok) {
    const error = new Error(`GitHub history request failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function pages(path) {
  const result = [];
  for (let page = 1; ; page++) {
    const batch = await request(`${path}?per_page=100&page=${page}`);
    result.push(...batch);
    if (batch.length < 100) return result;
  }
}

const releases = (await pages("/releases")).filter(release => /^ebooks-[a-f0-9]+$/.test(release.tag_name) && !release.draft && !release.prerelease);
if (!releases.length) throw new Error("No tracked ebook releases were found.");
const assets = [];
for (const release of releases) assets.push(...await pages(`/releases/${release.id}/assets`));

for (let attempt = 0; attempt < 3; attempt++) {
  const file = await request(`/contents/${filename}?ref=${branch}`, { allow404: true });
  if (!file) throw new Error("The download-history branch must be initialized before recording snapshots.");
  const history = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
  const next = recordDownloadSnapshot(history, assets, new Date());
  if (next === history) {
    console.log("Download history is current; no new counts or calendar day to record.");
    break;
  }
  try {
    await request(`/contents/${filename}`, {
      method: "PUT", body: { branch, sha: file.sha, message: `Record ebook download counts · ${next.checkedDates.at(-1)}`, content: Buffer.from(JSON.stringify(next, null, 2) + "\n").toString("base64") },
    });
    console.log(`Recorded ${assets.length} release counters for ${next.checkedDates.at(-1)} (${next.timeZone}).`);
    break;
  } catch (error) {
    if (error.status !== 409 || attempt === 2) throw error;
  }
}
