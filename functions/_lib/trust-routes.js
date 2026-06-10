import {
  buildTrustContent,
  getTrustPage,
  loadTrustMarkdown,
  renderTrustPageHtml,
} from "./trust-layer.js";

/**
 * @param {import("@cloudflare/workers-types").EventContext<{ ASSETS: import("@cloudflare/workers-types").Fetcher }>} context
 * @param {string} pageId
 */
export async function handleTrustPageRequest(context, pageId) {
  const page = getTrustPage(pageId);
  if (!page) {
    return new Response("Not found", { status: 404 });
  }

  const rawMd = await loadTrustMarkdown(context.env.ASSETS, page.mdPath);
  const content = buildTrustContent(rawMd, page.title);
  const html = renderTrustPageHtml(page, content);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
