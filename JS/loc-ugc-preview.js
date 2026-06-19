(function (global) {
  "use strict";

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function formatRatingDisplay(rating) {
    var n = Number(rating);
    if (!Number.isFinite(n)) return "0.0";
    return n.toFixed(1);
  }

  function starsHtml(rating) {
    var r = Math.max(0, Math.min(5, Number(rating) || 0));
    var full = Math.floor(r);
    var half = r - full >= 0.25 && r - full < 0.75 ? 1 : 0;
    var extraFull = r - full >= 0.75 ? 1 : 0;
    var f = full + extraFull;
    var h = half && !extraFull ? 1 : 0;
    return "★".repeat(f) + (h ? "★" : "") + "☆".repeat(Math.max(0, 5 - f - h));
  }

  function currentTheme() {
    if (document.documentElement.dataset.theme) return document.documentElement.dataset.theme;
    var cls = document.body && document.body.className ? document.body.className : "";
    if (cls.indexOf("theme-tesla-light") >= 0) return "tesla-light";
    if (cls.indexOf("theme-tesla-dark") >= 0) return "tesla-dark";
    return "arcade";
  }

  function isArcadeTheme(theme) {
    return !theme || theme === "arcade";
  }

  function iconSvg(kind, theme) {
    var arcade = isArcadeTheme(theme);
    if (kind === "photo") {
      if (arcade) {
        return (
          '<svg class="loc-ugc-ico-svg" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">' +
          '<rect x="1" y="3" width="10" height="8" fill="currentColor"/>' +
          '<rect x="4" y="1" width="4" height="2" fill="currentColor"/>' +
          '<rect x="4" y="5" width="4" height="4" fill="#000" opacity="0.35"/></svg>'
        );
      }
      return (
        '<svg class="loc-ugc-ico-svg" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2">' +
        '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>' +
        '<circle cx="12" cy="13" r="4"/></svg>'
      );
    }
    if (kind === "review") {
      if (arcade) {
        return (
          '<svg class="loc-ugc-ico-svg" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">' +
          '<rect x="1" y="2" width="10" height="7" fill="currentColor"/>' +
          '<rect x="3" y="9" width="3" height="2" fill="currentColor"/></svg>'
        );
      }
      return (
        '<svg class="loc-ugc-ico-svg" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2">' +
        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
      );
    }
    if (kind === "signal") {
      if (arcade) {
        return (
          '<svg class="loc-ugc-ico-svg" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">' +
          '<path d="M6 1 L11 10 H1 Z" fill="none" stroke="currentColor" stroke-width="1.2"/>' +
          '<ellipse cx="6" cy="6.5" rx="1.6" ry="1.1" fill="currentColor"/>' +
          '<circle cx="6" cy="6.5" r="0.55" fill="#000" opacity="0.55"/></svg>'
        );
      }
      return (
        '<svg class="loc-ugc-ico-svg" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2">' +
        '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
        '<circle cx="12" cy="12" r="3"/></svg>'
      );
    }
    return "";
  }

  function buildSignalTotalMap(rows) {
    var map = {};
    (rows || []).forEach(function (row) {
      var id = row.location_id;
      if (id == null) return;
      map[id] = (map[id] || 0) + (parseInt(String(row.count), 10) || 0);
    });
    return map;
  }

  function getStatsFromLoc(loc) {
    if (!loc) return null;
    var photoLive = loc.photo_count_live;
    var photoCount =
      photoLive != null
        ? parseInt(String(photoLive), 10) || 0
        : parseInt(String(loc.cached_photo_count || 0), 10) || 0;
    return {
      avgRating: loc.cached_avg_rating,
      reviewCount: parseInt(String(loc.cached_review_count || 0), 10) || 0,
      photoCount: photoCount,
      signalTotal: parseInt(String(loc.signal_total || 0), 10) || 0,
    };
  }

  function hasRating(stats) {
    return Boolean(stats && stats.reviewCount > 0 && stats.avgRating);
  }

  function metricParts(stats, theme) {
    var parts = [];
    if (stats.photoCount > 0) {
      parts.push(
        '<span class="loc-ugc-metric">' +
          iconSvg("photo", theme) +
          '<span class="loc-ugc-num">' +
          escapeHtml(String(stats.photoCount)) +
          "</span></span>",
      );
    }
    if (stats.reviewCount > 0) {
      parts.push(
        '<span class="loc-ugc-metric">' +
          iconSvg("review", theme) +
          '<span class="loc-ugc-num">' +
          escapeHtml(String(stats.reviewCount)) +
          "</span></span>",
      );
    }
    if (stats.signalTotal > 0) {
      parts.push(
        '<span class="loc-ugc-metric">' +
          iconSvg("signal", theme) +
          '<span class="loc-ugc-num">' +
          escapeHtml(String(stats.signalTotal)) +
          "</span></span>",
      );
    }
    return parts;
  }

  function buildAriaLabel(stats) {
    if (!stats) return "Нет отзывов и материалов сообщества";
    var bits = [];
    if (hasRating(stats)) bits.push("Рейтинг " + formatRatingDisplay(stats.avgRating));
    if (stats.photoCount > 0) bits.push(stats.photoCount + " фото");
    if (stats.reviewCount > 0) bits.push(stats.reviewCount + " отзывов");
    if (stats.signalTotal > 0) bits.push(stats.signalTotal + " наблюдений");
    return bits.length ? bits.join(", ") : "Нет отзывов и материалов сообщества";
  }

  function rateLinkHtml(href, compact) {
    var label = compact ? "ОЦЕНИТЬ →" : "ОЦЕНИТЬ ЛОКАЦИЮ →";
    if (!href) return '<span class="loc-ugc-rate-link loc-ugc-rate-link--static">' + label + "</span>";
    return '<a class="loc-ugc-rate-link" href="' + escapeAttr(href) + '">' + label + "</a>";
  }

  function render(stats, options) {
    options = options || {};
    var layout = options.layout === "map" ? "map" : "stations";
    var theme = options.theme || currentTheme();
    var rateHref = options.rateHref || options.href || "";
    var aria = buildAriaLabel(stats);
    var metrics = stats ? metricParts(stats, theme) : [];
    var rated = hasRating(stats);
    var empty = !rated && !metrics.length;

    if (empty) {
      if (layout === "map") {
        return (
          '<div class="loc-ugc-preview loc-ugc-preview--map loc-ugc-preview--empty" aria-label="' +
          escapeAttr(aria) +
          '">' +
          '<span class="loc-rating-stars loc-rating-stars--empty" aria-hidden="true">☆☆☆☆☆</span>' +
          '<span class="loc-ugc-sep" aria-hidden="true">·</span>' +
          rateLinkHtml(rateHref, true) +
          "</div>"
        );
      }
      return (
        '<div class="loc-ugc-preview loc-ugc-preview--stations loc-ugc-preview--empty" aria-label="' +
        escapeAttr(aria) +
        '">' +
        '<div class="loc-ugc-line loc-ugc-line--stars">' +
        '<span class="loc-rating-stars loc-rating-stars--empty" aria-hidden="true">☆☆☆☆☆</span>' +
        "</div>" +
        '<div class="loc-ugc-line loc-ugc-line--cta">' +
        rateLinkHtml(rateHref, false) +
        "</div></div>"
      );
    }

    if (layout === "map") {
      var chunks = [];
      if (rated) {
        chunks.push(
          '<span class="loc-ugc-map-rating">' +
            '<span class="loc-ugc-map-star" aria-hidden="true">★</span> ' +
            '<span class="loc-ugc-num">' +
            escapeHtml(formatRatingDisplay(stats.avgRating)) +
            "</span></span>",
        );
      }
      metrics.forEach(function (metric) {
        chunks.push(metric);
      });
      return (
        '<div class="loc-ugc-preview loc-ugc-preview--map" aria-label="' +
        escapeAttr(aria) +
        '">' +
        chunks.join('<span class="loc-ugc-sep" aria-hidden="true">·</span>') +
        "</div>"
      );
    }

    var lines = [];
    if (rated) {
      lines.push(
        '<div class="loc-ugc-line loc-ugc-line--stars">' +
          '<span class="loc-rating-stars loc-rating-stars--filled" aria-hidden="true">' +
          starsHtml(stats.avgRating) +
          "</span>" +
          '<span class="loc-ugc-num loc-ugc-num--rating">' +
          escapeHtml(formatRatingDisplay(stats.avgRating)) +
          "</span></div>",
      );
    }
    if (metrics.length) {
      lines.push(
        '<div class="loc-ugc-line loc-ugc-line--metrics">' + metrics.join("") + "</div>",
      );
    }
    return (
      '<div class="loc-ugc-preview loc-ugc-preview--stations" aria-label="' +
      escapeAttr(aria) +
      '">' +
      lines.join("") +
      "</div>"
    );
  }

  global.__evraceLocUgcPreview = {
    buildSignalTotalMap: buildSignalTotalMap,
    getStatsFromLoc: getStatsFromLoc,
    render: render,
    formatRatingDisplay: formatRatingDisplay,
    starsHtml: starsHtml,
    collectLocationIds: function (locationByKey) {
      var ids = [];
      var seen = {};
      Object.keys(locationByKey || {}).forEach(function (key) {
        var loc = locationByKey[key];
        var id = loc && loc.id;
        if (!id || seen[id]) return;
        seen[id] = true;
        ids.push(id);
      });
      return ids;
    },
    applyPhotoCounts: function (locationByKey, counts) {
      if (!locationByKey || !counts) return;
      Object.keys(locationByKey).forEach(function (key) {
        var loc = locationByKey[key];
        if (!loc || loc.id == null) return;
        var n = counts[String(loc.id)];
        if (n != null) loc.photo_count_live = n;
      });
    },
    hydratePhotoCounts: function (ids, done) {
      var list = (ids || []).filter(function (id) {
        return id != null && parseInt(String(id), 10) > 0;
      });
      if (!list.length) {
        if (done) done({});
        return;
      }
      var merged = {};
      var chunkSize = 40;
      var index = 0;
      function nextChunk() {
        if (index >= list.length) {
          if (done) done(merged);
          return;
        }
        var slice = list.slice(index, index + chunkSize);
        index += chunkSize;
        fetch("/api/photos/counts?ids=" + encodeURIComponent(slice.join(",")))
          .then(function (res) {
            if (!res.ok) throw new Error("counts_fetch_failed");
            return res.json();
          })
          .then(function (payload) {
            var counts = payload && payload.counts ? payload.counts : {};
            Object.keys(counts).forEach(function (id) {
              merged[id] = counts[id];
            });
            nextChunk();
          })
          .catch(function () {
            nextChunk();
          });
      }
      nextChunk();
    },
  };
})(window);
