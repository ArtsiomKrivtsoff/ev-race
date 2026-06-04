(function () {
  var THEMES = ["arcade", "tesla-light", "tesla-dark"];

  window.setTheme = function (theme) {
    var link = document.getElementById("theme-css");
    if (link) link.href = "CSS/" + theme + ".css?v=5";
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
  });

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
})();
