/**
 * EVrace Trust Layer v1 — shared config, markdown loader, page template.
 * Content source: /content/trust/*.md (body + optional YAML frontmatter).
 */

import { escapeHtml, getTrustPage, SITE_ORIGIN, TRUST_PAGES } from "./trust-config.js";
import { renderSiteFooter, renderSiteHeader } from "./site-chrome.js";

export { getTrustPage, TRUST_PAGES };

/**
 * @param {string} raw
 */
export function parseFrontmatter(raw) {
  const text = String(raw || "").replace(/^\uFEFF/, "");
  if (!text.startsWith("---")) return { meta: {}, body: text.trim() };

  const end = text.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: text.trim() };

  const fmBlock = text.slice(3, end).trim();
  const body = text.slice(end + 4).replace(/^\s*\n?/, "").trim();
  /** @type {Record<string, string>} */
  const meta = {};

  for (const line of fmBlock.split("\n")) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    meta[key] = val;
  }

  return { meta, body };
}

/**
 * Inline markdown: **bold**, *italic*, [text](url)
 * @param {string} text
 */
function renderInline(text) {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, label, href) =>
      `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${escapeHtml(label)}</a>`,
  );
  return out;
}

/**
 * @param {string[]} lines
 * @param {number} from
 */
function nextNonEmptyLine(lines, from) {
  for (let j = from; j < lines.length; j += 1) {
    const t = lines[j].trim();
    if (t) return t;
  }
  return null;
}

/**
 * Plain-text trust content: section titles, paragraphs, colon-led lists.
 * Does not rewrite source text.
 * @param {string} line
 * @param {string | null} nextLine
 */
function isPlainSectionHeader(line, nextLine) {
  if (!line || line.length > 100) return false;
  if (line.endsWith(".") || line.endsWith(";")) return false;
  if (line.endsWith(":")) return false;
  if (line.includes(": ") || line.includes("：")) return false;
  if (line.length > 80 && (line.includes(". ") || line.endsWith("?") || line.endsWith("!"))) {
    return false;
  }
  if (!nextLine) return true;
  if (nextLine.endsWith(":")) return true;
  if (!nextLine.endsWith(".") && !nextLine.endsWith(";") && nextLine.length <= 100 && !nextLine.includes(": ")) {
    return true;
  }
  return true;
}

/**
 * @param {string} text
 */
export function plainTextToHtml(text) {
  if (!text || !text.trim()) return "";

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    i += 1;
    if (!line) continue;

    if (line.endsWith(":")) {
      out.push(`<p>${renderInline(line)}</p>`);
      const items = [];
      const start = i;
      while (i < lines.length) {
        const next = lines[i].trim();
        if (!next) {
          i += 1;
          break;
        }
        if (next.length > 160 || next.endsWith(":")) break;
        items.push(next);
        i += 1;
      }
      if (items.length >= 2) {
        out.push(
          `<ul>${items.map((it) => `<li>${renderInline(it)}</li>`).join("")}</ul>`,
        );
      } else {
        i = start;
      }
      continue;
    }

    const nextLine = nextNonEmptyLine(lines, i);
    if (isPlainSectionHeader(line, nextLine)) {
      out.push(`<h2>${renderInline(line)}</h2>`);
      continue;
    }

    out.push(`<p>${renderInline(line)}</p>`);
  }

  return out.join("\n");
}

/**
 * Minimal markdown → HTML (headings, lists, paragraphs). No rewriting of source text.
 * @param {string} md
 */
export function markdownToHtml(md) {
  if (!md || !md.trim()) return "";

  if (/^#{1,3}\s/m.test(md) || /^[-*]\s+/m.test(md) || /^\d+\.\s+/m.test(md)) {
    return markdownStructuredToHtml(md);
  }

  return plainTextToHtml(md);
}

/**
 * @param {string} md
 */
function markdownStructuredToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      blocks.push(`<h3>${renderInline(h3[1])}</h3>`);
      i += 1;
      continue;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      blocks.push(`<h2>${renderInline(h2[1])}</h2>`);
      i += 1;
      continue;
    }

    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      blocks.push(`<h2>${renderInline(h1[1])}</h2>`);
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(
          `<li>${renderInline(lines[i].replace(/^[-*]\s+/, ""))}</li>`,
        );
        i += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(
          `<li>${renderInline(lines[i].replace(/^\d+\.\s+/, ""))}</li>`,
        );
        i += 1;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const para = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push(`<p>${renderInline(para.join(" "))}</p>`);
  }

  return blocks.join("\n");
}

/**
 * Remove duplicate H1 when first non-empty line matches page title.
 * @param {string} body
 * @param {string | undefined} pageTitle
 */
export function stripDuplicateTitle(body, pageTitle) {
  if (!pageTitle) return body.trim();
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let idx = 0;
  while (idx < lines.length && !lines[idx].trim()) idx += 1;
  if (idx < lines.length && lines[idx].trim() === pageTitle.trim()) {
    return lines
      .slice(idx + 1)
      .join("\n")
      .replace(/^\s*\n+/, "")
      .trim();
  }
  return body.trim();
}

/**
 * @param {string} pageId
 */
export function renderTrustNav(pageId) {
  const parts = TRUST_PAGES.map((p, i) => {
    const sep =
      i > 0 ? '<span class="footer-trust-sep" aria-hidden="true">|</span>' : "";
    const label = escapeHtml(p.navLabel.toUpperCase());
    const item =
      p.id === pageId
        ? `<span class="footer-trust-link footer-trust-link--current" aria-current="page">${label}</span>`
        : `<a class="footer-trust-link" href="${escapeHtml(p.path)}">${label}</a>`;
    return sep + item;
  }).join("");

  return `<div class="footer-trust trust-top-nav">
<div class="footer-trust-title">ДОВЕРИЕ</div>
<nav class="footer-trust-row" aria-label="Доверие">${parts}</nav>
</div>`;
}

/**
 * @param {string} pageId
 */
export function renderRelatedMaterials(pageId) {
  const others = TRUST_PAGES.filter((p) => p.id !== pageId);
  const links = others
    .map(
      (p) =>
        `<a class="trust-related-link" href="${escapeHtml(p.path)}">${escapeHtml(p.navLabel)}</a>`,
    )
    .join("");

  return `<aside class="trust-related" aria-labelledby="trust-related-title">
<h2 class="trust-related-title" id="trust-related-title">Связанные материалы</h2>
<div class="trust-related-links">${links}</div>
</aside>`;
}

/**
 * @param {import("./trust-config.js").TrustPageDef} page
 * @param {{ lead?: string, lastUpdated?: string, bodyHtml: string }} content
 */
export function renderTrustPageHtml(page, content) {
  const canonical = `${SITE_ORIGIN}${page.path}`;
  const lastUpdated = content.lastUpdated
    ? `<p class="trust-updated">Последнее обновление: ${escapeHtml(content.lastUpdated)}</p>`
    : "";
  const lead = content.lead
    ? `<p class="trust-lead">${escapeHtml(content.lead)}</p>`
    : "";
  const cfgJson = JSON.stringify({
    supabaseUrl: "https://uvrboxrddqlasgrnnnne.supabase.co",
    supabaseKey: "sb_publishable_Tmx9z-PHntDW4cZQrhOTHQ_1R1Bns7Y",
    visitPage: page.visitPage,
  });

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>${escapeHtml(page.seoTitle)}</title>
<meta name="description" content="${escapeHtml(page.metaDescription)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(page.seoTitle)}">
<meta property="og:description" content="${escapeHtml(page.metaDescription)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:locale" content="ru_BY">
<meta property="og:site_name" content="EV RACE">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<script type="text/javascript">
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=108141830','ym');
ym(108141830,'init',{ssr:true,webvisor:true,clickmap:true,referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
</script>
<link id="theme-css" rel="stylesheet" href="/CSS/arcade.css?v=6">
<link rel="stylesheet" href="/CSS/operator.css?v=5">
<link rel="stylesheet" href="/CSS/home-v2.css?v=15">
<link rel="stylesheet" href="/CSS/site-chrome-v2.css?v=2">
<link rel="stylesheet" href="/CSS/trust-layer.css?v=4">
<link rel="stylesheet" href="/CSS/route-nav.css?v=1">
<link rel="prefetch" href="/CSS/tesla-light.css?v=5">
<link rel="prefetch" href="/CSS/tesla-dark.css?v=5">
<script>window.__EVRACE__=${cfgJson};</script>
</head>
<body class="trust-page">
<div class="container">
${renderSiteHeader("")}
<div class="page-wrap">
<div class="blk trust-page-blk">
<div class="blk-hdr"><span class="blk-title">◈ ДОВЕРИЕ</span></div>
<div class="site-chrome-in trust-page-in">
${renderTrustNav(page.id)}
<h1 class="trust-title">${escapeHtml(page.title)}</h1>
${lastUpdated}
${lead}
<div class="trust-content">${content.bodyHtml}</div>
${renderRelatedMaterials(page.id)}
</div>
</div>
${renderSiteFooter()}
</div>
</div>
<button id="scroll-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Наверх" aria-label="Наверх">↑</button>
<script src="/JS/trust-page.js?v=1"></script>
</body>
</html>`;
}

/**
 * @param {import("@cloudflare/workers-types").Fetcher} assets
 * @param {string} mdPath
 */
export async function loadTrustMarkdown(assets, mdPath) {
  const resp = await assets.fetch(new Request(`https://evrace.by${mdPath}`));
  if (!resp.ok) return "";
  return resp.text();
}

/**
 * @param {string} rawMd
 * @param {string | undefined} pageTitle
 */
export function buildTrustContent(rawMd, pageTitle) {
  const { meta, body } = parseFrontmatter(rawMd);
  const trimmed = stripDuplicateTitle(body, pageTitle);
  return {
    lead: meta.lead || "",
    lastUpdated: meta.lastUpdated || meta.last_updated || "",
    bodyHtml: markdownToHtml(trimmed),
  };
}
