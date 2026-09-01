(() => {
  "use strict";

  const script = document.currentScript;
  if (!(script instanceof HTMLScriptElement) || !script.src) return;

  let embedOrigin;
  try {
    embedOrigin = new URL(script.src, document.baseURI).origin;
  } catch {
    return;
  }

  const mounts = document.querySelectorAll("[data-foundcalc-widget]");
  for (const mount of mounts) {
    const widgetKey = mount.getAttribute("data-foundcalc-widget")?.trim() ?? "";
    if (!/^fcw_[A-Za-z0-9_-]{32}$/.test(widgetKey)) continue;

    const iframe = document.createElement("iframe");
    iframe.src = `${embedOrigin}/embed/${encodeURIComponent(widgetKey)}?parentOrigin=${encodeURIComponent(location.origin)}`;
    iframe.title = mount.getAttribute("data-foundcalc-title")?.trim() || "Found Calc calculator";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox");
    iframe.setAttribute("loading", "lazy");
    iframe.style.width = "100%";
    iframe.style.height = "320px";
    iframe.style.border = "0";
    iframe.style.display = "block";

    window.addEventListener("message", (event) => {
      if (event.origin !== embedOrigin) return;
      if (event.source !== iframe.contentWindow) return;
      const message = event.data;
      if (typeof message !== "object" || message === null || Array.isArray(message)) return;
      if (message.protocolVersion !== 1) return;
      if (message.widgetKey !== widgetKey) return;
      if (message.type === "foundcalc:ready") return;
      if (message.type !== "foundcalc:resize") return;
      if (typeof message.heightPx !== "number" || !Number.isFinite(message.heightPx) || !Number.isInteger(message.heightPx) || message.heightPx < 0) return;
      const heightPx = Math.min(4000, Math.max(160, message.heightPx));
      iframe.style.height = `${heightPx}px`;
    });

    mount.replaceChildren(iframe);
  }
})();
