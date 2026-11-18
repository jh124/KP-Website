import { readFile, writeFile } from "node:fs/promises";
import { createCipheriv, randomBytes } from "node:crypto";

// Usage: node scripts/seal-report.mjs /absolute/report-module.mjs
// Optional existing base64url key comes through stdin, never command arguments.
// Output contains a new direct-link key: keep it outside the public repository.
const source = process.argv[2];
if (!source) throw new Error("Provide the path to the report's JavaScript module.");
let provided = "";
if (!process.stdin.isTTY) for await (const chunk of process.stdin) provided += chunk;
provided = provided.trim();
if (provided && !/^[A-Za-z0-9_-]{43}$/.test(provided)) throw new Error("Invalid key.");
const key = provided ? Buffer.from(provided, "base64url") : randomBytes(32);
const iv = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", key, iv);
cipher.setAAD(Buffer.from("kp-ebook-report-v1"));
const data = Buffer.concat([cipher.update(await readFile(source)), cipher.final(), cipher.getAuthTag()]);
await writeFile(new URL("../records/report.enc.json", import.meta.url), JSON.stringify({ version: 1, iv: iv.toString("base64url"), data: data.toString("base64url") }) + "\n");
console.log(JSON.stringify({ key: key.toString("base64url"), bytes: data.length }));
