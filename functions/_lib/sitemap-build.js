/** @typedef {{ operator_slug: string, slug: string, updated_at?: string | null }} LocationRow */

export const SITE_ORIGIN = "https://evrace.by";

/** Static site URLs — baseline from legacy sitemap.xml + IMPLEMENTATION_SPEC §8.1 */
export const STATIC_SITEMAP_ENTRIES = [
  { loc: `${SITE_ORIGIN}/`, changefreq: "daily", priority: "1.0" },
  {
    loc: `${SITE_ORIGIN}/stations.html`,
    changefreq: "daily",
    priority: "0.9",
  },
  {
    loc: `${SITE_ORIGIN}/map.html`,
    changefreq: "daily",
    priority: "0.9",
  },
  {
    loc: `${SITE_ORIGIN}/tour.html`,
    changefreq: "daily",
    priority: "0.5",
  },
  {
    loc: `${SITE_ORIGIN}/letters.html`,
    changefreq: "weekly",
    priority: "0.7",
  },
  {
    loc: `${SITE_ORIGIN}/operators/batteryfly.html`,
    changefreq: "weekly",
    priority: "0.7",
  },
  {
    loc: `${SITE_ORIGIN}/operators/forevo.html`,
    changefreq: "weekly",
    priority: "0.7",
  },
  {
    loc: `${SITE_ORIGIN}/operators/zaryadka.html`,
    changefreq: "weekly",
    priority: "0.7",
  },
  {
    loc: `${SITE_ORIGIN}/operators/csms.html`,
    changefreq: "weekly",
    priority: "0.7",
  },
  {
    loc: `${SITE_ORIGIN}/operators/united.html`,
    changefreq: "weekly",
    priority: "0.6",
  },
];

/**
 * @param {string} value
 */
export function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * @param {string | null | undefined} iso
 */
export function formatLastmod(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * @param {{ loc: string, changefreq?: string, priority?: string, lastmod?: string | null }} entry
 */
export function renderUrlEntry(entry) {
  const parts = [`  <url>`, `    <loc>${escapeXml(entry.loc)}</loc>`];
  const lastmod = formatLastmod(entry.lastmod);
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  if (entry.changefreq) {
    parts.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
  }
  if (entry.priority) {
    parts.push(`    <priority>${escapeXml(entry.priority)}</priority>`);
  }
  parts.push(`  </url>`);
  return parts.join("\n");
}

/**
 * @param {LocationRow[]} locations
 */
export function buildSitemapXml(locations) {
  const staticBlocks = STATIC_SITEMAP_ENTRIES.map((e) => renderUrlEntry(e));

  const locationBlocks = (locations || [])
    .filter((row) => row.operator_slug && row.slug)
    .map((row) =>
      renderUrlEntry({
        loc: `${SITE_ORIGIN}/${encodeURIComponent(row.operator_slug)}/${encodeURIComponent(row.slug)}`,
        lastmod: row.updated_at,
        changefreq: "weekly",
        priority: "0.8",
      }),
    );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticBlocks, ...locationBlocks].join("\n")}
</urlset>
`;
}
