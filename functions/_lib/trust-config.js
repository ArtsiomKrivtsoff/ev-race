/** Trust Layer page registry — shared by template and site footer. */

export const SITE_ORIGIN = "https://evrace.by";

/** @typedef {{ id: string, path: string, title: string, seoTitle: string, metaDescription: string, navLabel: string, mdPath: string, visitPage: string }} TrustPageDef */

/** @type {TrustPageDef[]} */
export const TRUST_PAGES = [
  {
    id: "how-data-works",
    path: "/how-data-works",
    title: "Как EVrace работает с данными",
    seoTitle: "Как EVrace работает с данными | EVrace",
    metaDescription:
      "Как EVrace собирает, проверяет и показывает данные о зарядных станциях: источники, модерация и ограничения сервиса.",
    navLabel: "Как EVrace работает с данными",
    mdPath: "/content/trust/how-data-works.md",
    visitPage: "trust-how-data-works",
  },
  {
    id: "community-rules",
    path: "/community-rules",
    title: "Правила сообщества EVrace",
    seoTitle: "Правила сообщества EVrace | EVrace",
    metaDescription:
      "Правила сообщества EVrace: отзывы, фото, модерация и условия публикации материалов на сайте.",
    navLabel: "Правила сообщества",
    mdPath: "/content/trust/community-rules.md",
    visitPage: "trust-community-rules",
  },
  {
    id: "privacy",
    path: "/privacy",
    title: "Политика конфиденциальности EVrace",
    seoTitle: "Политика конфиденциальности EVrace | EVrace",
    metaDescription:
      "Политика конфиденциальности EVrace: какие данные собираются при использовании сайта, отзывах и входе через Telegram.",
    navLabel: "Конфиденциальность",
    mdPath: "/content/trust/privacy.md",
    visitPage: "trust-privacy",
  },
];

/**
 * @param {string} id
 */
export function getTrustPage(id) {
  return TRUST_PAGES.find((p) => p.id === id) || null;
}

/**
 * @param {string} value
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderTrustFooterSection() {
  const links = TRUST_PAGES.map(
    (p) =>
      `<a class="footer-trust-link" href="${escapeHtml(p.path)}">${escapeHtml(p.navLabel.toUpperCase())}</a>`,
  ).join('<span class="footer-trust-sep" aria-hidden="true">|</span>');

  return `<div class="footer-trust">
<div class="footer-trust-title">ДОВЕРИЕ</div>
<nav class="footer-trust-row" aria-label="Доверие">${links}</nav>
</div>`;
}
