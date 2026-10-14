/**
 * ChangelogSync — embeddable "What's New" widget (vanilla JS source).
 *
 * This module owns the exact bytes served at `GET /embed.js`. It is a plain
 * string (no bundler, no framework, no npm dependency) so a customer can drop
 * one `<script src="…/embed.js" data-workspace="acme"></script>` tag on any
 * http/https page and get a floating badge + modal.
 *
 * Design notes
 * ------------
 * - **No keys.** The widget only reads the anonymous public JSON at
 *   `/api/changelog/{workspace}` (same origin as the script tag). Nothing is
 *   authenticated, no cookies are sent (`credentials: "omit"`).
 * - **Pro gating hook.** `readConfig()` is the single place the workspace slug
 *   is resolved from the host page. A server-side gate (paywall / plan check)
 *   lands there later — either by 404-ing this route for a non-Pro workspace,
 *   or inside `readConfig()` below (the single place the slug enters the
 *   widget, and the place to add an entitlement check) — without touching the
 *   rendering code.
 * - **Degrades quietly.** Offline, deleted workspace, 404, malformed JSON or an
 *   empty timeline all render nothing: no badge, no console noise, no layout
 *   shift (the badge is `position: fixed` and only ever appended after a
 *   successful fetch).
 * - **Isolated styles.** Every class is prefixed `cs-` and lives in one
 *   `<style>` tuned with explicit resets so a host page's CSS cannot clobber
 *   the widget (and vice versa).
 * - The category emoji/label/colour table is generated from the app's single
 *   source of truth, `src/lib/changelog/categories.ts`, so the widget can never
 *   drift from the public timeline.
 *
 * The script is written with ES5-era syntax and string concatenation on
 * purpose: it must run un-transpiled on any host site, and backticks /
 * `${}` inside this template literal would need escaping.
 */
import { CATEGORY_META, type CategoryMeta } from "@/lib/changelog/categories";

/** Bump when the served script changes — surfaced as `X-Embed-Version`. */
export const EMBED_VERSION = "1.0.0";

/** Category table injected into the script, derived from the app's mapping. */
const CATEGORY_TABLE: Record<string, { emoji: string; label: string; color: string }> =
  Object.fromEntries(
    Object.values(CATEGORY_META).map((meta: CategoryMeta) => [
      meta.value,
      { emoji: meta.emoji, label: meta.label, color: meta.accent },
    ])
  );

/** Unknown / future category values fall back to this (mirrors `categoryMeta`). */
const FALLBACK_META = { emoji: "📝", label: "Update", color: "#64748b" };

export const EMBED_SCRIPT: string = String.raw`/*! ChangelogSync embed widget v${EMBED_VERSION} | public, keyless, no cookies */
(function () {
  "use strict";

  var NS = "__changelogSyncEmbed";
  if (window[NS]) { return; }
  var handle = { version: "${EMBED_VERSION}", workspace: null, open: false };
  window[NS] = handle;

  var CATEGORY = ${JSON.stringify(CATEGORY_TABLE)};
  var FALLBACK = ${JSON.stringify(FALLBACK_META)};
  var MAX_PREVIEW = 200;
  var STYLE_ID = "changelog-sync-embed-styles";
  var POSITIONS = { "bottom-right": 1, "bottom-left": 1, "top-right": 1, "top-left": 1 };

  var CSS = [
    ".cs-badge,.cs-badge *,.cs-overlay,.cs-overlay *{box-sizing:border-box;}",
    ".cs-badge{position:fixed;z-index:2147483000;display:inline-flex;align-items:center;gap:8px;margin:0;",
    "font:600 14px/1.15 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;",
    "color:#fff;background:#4f46e5;background-image:linear-gradient(135deg,#6366f1,#4f46e5);border:0;border-radius:999px;",
    "padding:11px 18px;cursor:pointer;box-shadow:0 10px 25px -5px rgba(30,27,75,.45),0 8px 10px -6px rgba(30,27,75,.35);",
    "transition:transform .16s ease,box-shadow .16s ease;-webkit-font-smoothing:antialiased;letter-spacing:.01em;}",
    ".cs-badge:hover{transform:translateY(-2px);box-shadow:0 14px 30px -6px rgba(30,27,75,.5);}",
    ".cs-badge:focus-visible{outline:3px solid rgba(99,102,241,.45);outline-offset:2px;}",
    ".cs-badge-dot{width:8px;height:8px;border-radius:999px;background:#a5b4fc;box-shadow:0 0 0 3px rgba(255,255,255,.15);flex:none;}",
    ".cs-badge-count{background:rgba(255,255,255,.22);border-radius:999px;padding:1px 8px;font-size:12px;font-weight:700;}",
    ".cs-pos-bottom-right{right:22px;bottom:22px;}",
    ".cs-pos-bottom-left{left:22px;bottom:22px;}",
    ".cs-pos-top-right{right:22px;top:22px;}",
    ".cs-pos-top-left{left:22px;top:22px;}",
    ".cs-overlay{position:fixed;inset:0;z-index:2147483001;display:none;align-items:center;justify-content:center;padding:20px;",
    "background:rgba(15,23,42,.55);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);",
    "font:400 15px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;",
    "-webkit-font-smoothing:antialiased;}",
    ".cs-overlay.cs-open{display:flex;}",
    ".cs-modal{display:flex;flex-direction:column;width:100%;max-width:560px;max-height:min(80vh,720px);background:#fff;color:#0f172a;",
    "border-radius:16px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(15,23,42,.45);align-items:stretch;text-align:left;}",
    ".cs-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 20px 14px;border-bottom:1px solid #e2e8f0;}",
    ".cs-modal-title{margin:0;font-size:17px;font-weight:700;line-height:1.3;color:#0f172a;}",
    ".cs-modal-sub{margin:3px 0 0;font-size:13px;color:#64748b;}",
    ".cs-close{flex:none;border:0;background:transparent;color:#64748b;font:400 20px/1 inherit;cursor:pointer;padding:4px 8px;border-radius:8px;}",
    ".cs-close:hover{background:#f1f5f9;color:#0f172a;}",
    ".cs-close:focus-visible{outline:3px solid rgba(99,102,241,.45);outline-offset:1px;}",
    ".cs-modal-body{margin:0;padding:4px 8px 10px;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin;list-style:none;}",
    ".cs-entry{padding:14px 12px;}",
    ".cs-entry+.cs-entry{border-top:1px solid #eef2f7;}",
    ".cs-entry-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;}",
    ".cs-entry-cat{font-size:12px;font-weight:700;letter-spacing:.01em;}",
    ".cs-entry-date{font-size:12px;color:#94a3b8;white-space:nowrap;}",
    ".cs-entry-title{margin:0 0 4px;font-size:15px;font-weight:600;line-height:1.35;color:#0f172a;}",
    ".cs-entry-body{margin:0;font-size:14px;color:#475569;}",
    ".cs-entry-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}",
    ".cs-entry-tag{font-size:11px;font-weight:600;color:#475569;background:#f1f5f9;border-radius:999px;padding:2px 8px;}",
    ".cs-modal-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:13px 20px;border-top:1px solid #e2e8f0;background:#f8fafc;}",
    ".cs-foot-link{color:#4f46e5;font-weight:700;font-size:14px;text-decoration:none;}",
    ".cs-foot-link:hover{text-decoration:underline;}",
    ".cs-powered{font-size:12px;color:#94a3b8;text-decoration:none;}",
    ".cs-powered:hover{color:#64748b;}",
    "@media (max-width:520px){.cs-pos-bottom-right{right:14px;bottom:14px;}.cs-pos-bottom-left{left:14px;bottom:14px;}",
    ".cs-pos-top-right{right:14px;top:14px;}.cs-pos-top-left{left:14px;top:14px;}.cs-modal{max-height:88vh;}}",
    "@media (prefers-reduced-motion:reduce){.cs-badge{transition:none;}.cs-badge:hover{transform:none;}}"
  ].join("");

  var overlay = null;
  var badge = null;
  var lastFocus = null;
  var savedOverflow = null;

  function categoryMeta(value) {
    return Object.prototype.hasOwnProperty.call(CATEGORY, value) ? CATEGORY[value] : FALLBACK;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== null && text !== undefined && text !== "") {
      node.appendChild(document.createTextNode(String(text)));
    }
    return node;
  }

  /* ---------------------------------------------------------------- config */

  function findScript() {
    var current = document.currentScript;
    if (current && current.src && /\/embed\.js(\?|$)/.test(current.src)) { return current; }
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i -= 1) {
      if (all[i].src && /\/embed\.js(\?|$)/.test(all[i].src)) { return all[i]; }
    }
    return null;
  }

  function parseQuery(src) {
    var out = {};
    var cut = src.indexOf("?");
    if (cut < 0) { return out; }
    var qs = src.slice(cut + 1);
    var hash = qs.indexOf("#");
    if (hash >= 0) { qs = qs.slice(0, hash); }
    var pairs = qs.split("&");
    for (var i = 0; i < pairs.length; i += 1) {
      if (!pairs[i]) { continue; }
      var eq = pairs[i].indexOf("=");
      var key = eq >= 0 ? pairs[i].slice(0, eq) : pairs[i];
      var value = eq >= 0 ? pairs[i].slice(eq + 1) : "";
      try { out[decodeURIComponent(key)] = decodeURIComponent(value); }
      catch (err) { out[key] = value; }
    }
    return out;
  }

  /**
   * The one place the workspace slug enters the widget.
   * "data-workspace" wins, "?workspace=" is the fallback. A Pro gate added
   * later either stops the script from being served or flips "allow" here.
   */
  function readConfig() {
    var script = findScript();
    var src = script && script.src ? script.src : "";
    var query = parseQuery(src);

    function pick(attr, key) {
      var fromAttr = script && script.getAttribute ? script.getAttribute(attr) : null;
      if (fromAttr && String(fromAttr).trim()) { return String(fromAttr).trim(); }
      var fromQuery = query[key];
      return fromQuery && String(fromQuery).trim() ? String(fromQuery).trim() : "";
    }

    var scriptOrigin = "";
    try { scriptOrigin = src ? new URL(src, window.location.href).origin : ""; }
    catch (err) { scriptOrigin = ""; }
    if (!scriptOrigin) { scriptOrigin = window.location.origin; }

    var position = pick("data-position", "position");
    if (!Object.prototype.hasOwnProperty.call(POSITIONS, position)) { position = "bottom-right"; }

    return {
      workspace: pick("data-workspace", "workspace"),
      position: position,
      apiOrigin: scriptOrigin,
      siteOrigin: pick("data-origin", "origin") || scriptOrigin
    };
  }

  /* ------------------------------------------------------------- formatting */

  function entryTimestamp(entry) {
    if (!entry) { return 0; }
    var raw = entry.created_at || entry.published_at || entry.publishedAt || entry.date || "";
    var parsed = Date.parse(raw);
    return isNaN(parsed) ? 0 : parsed;
  }

  function formatDate(entry) {
    var stamp = entryTimestamp(entry);
    if (!stamp) { return ""; }
    try {
      return new Date(stamp).toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric"
      });
    } catch (err) { return ""; }
  }

  /** Markdown-ish body -> single-line plain-text preview (no HTML ever). */
  function bodyPreview(markdown) {
    var text = String(markdown === null || markdown === undefined ? "" : markdown);
    var TICK = String.fromCharCode(96);
    var FENCE = new RegExp(TICK + TICK + TICK + "[\\s\\S]*?" + TICK + TICK + TICK, "g");
    var CODESPAN = new RegExp(TICK + "([^" + TICK + "]*)" + TICK, "g");
    text = text.replace(FENCE, " ");
    text = text.replace(/"([^"]*)"/g, "$1");
    text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
    text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
    text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");
    text = text.replace(/^\s{0,3}>\s?/gm, "");
    text = text.replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, "");
    text = text.replace(/[*_~]{1,3}/g, "");
    text = text.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
    if (text.length > MAX_PREVIEW) { text = text.slice(0, MAX_PREVIEW - 1).replace(/[,\s]+$/, "") + "…"; }
    return text;
  }

  /* --------------------------------------------------------------- rendering */

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) { return; }
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.appendChild(document.createTextNode(CSS));
    (document.head || document.documentElement).appendChild(style);
  }

  function buildEntry(entry) {
    var meta = categoryMeta(entry && entry.category);
    var item = el("li", "cs-entry");

    var head = el("div", "cs-entry-head");
    var cat = el("span", "cs-entry-cat", meta.emoji + " " + meta.label);
    cat.style.color = meta.color;
    head.appendChild(cat);
    var date = formatDate(entry);
    if (date) { head.appendChild(el("time", "cs-entry-date", date)); }
    item.appendChild(head);

    item.appendChild(el("h4", "cs-entry-title", (entry && entry.title) || "Untitled update"));

    var preview = bodyPreview(entry && entry.body);
    if (preview) { item.appendChild(el("p", "cs-entry-body", preview)); }

    var tags = entry && entry.tags && entry.tags.length ? entry.tags : null;
    if (tags) {
      var row = el("div", "cs-entry-tags");
      for (var i = 0; i < tags.length; i += 1) { row.appendChild(el("span", "cs-entry-tag", tags[i])); }
      item.appendChild(row);
    }
    return item;
  }

  function closeModal() {
    if (!overlay) { return; }
    overlay.classList.remove("cs-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = savedOverflow === null ? "" : savedOverflow;
    savedOverflow = null;
    document.removeEventListener("keydown", onKeydown, true);
    handle.open = false;
    if (badge) {
      badge.setAttribute("aria-expanded", "false");
      if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    }
    lastFocus = null;
  }

  function onKeydown(event) {
    if (event.key === "Escape" || event.keyCode === 27) { closeModal(); }
  }

  function openModal() {
    if (!overlay) { return; }
    lastFocus = document.activeElement;
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    overlay.classList.add("cs-open");
    overlay.setAttribute("aria-hidden", "false");
    document.addEventListener("keydown", onKeydown, true);
    handle.open = true;
    if (badge) { badge.setAttribute("aria-expanded", "true"); }
    var close = overlay.querySelector ? overlay.querySelector(".cs-close") : null;
    if (close && close.focus) { close.focus(); }
  }

  function buildOverlay(config, workspace, entries) {
    var wrap = el("div", "cs-overlay");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-label", "What's New changelog");
    wrap.setAttribute("aria-hidden", "true");
    wrap.addEventListener("click", function (event) { if (event.target === wrap) { closeModal(); } });

    var modal = el("div", "cs-modal");
    var head = el("div", "cs-modal-head");
    var titles = el("div", null);
    titles.appendChild(el("h3", "cs-modal-title", "What's New"));
    var sub = el("p", "cs-modal-sub", (workspace && workspace.name) || "");
    titles.appendChild(sub);
    head.appendChild(titles);

    var close = el("button", "cs-close", "\u2715");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", closeModal);
    head.appendChild(close);
    modal.appendChild(head);

    var body = el("ul", "cs-modal-body");
    for (var i = 0; i < entries.length; i += 1) { body.appendChild(buildEntry(entries[i])); }
    modal.appendChild(body);

    var foot = el("div", "cs-modal-foot");
    var link = el("a", "cs-foot-link", "View full changelog \u2192");
    link.href = config.siteOrigin + "/c/" + encodeURIComponent(config.workspace);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    foot.appendChild(link);

    var powered = el("a", "cs-powered", "Powered by ChangelogSync");
    powered.href = config.siteOrigin + "/";
    powered.target = "_blank";
    powered.rel = "noopener noreferrer";
    foot.appendChild(powered);
    modal.appendChild(foot);

    wrap.appendChild(modal);
    return wrap;
  }

  function mount(config, workspace, entries) {
    injectStyles();

    badge = el("button", "cs-badge cs-pos-" + config.position);
    badge.type = "button";
    badge.setAttribute("aria-haspopup", "dialog");
    badge.setAttribute("aria-expanded", "false");
    badge.setAttribute("aria-label", "Open the What's New changelog");
    badge.appendChild(el("span", "cs-badge-dot"));
    badge.appendChild(el("span", "cs-badge-text", "What's New"));
    badge.appendChild(el("span", "cs-badge-count", String(entries.length)));
    badge.addEventListener("click", openModal);

    overlay = buildOverlay(config, workspace, entries);

    var host = document.body || document.documentElement;
    host.appendChild(badge);
    host.appendChild(overlay);
  }

  /* ------------------------------------------------------------------ boot */

  function start() {
    var config = readConfig();
    handle.workspace = config.workspace || null;
    // No workspace configured: stay invisible. (Future Pro gate hook.)
    if (!config.workspace) { return; }

    var url = config.apiOrigin + "/api/changelog/" + encodeURIComponent(config.workspace);
    var request;
    try {
      request = fetch(url, { credentials: "omit", headers: { Accept: "application/json" } });
    } catch (err) { return; }

    request.then(function (response) {
      if (!response || !response.ok) { return null; }
      return response.json();
    }).then(function (payload) {
      if (!payload || !payload.entries || !payload.entries.length) { return; }
      var entries = payload.entries.slice();
      entries.sort(function (a, b) { return entryTimestamp(b) - entryTimestamp(a); });
      mount(config, payload.workspace || null, entries);
    }).catch(function () {
      // Offline, blocked, deleted workspace, bad JSON: render nothing, say nothing.
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
`;
