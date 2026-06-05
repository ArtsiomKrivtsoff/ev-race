(function () {
  var overlay = null;

  function buildProviders(lat, lng, label) {
    var q = encodeURIComponent(label || "Зарядная станция");
    return [
      {
        id: "yandex",
        name: "Яндекс Карты",
        recommended: true,
        url:
          "https://yandex.ru/maps/?rtext=~" +
          lat +
          "," +
          lng +
          "&rtt=auto",
      },
      {
        id: "google",
        name: "Google Карты",
        url:
          "https://www.google.com/maps/dir/?api=1&destination=" +
          lat +
          "," +
          lng,
      },
      {
        id: "apple",
        name: "Apple Карты",
        url:
          "https://maps.apple.com/?daddr=" +
          lat +
          "," +
          lng +
          "&dirflg=d",
      },
      {
        id: "geo",
        name: "Другой навигатор…",
        hint: "системный выбор",
        url: "geo:" + lat + "," + lng + "?q=" + lat + "," + lng + "(" + q + ")",
      },
    ];
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "route-nav-overlay";
    overlay.className = "route-nav-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="route-nav-sheet" role="dialog" aria-modal="true" aria-labelledby="route-nav-title">' +
      '<div class="route-nav-hdr">' +
      '<h2 class="route-nav-title" id="route-nav-title">Маршрут</h2>' +
      '<button type="button" class="route-nav-close" aria-label="Закрыть">&times;</button>' +
      "</div>" +
      '<p class="route-nav-sub" id="route-nav-sub"></p>' +
      '<ul class="route-nav-list" id="route-nav-list"></ul>' +
      "</div>";
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeRouteNav();
    });
    overlay.querySelector(".route-nav-close").addEventListener("click", closeRouteNav);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay && !overlay.hidden) closeRouteNav();
    });
    return overlay;
  }

  function closeRouteNav() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  window.openRouteNav = function (opts) {
    var lat = Number(opts && opts.lat);
    var lng = Number(opts && opts.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    var label = String((opts && opts.label) || "Зарядная станция").trim();
    var ui = ensureOverlay();
    var sub = ui.querySelector("#route-nav-sub");
    var list = ui.querySelector("#route-nav-list");
    sub.textContent = label;
    list.innerHTML = buildProviders(lat, lng, label)
      .map(function (p) {
        var cls = "route-nav-link" + (p.recommended ? " route-nav-link--rec" : "");
        var badge = p.recommended
          ? '<span class="route-nav-badge">рекомендуем</span>'
          : p.hint
            ? '<span class="route-nav-badge">' + p.hint + "</span>"
            : "";
        return (
          '<li class="route-nav-item"><a class="' +
          cls +
          '" href="' +
          p.url +
          '" target="_blank" rel="noopener noreferrer" data-nav="' +
          p.id +
          '">' +
          "<span>" +
          p.name +
          "</span>" +
          badge +
          "</a></li>"
        );
      })
      .join("");

    list.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        closeRouteNav();
      });
    });

    ui.hidden = false;
    document.body.style.overflow = "hidden";
    ui.querySelector(".route-nav-close").focus();
  };

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-route-lat][data-route-lng]");
    if (!btn) return;
    e.preventDefault();
    openRouteNav({
      lat: btn.getAttribute("data-route-lat"),
      lng: btn.getAttribute("data-route-lng"),
      label: btn.getAttribute("data-route-label") || "",
    });
  });
})();
