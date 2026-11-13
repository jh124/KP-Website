import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import path from "node:path";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".pdf": "application/pdf", ".epub": "application/epub+zip" };
const { values } = parseArgs({ options: { host: { type: "string" }, port: { type: "string" }, strictPort: { type: "boolean" } } });
const port = Number(values.port || process.env.PORT || 3000);

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const file = path.resolve(root, `.${pathname}`);
    if ((file !== root && !file.startsWith(root + path.sep)) || pathname.split("/").some(part => part.startsWith("."))) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const info = await stat(file);
    const target = info.isDirectory() ? path.join(file, "index.html") : file;
    const bytes = await readFile(target);
    res.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
}).listen(port, values.host || process.env.HOST || "0.0.0.0", () => console.log(`Kidderminster Press: http://localhost:${port}`));
