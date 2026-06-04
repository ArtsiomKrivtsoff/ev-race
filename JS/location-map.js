(function () {
  var OP_COLORS = {
    batteryfly: "#005EEB",
    forevo: "#b44fff",
    zaryadka: "#00cfff",
    united: "#F5821F",
    csms: "#FF6B6B",
    malanka: "#76d275",
    evika: "#832af5",
    orange: "#FF6B00",
    prizma: "#24c3d3",
    istpal: "#888888",
  };
  var OP_COLOR_FALLBACK = "#00aa2b";

  var TILE_URLS = {
    arcade: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    "tesla-light": "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    "tesla-dark": "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  };

  function makeIcon(operator, aggregator) {
    var fill = OP_COLORS[operator] || OP_COLOR_FALLBACK;
    var hasAgg = !!aggregator;
    var stroke = hasAgg ? OP_COLORS[aggregator] || OP_COLOR_FALLBACK : "#ffffff";
    var sw = hasAgg ? 2 : 1.2;
    return L.divIcon({
      html:
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="22" viewBox="0 0 16 22"><path d="M8 0C3.6 0 0 3.6 0 8c0 6.3 8 14 8 14s8-7.7 8-14C16 3.6 12.4 0 8 0z" fill="' +
        fill +
        '" stroke="' +
        stroke +
        '" stroke-width="' +
        sw +
        '"/><circle cx="8" cy="8" r="3" fill="#fff" fill-opacity=".85"/></svg>',
      className: "",
      iconSize: [16, 22],
      iconAnchor: [8, 22],
    });
  }

  function tileUrlForTheme() {
    var t = document.documentElement.dataset.theme || "arcade";
    return TILE_URLS[t] || TILE_URLS.arcade;
  }

  var mapEl = document.getElementById("loc-map");
  if (!mapEl || typeof L === "undefined") return;

  var lat = parseFloat(mapEl.dataset.lat);
  var lng = parseFloat(mapEl.dataset.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  var operator = mapEl.dataset.operator || "";
  var aggregator = mapEl.dataset.aggregator || "";

  var map = L.map(mapEl, {
    zoomControl: true,
    attributionControl: true,
    scrollWheelZoom: false,
  }).setView([lat, lng], 15);

  var tileLayer = L.tileLayer(tileUrlForTheme(), {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  });
  tileLayer.addTo(map);

  L.marker([lat, lng], { icon: makeIcon(operator, aggregator) }).addTo(map);

  document.addEventListener("evrace:theme", function () {
    tileLayer.setUrl(tileUrlForTheme());
  });

  setTimeout(function () {
    map.invalidateSize();
  }, 100);
})();
