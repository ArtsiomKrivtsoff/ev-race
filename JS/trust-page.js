(function () {
  var THEMES = ["arcade", "tesla-light", "tesla-dark"];

  window.setTheme = function (theme) {
    var link = document.getElementById("theme-css");
    if (link) link.href = "/CSS/" + theme + ".css?v=6";
    localStorage.setItem("ev_race_theme", theme);
    document.documentElement.dataset.theme = theme;
    THEMES.forEach(function (t) {
      document.getElementById("btn-" + t)?.classList.toggle("active", t === theme);
      document.getElementById("foot-" + t)?.classList.toggle("active", t === theme);
    });
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
    var drop = document.getElementById("dropMenu");
    if (drop && !e.target.closest(".nav-dropdown-wrap")) {
      drop.classList.remove("open");
    }
  });

  window.addEventListener("scroll", function () {
    document.getElementById("scroll-top")?.classList.toggle("visible", window.scrollY > 300);
  });

  async function trackVisit() {
    var cfg = window.__EVRACE__;
    if (!cfg?.supabaseUrl || !cfg?.supabaseKey || !cfg.visitPage) return;
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
          page: cfg.visitPage,
        }),
      });
      var res = await fetch(
        cfg.supabaseUrl + "/rest/v1/visits?select=id&page=eq." + encodeURIComponent(cfg.visitPage),
        {
          headers: {
            apikey: cfg.supabaseKey,
            Authorization: "Bearer " + cfg.supabaseKey,
            Prefer: "count=exact",
            Range: "0-0",
          },
        },
      );
      var cnt = res.headers.get("content-range")?.split("/")[1] || "…";
      el.textContent = Number(cnt).toLocaleString("ru");
    } catch (e) {
      el.textContent = "…";
    }
  }

  if (localStorage.getItem("ev_race_reduced_fx") === "1") {
    document.body.classList.add("reduced-fx");
    document.querySelector(".fx-seg.fx-on")?.classList.remove("active");
    document.querySelector(".fx-seg.fx-off")?.classList.add("active");
  }

  var saved = localStorage.getItem("ev_race_theme");
  if (saved && THEMES.indexOf(saved) >= 0) setTheme(saved);
  else document.documentElement.dataset.theme = "arcade";

  document.addEventListener("DOMContentLoaded", trackVisit);
})();
