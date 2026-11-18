// The unlock key exists only in the owner's complete URL, never in this
// repository, storage, cookies, requests, or the encrypted report payload.
const root = new URL("../", import.meta.url);
const encodedKey = location.hash.slice(1);

function decode(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), character => character.charCodeAt(0));
}

async function unlock() {
  if (!/^[A-Za-z0-9_-]{43}$/.test(encodedKey)) return;
  let moduleUrl;
  try {
    const key = await crypto.subtle.importKey("raw", decode(encodedKey), "AES-GCM", false, ["decrypt"]);
    const response = await fetch(new URL("report.enc.json", import.meta.url), { cache: "no-cache", credentials: "omit", referrerPolicy: "no-referrer" });
    if (!response.ok) return;
    const payload = await response.json();
    const bytes = await crypto.subtle.decrypt({
      name: "AES-GCM", iv: decode(payload.iv),
      additionalData: new TextEncoder().encode("kp-ebook-report-v1"),
    }, key, decode(payload.data));
    moduleUrl = URL.createObjectURL(new Blob([bytes], { type: "text/javascript" }));
    const report = await import(moduleUrl);
    await report.default(root);
  } catch {
    // Wrong or missing links get the same inert page. No API request is made
    // until decryption has succeeded.
  } finally {
    if (moduleUrl) URL.revokeObjectURL(moduleUrl);
  }
}

window.addEventListener("hashchange", () => location.reload());
unlock();
