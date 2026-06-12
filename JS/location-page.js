(function () {
  var THEMES = ["arcade", "tesla-light", "tesla-dark"];

  window.setTheme = function (theme) {
    var link = document.getElementById("theme-css");
    if (link) link.href = "/CSS/" + theme + ".css?v=5";
    localStorage.setItem("ev_race_theme", theme);
    document.documentElement.dataset.theme = theme;
    THEMES.forEach(function (t) {
      document.getElementById("btn-" + t)?.classList.toggle("active", t === theme);
      document.getElementById("foot-" + t)?.classList.toggle("active", t === theme);
    });
    document.dispatchEvent(new CustomEvent("evrace:theme", { detail: { theme: theme } }));
  };

  window.toggleFx = function () {
    var on = document.body.classList.toggle("reduced-fx");
    localStorage.setItem("ev_race_reduced_fx", on ? "1" : "0");
    document.querySelector(".fx-seg.fx-on")?.classList.toggle("active", !on);
    document.querySelector(".fx-seg.fx-off")?.classList.toggle("active", on);
  };

  window.toggleBurger = function () {
    var btn = document.getElementById("burgerBtn");
    var menu = document.getElementById("mobileMenu");
    var open = menu.classList.toggle("open");
    btn.classList.toggle("open", open);
  };

  window.closeBurger = function () {
    document.getElementById("mobileMenu")?.classList.remove("open");
    document.getElementById("burgerBtn")?.classList.remove("open");
  };

  window.toggleDrop = function (e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById("dropMenu")?.classList.toggle("open");
  };

  window.toggleMobAcc = function () {
    document.getElementById("mobAccBtn")?.classList.toggle("open");
    document.getElementById("mobAccList")?.classList.toggle("open");
  };

  window.shareLocation = function () {
    var url = location.href;
    var title = document.title;
    var btn = document.getElementById("loc-share-btn");
    var isMobile = window.matchMedia("(max-width: 768px)").matches;

    function copiedFeedback() {
      if (!btn) return;
      var prev = btn.textContent;
      btn.textContent = "ССЫЛКА СКОПИРОВАНА";
      btn.classList.add("is-copied");
      setTimeout(function () {
        btn.textContent = prev;
        btn.classList.remove("is-copied");
      }, 2000);
    }

    if (isMobile && navigator.share) {
      navigator.share({ title: title, url: url }).catch(function () {});
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(copiedFeedback).catch(function () {
        window.prompt("Скопируйте ссылку:", url);
      });
      return;
    }

    window.prompt("Скопируйте ссылку:", url);
  };

  document.addEventListener("click", function (e) {
    var menu = document.getElementById("mobileMenu");
    var btn = document.getElementById("burgerBtn");
    if (
      menu &&
      menu.classList.contains("open") &&
      !menu.contains(e.target) &&
      !btn.contains(e.target)
    ) {
      menu.classList.remove("open");
      btn.classList.remove("open");
    }
    var dm = document.getElementById("dropMenu");
    if (
      dm &&
      dm.classList.contains("open") &&
      !dm.closest(".nav-dropdown-wrap")?.contains(e.target)
    ) {
      dm.classList.remove("open");
    }
  });

  window.addEventListener("scroll", function () {
    document.getElementById("scroll-top")?.classList.toggle("visible", window.scrollY > 300);
  });

  function syncStatusbarHeight() {
    var sb = document.getElementById("statusbar");
    if (sb) {
      document.documentElement.style.setProperty("--statusbar-h", sb.offsetHeight + "px");
    }
  }

  async function trackVisit() {
    var cfg = window.__EVRACE__;
    if (!cfg?.supabaseUrl || !cfg?.supabaseKey) return;
    var el = document.getElementById("visit-count");
    if (!el) return;
    try {
      await fetch(cfg.supabaseUrl + "/rest/v1/visits", {
        method: "POST",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: "Bearer " + cfg.supabaseKey,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          visited_at: new Date().toISOString(),
          page: "location",
        }),
      });
      var res = await fetch(
        cfg.supabaseUrl + "/rest/v1/visits?select=id&page=eq.location",
        {
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: "Bearer " + cfg.supabaseKey,
            Prefer: "count=exact",
            Range: "0-0",
          },
        },
      );
      var c = res.headers.get("content-range")?.split("/")[1] || "…";
      el.textContent = Number(c).toLocaleString("ru");
    } catch (e) {
      el.textContent = "…";
    }
  }

  function readCommunityData() {
    var el = document.getElementById("loc-community-data");
    if (!el) return { photos: [] };
    try {
      return JSON.parse(el.textContent || "{}");
    } catch (e) {
      return { photos: [] };
    }
  }

  function initPhotoLightbox() {
    var data = readCommunityData();
    var photos = (data.photos || []).map(function (p) {
      return {
        url: p.url || p.main_url || p.thumb_url || "",
        approved_at: p.approved_at,
        is_review_photo: Boolean(p.is_review_photo),
        author: p.author,
        time_ago: p.time_ago,
      };
    });
    var box = document.getElementById("loc-lightbox");
    if (!box) return;

    var img = box.querySelector(".loc-lightbox-img");
    var cap = box.querySelector(".loc-lightbox-cap");
    var counter = box.querySelector(".loc-lightbox-counter");
    var closeBtn = box.querySelector(".loc-lightbox-close");
    var prevBtn = box.querySelector(".loc-lightbox-prev");
    var nextBtn = box.querySelector(".loc-lightbox-next");
    var activeSet = photos;
    var index = 0;
    var touchX = null;

    function formatApprovedAt(iso) {
      if (window.__evraceFormatPhotoDate) return window.__evraceFormatPhotoDate(iso);
      return iso ? String(iso).slice(0, 10) : "";
    }

    function captionFor(photo) {
      if (photo.is_review_photo) {
        return "Фото из отзыва";
      }
      if (photo.approved_at) {
        return "Опубликовано · " + formatApprovedAt(photo.approved_at);
      }
      if (photo.author || photo.time_ago) {
        var parts = ["Из отзыва"];
        if (photo.author) parts.push(photo.author);
        if (photo.time_ago) parts.push(photo.time_ago);
        return parts.join(" · ");
      }
      return "";
    }

    function renderSlide() {
      var p = activeSet[index];
      if (!p) return;
      img.src = p.url || "";
      cap.innerHTML = captionFor(p);
      counter.textContent = index + 1 + " / " + activeSet.length;
      prevBtn.hidden = activeSet.length <= 1;
      nextBtn.hidden = activeSet.length <= 1;
    }

    function openAt(set, i) {
      if (!set || !set.length) return;
      activeSet = set;
      index = Math.max(0, Math.min(i, activeSet.length - 1));
      renderSlide();
      box.hidden = false;
      document.body.style.overflow = "hidden";
    }

    window.__evraceOpenPhotoLightbox = openAt;

    function closeBox() {
      box.hidden = true;
      document.body.style.overflow = "";
      img.src = "";
    }

    function step(delta) {
      index = (index + delta + activeSet.length) % activeSet.length;
      renderSlide();
    }

    function bindThumbButtons() {
      document.querySelectorAll(".loc-photo-thumb").forEach(function (btn) {
        if (btn.dataset.lightboxBound === "1") return;
        btn.dataset.lightboxBound = "1";
        btn.addEventListener("click", function () {
          var i = parseInt(btn.dataset.photoIndex, 10) || 0;
          openAt(photos, i);
        });
      });
    }

    bindThumbButtons();

    document.addEventListener("evrace:photos-updated", function (e) {
      var next = (e.detail && e.detail.photos) || [];
      if (!next.length) return;
      photos = next.map(function (p) {
        return {
          url: p.url || "",
          approved_at: p.approved_at,
          is_review_photo: Boolean(p.is_review_photo),
        };
      });
      if (!box.hidden) {
        activeSet = photos;
        if (index >= activeSet.length) index = activeSet.length - 1;
        renderSlide();
      }
      bindThumbButtons();
    });

    closeBtn?.addEventListener("click", closeBox);
    prevBtn?.addEventListener("click", function () {
      step(-1);
    });
    nextBtn?.addEventListener("click", function () {
      step(1);
    });
    box.addEventListener("click", function (e) {
      if (e.target === box) closeBox();
    });
    document.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "Escape") closeBox();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });

    box.addEventListener(
      "touchstart",
      function (e) {
        touchX = e.changedTouches[0].clientX;
      },
      { passive: true },
    );
    box.addEventListener(
      "touchend",
      function (e) {
        if (touchX == null) return;
        var dx = e.changedTouches[0].clientX - touchX;
        touchX = null;
        if (Math.abs(dx) < 40) return;
        step(dx < 0 ? 1 : -1);
      },
      { passive: true },
    );
  }

  function fitInfraKpi() {
    var grid = document.querySelector(".loc-infra-grid");
    if (!grid) return;

    var edgeVals = grid.querySelectorAll(".loc-infra-val--edge");
    var centerWrap = grid.querySelector(".loc-infra-val--center");
    var isMobile = window.matchMedia("(max-width: 639px)").matches;
    var minEdge = isMobile ? 7 : 9;
    var minCenter = isMobile ? 5 : 7;

    function shrinkToFit(el, box, minSize) {
      var max = parseFloat(getComputedStyle(el).fontSize) || 12;
      el.style.fontSize = max + "px";
      var guard = 0;
      while (el.scrollWidth > box.clientWidth && max > minSize && guard < 60) {
        max -= 0.5;
        el.style.fontSize = max + "px";
        guard += 1;
      }
      return max;
    }

    var edgeSizes = [];
    edgeVals.forEach(function (el) {
      el.style.fontSize = "";
      var box = el.closest(".loc-infra-copy");
      if (!box) return;
      edgeSizes.push(shrinkToFit(el, box, minEdge));
    });

    if (edgeSizes.length) {
      var sync = Math.min.apply(null, edgeSizes);
      edgeVals.forEach(function (el) {
        el.style.fontSize = sync + "px";
      });
    }

    if (!centerWrap) return;
    centerWrap.style.fontSize = "";
    var centerBox = centerWrap.closest(".loc-infra-copy");
    if (!centerBox) return;
    var connLines = centerWrap.querySelectorAll(".loc-conn-line");
    var cMax = parseFloat(getComputedStyle(centerWrap).fontSize) || 10;

    function applyCenter(size) {
      centerWrap.style.fontSize = size + "px";
      connLines.forEach(function (line) {
        line.style.fontSize = size + "px";
      });
    }

    applyCenter(cMax);
    var g = 0;
    while (centerWrap.scrollWidth > centerBox.clientWidth && cMax > minCenter && g < 60) {
      cMax -= 0.5;
      applyCenter(cMax);
      g += 1;
    }
  }

  function innerContentWidth(box) {
    if (!box) return 0;
    var s = getComputedStyle(box);
    return (
      box.clientWidth -
      parseFloat(s.paddingLeft || 0) -
      parseFloat(s.paddingRight || 0)
    );
  }

  function fitDcAcLegend() {
    document.querySelectorAll("[data-fit-legend]").forEach(function (leg) {
      var items = leg.querySelectorAll(".leg-item");
      var dots = leg.querySelectorAll(".leg-dot");
      if (!items.length) return;

      var isMobile = window.matchMedia("(max-width: 899px)").matches;
      var minSize = isMobile ? 5.5 : 6;
      var maxSize = isMobile ? 11 : 8;
      var available = innerContentWidth(leg);
      if (available <= 0) return;

      function applySize(size, gapPx) {
        var dot = Math.max(4, Math.round(size * 0.62 * 10) / 10);
        if (gapPx != null) leg.style.gap = gapPx + "px";
        items.forEach(function (it) {
          it.style.fontSize = size + "px";
        });
        dots.forEach(function (d) {
          d.style.width = dot + "px";
          d.style.height = dot + "px";
        });
      }

      items.forEach(function (it) {
        it.style.fontSize = "";
      });
      dots.forEach(function (d) {
        d.style.width = "";
        d.style.height = "";
      });
      leg.style.gap = "";

      var cssBase = parseFloat(getComputedStyle(items[0]).fontSize) || minSize;
      maxSize = Math.max(maxSize, cssBase);

      // Largest font that still fits on one line (grow to fill row, shrink only if needed).
      var best = minSize;
      var step = 0.25;
      for (var size = minSize; size <= maxSize + 0.001; size += step) {
        applySize(size);
        if (leg.scrollWidth <= available + 1) best = size;
        else break;
      }
      applySize(best);

      // Use leftover width via gap (left-aligned items, full row).
      if (isMobile && items.length > 1) {
        var slack = available - leg.scrollWidth;
        if (slack > 2) {
          var gapMax = Math.min(24, slack / (items.length - 1));
          var gapMin = 6;
          var gapBest = gapMin;
          for (var gap = gapMin; gap <= gapMax + 0.5; gap += 1) {
            applySize(best, gap);
            if (leg.scrollWidth <= available + 1) gapBest = gap;
            else break;
          }
          applySize(best, gapBest);
        }
      }
    });
  }

  function fitFitLineElements() {
    document.querySelectorAll("[data-fit-line]").forEach(function (el) {
      var box =
        el.closest(".loc-hero-name") ||
        el.closest(".loc-hero-identity") ||
        el.closest(".loc-infra-copy") ||
        el.parentElement;
      if (!box) return;
      var available = innerContentWidth(box);
      el.style.fontSize = "";
      var max = parseFloat(getComputedStyle(el).fontSize) || 12;
      var min = window.matchMedia("(max-width: 639px)").matches ? 5 : 7;
      var connLines = el.querySelectorAll(".loc-conn-line");

      function applySize(size) {
        el.style.fontSize = size + "px";
        connLines.forEach(function (line) {
          line.style.fontSize = size + "px";
        });
      }

      applySize(max);
      var guard = 0;
      while (el.scrollWidth > available && max > min && guard < 60) {
        max -= 0.5;
        applySize(max);
        guard += 1;
      }
    });
    fitInfraKpi();
    fitDcAcLegend();
    document.dispatchEvent(new CustomEvent("evrace:hero-fit"));
  }

  function initPhotoPanelOverflow() {
    var panel = document.querySelector(".loc-photo-panel");
    if (!panel) return;
    requestAnimationFrame(function () {
      if (panel.scrollHeight > panel.clientHeight + 8) {
        panel.classList.add("loc-photo-panel--overflow");
      }
    });
  }

  if (localStorage.getItem("ev_race_reduced_fx") === "1") {
    document.body.classList.add("reduced-fx");
    document.addEventListener("DOMContentLoaded", function () {
      document.querySelector(".fx-seg.fx-on")?.classList.remove("active");
      document.querySelector(".fx-seg.fx-off")?.classList.add("active");
    });
  }

  var saved = localStorage.getItem("ev_race_theme");
  if (saved && THEMES.indexOf(saved) >= 0) setTheme(saved);
  else document.documentElement.dataset.theme = "arcade";

  document.addEventListener("DOMContentLoaded", function () {
    syncStatusbarHeight();
    window.addEventListener("resize", syncStatusbarHeight);
    trackVisit();
    initPhotoLightbox();
    initPhotoPanelOverflow();
    fitFitLineElements();
    window.addEventListener("resize", fitFitLineElements);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fitFitLineElements);
    }
  });
})();
