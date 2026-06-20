(function () {
  var ICONS = {
    g: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5h16v11H9l-4 4V5Z"/><path d="M8 10h8M8 13h5"/></svg>',
    c: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/></svg>',
    a: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m12 3 2.9 6 6.1.5-4.6 4 1.4 6L12 16.8 6.2 19.5l1.4-6L3 9.5 9.1 9 12 3Z"/></svg>',
    p: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4"/></svg>',
  };

  var BG_NETWORK = [
    [53.9, 27.55], [53.87, 27.48], [53.93, 27.62], [53.85, 27.42], [54.02, 27.32],
    [53.12, 25.34], [52.1, 23.7], [53.6, 23.8], [52.45, 31.0], [53.15, 29.2],
    [54.5, 30.4], [55.18, 30.22], [54.2, 28.5], [53.5, 26.0], [52.8, 27.5],
    [53.3, 26.8], [54.0, 26.5], [52.0, 24.8], [53.7, 24.0], [54.8, 29.5],
  ];

  var ICON_EYE =
    '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><circle cx="16" cy="16" r="14"/><path d="M16 7 L26 25 H6 Z"/><circle cx="16" cy="17" r="2.5" fill="currentColor" stroke="none"/></svg>';
  var ICON_COPY =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="1"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>';

  var EMPTY_PROFILE = {
    locs: 0,
    cities: 0,
    lastObs: "—",
    cityBars: [],
    markers: [],
    watched: [],
    stats: [
      { key: "all", tone: "g", lbl: "локаций · наблюдения", foot: "наблюдений", locs: 0, vol: 0, unitPl: ["наблюдение", "наблюдения", "наблюдений"] },
      { key: "photo", tone: "c", lbl: "локаций · фото", foot: "всего фото", locs: 0, vol: 0, unitPl: ["фото", "фото", "фото"] },
      { key: "rating", tone: "a", lbl: "локаций · оценки", foot: "всего оценок", locs: 0, vol: 0, unitPl: ["оценка", "оценки", "оценок"] },
      { key: "signal", tone: "p", lbl: "локаций · сигналы", foot: "всего сигналов", locs: 0, vol: 0, unitPl: ["сигнал", "сигнала", "сигналов"] },
    ],
    preview: [],
  };

  var cpMap = null;
  var cpUserLayer = null;
  var cpBgLayer = null;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function memberSinceLabel(raw) {
    if (!raw) return "сообщества EVrace";
    if (String(raw).indexOf("с ") === 0) return raw;
    return "с " + raw;
  }

  async function requireVerified() {
    var auth = window.EvraceAuth;
    if (!auth || !auth.isValid(auth.readSession())) {
      location.replace("/evr-id");
      return false;
    }
    var me = await auth.fetchMe();
    if (!me || !me.is_verified) {
      location.replace("/evr-id");
      return false;
    }
    return true;
  }

  function userPinIcon(live) {
    return L.divIcon({
      className: "cp-pin-user" + (live ? " cp-pin-live" : ""),
      html:
        '<svg width="28" height="34" viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg">' +
        '<circle class="cp-pin-ring" cx="14" cy="12" r="8" fill="none" stroke="#00ff41" stroke-width="1.5"/>' +
        '<path d="M14 0C8.5 0 4 4.5 4 10c0 7.5 10 18 10 18s10-10.5 10-18C24 4.5 19.5 0 14 0z" fill="#00ff41" stroke="#00aa2b" stroke-width="1.2"/>' +
        '<rect x="10" y="6" width="3" height="8" fill="#060a06"/><rect x="15" y="4" width="3" height="10" fill="#060a06"/></svg>',
      iconSize: [28, 34],
      iconAnchor: [14, 34],
    });
  }

  function bgPinIcon() {
    return L.divIcon({
      className: "cp-pin-bg-wrap",
      html: '<div class="cp-pin-bg"></div>',
      iconSize: [6, 6],
      iconAnchor: [3, 3],
    });
  }

  function initProfileMap() {
    var el = document.getElementById("cp-leaflet-map");
    if (!el || typeof L === "undefined") return;
    cpMap = L.map("cp-leaflet-map", {
      center: [53.7, 28.0],
      zoom: 7,
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
      dragging: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(cpMap);
    cpBgLayer = L.layerGroup().addTo(cpMap);
    cpUserLayer = L.layerGroup().addTo(cpMap);
    BG_NETWORK.forEach(function (pair) {
      L.marker([pair[0], pair[1]], { icon: bgPinIcon(), interactive: false }).addTo(cpBgLayer);
    });
  }

  function updateProfileMap(markers) {
    if (!cpMap || !cpUserLayer) return;
    cpUserLayer.clearLayers();
    var bounds = [];
    (markers || []).forEach(function (m) {
      L.marker([m.lat, m.lng], { icon: userPinIcon(m.live) }).addTo(cpUserLayer);
      bounds.push([m.lat, m.lng]);
    });
    if (bounds.length) {
      cpMap.fitBounds(bounds, { padding: [28, 28], maxZoom: bounds.length === 1 ? 10 : 8 });
    }
    setTimeout(function () {
      cpMap.invalidateSize();
    }, 80);
  }

  function showCopyToast() {
    var t = document.getElementById("cp-toast");
    if (!t) return;
    t.classList.add("is-visible");
    clearTimeout(showCopyToast._tm);
    showCopyToast._tm = setTimeout(function () {
      t.classList.remove("is-visible");
    }, 2000);
  }

  function copyEvrId(evrId) {
    if (!evrId) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(evrId).then(showCopyToast).catch(showCopyToast);
    } else {
      showCopyToast();
    }
  }

  function renderIdentity(profile) {
    var pseudo = profile.pseudonym
      ? '<div class="cp-pseudo-lbl">Псевдоним</div><div class="cp-pseudo-val">' +
        escapeHtml(profile.pseudonym) +
        "</div>"
      : '<div class="cp-pseudo-lbl">Псевдоним</div><p class="cp-pseudo-hint">Псевдоним не задан. Можно добавить по желанию — смена доступна раз в 180 дней.</p>';
    var evr = escapeHtml(profile.evr_id || "—");
    return (
      '<div class="cp-id-head">' +
      '<div class="cp-id-avatar">' +
      ICON_EYE +
      "</div>" +
      '<div class="cp-id-stack">' +
      '<div class="cp-id-lbl">Identity</div>' +
      '<div class="cp-evr-row"><span class="cp-evr-tag">' +
      evr +
      '</span><button type="button" class="cp-copy-btn" data-evr-copy="' +
      evr +
      '" aria-label="Копировать EVR ID">' +
      ICON_COPY +
      "</button></div>" +
      "</div></div>" +
      pseudo +
      '<div class="cp-id-meta">Участник сообщества ' +
      escapeHtml(memberSinceLabel(profile.member_since)) +
      "</div>"
    );
  }

  function renderProfileView(identity, activity) {
    activity = activity || EMPTY_PROFILE;
    var idEl = document.getElementById("cp-identity");
    if (idEl) idEl.innerHTML = renderIdentity(identity);

    document.getElementById("cp-stat-locs").textContent = activity.locs;
    document.getElementById("cp-stat-cities").textContent = activity.cities;
    document.getElementById("cp-stat-last").textContent = activity.lastObs;

    var barsEl = document.getElementById("cp-bars");
    if (barsEl) {
      if (!activity.cityBars.length) {
        barsEl.innerHTML = '<p class="cp-empty-hint">Пока нет наблюдений — карта ждёт твой первый вклад.</p>';
      } else {
        var max = Math.max.apply(null, activity.cityBars.map(function (c) { return c.value; }).concat([1]));
        barsEl.innerHTML = activity.cityBars
          .map(function (c) {
            return (
              '<div class="cp-bar"><span class="cn">' +
              escapeHtml(c.name) +
              '</span><span class="track"><span class="fill' +
              (c.tone ? " " + c.tone : "") +
              '" style="width:' +
              Math.round((c.value / max) * 100) +
              '%"></span></span><span class="v">' +
              c.value +
              "</span></div>"
            );
          })
          .join("");
      }
    }

    var watchedEl = document.getElementById("cp-watched");
    if (watchedEl) {
      if (!activity.watched.length) {
        watchedEl.innerHTML =
          '<p class="cp-empty-hint">Здесь появятся локации, за которыми ты наблюдаешь.</p>';
      } else {
        watchedEl.innerHTML =
          activity.watched
            .map(function (w) {
              return (
                '<div class="cp-row"><span class="cp-row-ico ' +
                w.tone +
                '">' +
                ICONS[w.tone] +
                '</span><div class="cp-row-body"><div class="cp-row-ev">' +
                escapeHtml(w.name) +
                '</div></div><div class="cp-row-when">' +
                escapeHtml(w.meta) +
                "</div></div>"
              );
            })
            .join("") +
          (activity.watched.length < activity.locs
            ? '<a class="cp-link-btn" href="/history">Все ' + activity.locs + " локации →</a>"
            : "");
      }
    }

    var statsEl = document.getElementById("cp-stats");
    if (statsEl) {
      statsEl.innerHTML = activity.stats
        .map(function (s) {
          var filter = s.key === "all" ? "" : "?filter=" + s.key;
          var zero = s.locs === 0;
          return (
            '<a class="cp-stat cp-stat--' +
            s.tone +
            (zero ? " is-zero" : "") +
            '" href="/history' +
            filter +
            '"><div class="cp-stat-head"><span class="cp-stat-ico">' +
            ICONS[s.tone] +
            '</span><span class="cp-stat-num">' +
            s.locs +
            '</span></div><div class="cp-stat-lbl">' +
            s.lbl +
            '</div><div class="cp-stat-foot"><span class="fk">' +
            s.foot +
            '</span><span class="fv">' +
            s.vol +
            "</span></div></a>"
          );
        })
        .join("");
    }

    var previewEl = document.getElementById("cp-preview");
    if (previewEl) {
      if (!activity.preview.length) {
        previewEl.innerHTML =
          '<p class="cp-empty-hint">Пока нет наблюдений. Начни с карты станций или оценки локации.</p>';
      } else {
        previewEl.innerHTML = activity.preview
          .map(function (r) {
            return (
              '<div class="cp-row"><span class="cp-row-ico ' +
              r.tone +
              '">' +
              ICONS[r.tone] +
              '</span><div class="cp-row-body"><div class="cp-row-ev ' +
              r.tone +
              '">' +
              escapeHtml(r.ev) +
              '</div><div class="cp-row-addr">' +
              escapeHtml(r.addr) +
              '</div></div><div class="cp-row-when">' +
              escapeHtml(r.when) +
              "</div></div>"
            );
          })
          .join("");
      }
    }

    updateProfileMap(activity.markers);
  }

  function bindCopyButtons() {
    document.querySelectorAll("[data-evr-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        copyEvrId(btn.getAttribute("data-evr-copy"));
      });
    });
  }

  async function initMyPage() {
    if (!(await requireVerified())) return;
    var profile = await EvraceAuth.fetchProfile();
    if (!profile) {
      location.replace("/evr-id");
      return;
    }
    renderProfileView(profile, EMPTY_PROFILE);
    bindCopyButtons();
    if (window.updateContributionNav) updateContributionNav();
    initProfileMap();
    updateProfileMap([]);
    window.addEventListener("resize", function () {
      if (cpMap) cpMap.invalidateSize();
    });
  }

  function initWelcomePage() {
    var auth = window.EvraceAuth;
    if (!auth || !auth.isVerified()) {
      location.replace("/evr-id");
      return;
    }
    var session = auth.readSession();
    var evrEl = document.getElementById("cp-welcome-evr");
    if (evrEl && session && session.evr_id) {
      var tag = evrEl.querySelector(".cp-evr-tag");
      if (tag) tag.textContent = session.evr_id;
      else evrEl.textContent = session.evr_id;
    }
    if (window.updateContributionNav) updateContributionNav();
  }

  function initEntryPage() {
    var auth = window.EvraceAuth;
    if (auth && auth.isVerified()) {
      location.replace("/my");
      return;
    }
    var mount = document.getElementById("tg-login-mount");
    if (mount) auth.mountTelegramWidget(mount);
  }

  var FILTER_MAP = { all: null, photo: "photo", review: "review", rating: "rating", signal: "signal" };

  function renderHistory(filter) {
    var key = FILTER_MAP[filter] || null;
    var list = document.getElementById("cp-history-list");
    var empty = document.getElementById("cp-history-empty");
    if (!list || !empty) return;

    document.querySelectorAll(".cp-filter").forEach(function (b) {
      b.classList.toggle("active", b.dataset.filter === filter);
    });

    list.innerHTML = "";
    empty.hidden = false;
    empty.textContent =
      filter === "all"
        ? "История появится после первых наблюдений."
        : "По этому фильтру пока ничего нет.";
  }

  function setFilter(filter) {
    renderHistory(filter);
    var url = new URL(location.href);
    if (filter === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", filter);
    history.replaceState(null, "", url);
  }

  async function initHistoryPage() {
    if (!(await requireVerified())) return;
    if (window.updateContributionNav) updateContributionNav();
    var initial = new URL(location.href).searchParams.get("filter") || "all";
    if (!FILTER_MAP[initial]) initial = "all";
    renderHistory(initial);
    var filters = document.getElementById("cp-filters");
    if (filters) {
      filters.addEventListener("click", function (e) {
        var btn = e.target.closest(".cp-filter");
        if (btn) setFilter(btn.dataset.filter);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-community-page");
    if (page === "entry") initEntryPage();
    else if (page === "welcome") initWelcomePage();
    else if (page === "my") initMyPage();
    else if (page === "history") initHistoryPage();
  });
})();
