import { createServer, type ServerResponse } from "node:http";

const HOST = "127.0.0.1";
const PORTS = [3101, 3102] as const;
const DEFAULT_EMBED_ORIGIN = "http://localhost:3000";

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const send = (response: ServerResponse, status: number, body: string, contentType = "text/html; charset=utf-8") => {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
};

const hostDocument = (url: URL) => {
  const key = url.searchParams.get("key") ?? "";
  const title = url.searchParams.get("title") ?? "Found Calc calculator";
  const embedOrigin = url.searchParams.get("embedOrigin") ?? DEFAULT_EMBED_ORIGIN;
  const width = url.searchParams.get("width") ?? "100%";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Found Calc widget host fixture</title>
  <style>
    html, body { margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; }
    #fixture-shell { width: ${escapeHtml(width)}; max-width: 100%; margin: 0 auto; }
  </style>
</head>
<body>
  <main id="fixture-shell">
    <h1>Widget host fixture</h1>
    <div id="widget-mount" data-foundcalc-widget="${escapeHtml(key)}" data-foundcalc-title="${escapeHtml(title)}"></div>
  </main>
  <script defer src="${escapeHtml(embedOrigin)}/embed.js"></script>
</body>
</html>`;
};

const servers = PORTS.map((port) => createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${HOST}:${port}`);
  if (url.pathname === "/health") {
    send(response, 200, "ok", "text/plain; charset=utf-8");
    return;
  }
  if (url.pathname === "/host") {
    send(response, 200, hostDocument(url));
    return;
  }
  send(response, 404, "not found", "text/plain; charset=utf-8");
}));

for (const [index, server] of servers.entries()) {
  const port = PORTS[index];
  server.listen(port, HOST, () => console.log(`Found Calc widget host fixture listening on http://${HOST}:${port}`));
}

const close = () => {
  let remaining = servers.length;
  for (const server of servers) {
    server.close(() => {
      remaining -= 1;
      if (remaining === 0) process.exit(0);
    });
  }
};

process.on("SIGINT", close);
process.on("SIGTERM", close);
