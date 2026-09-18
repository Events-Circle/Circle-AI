import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("web-dist");
const types = {
  ".js": "text/javascript",
  ".html": "text/html",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".css": "text/css",
};
createServer(async (req, res) => {
  try {
    const file = resolve(
      root,
      "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
    );
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const path = file === root ? resolve(root, "index.html") : file;
    const body = await readFile(path);
    res.writeHead(200, {
      "Content-Type": types[extname(path)] || "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(4173, "127.0.0.1");
