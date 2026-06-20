(function () {
  function toggleFx() {
    var on = document.body.classList.toggle("reduced-fx");
    localStorage.setItem("ev_race_reduced_fx", on ? "1" : "0");
    ["flicker", "blink", "shine"].forEach(function (k) {
      document.documentElement.setAttribute("data-anim-" + k, on ? "0" : "1");
    });
    var fxOn = document.querySelector(".fx-seg.fx-on");
    var fxOff = document.querySelector(".fx-seg.fx-off");
    if (fxOn) fxOn.classList.toggle("active", !on);
    if (fxOff) fxOff.classList.toggle("active", on);
  }

  function toggleBurger() {
    var menu = document.getElementById("mobileMenu");
    var btn = document.getElementById("burgerBtn");
    if (!menu || !btn) return;
    var open = menu.classList.toggle("open");
    btn.classList.toggle("open", open);
  }

  function closeBurger() {
    var menu = document.getElementById("mobileMenu");
    var btn = document.getElementById("burgerBtn");
    if (menu) menu.classList.remove("open");
    if (btn) btn.classList.remove("open");
  }

  function toggleDrop(e) {
    e.stopPropagation();
    var drop = document.getElementById("dropMenu");
    if (drop) drop.classList.toggle("open");
  }

  function toggleMobAcc() {
    var list = document.getElementById("mobAccList");
    var btn = document.getElementById("mobAccBtn");
    if (list) list.classList.toggle("open");
    if (btn) btn.classList.toggle("open");
  }

  function updateContributionNav() {
    var href = "/evr-id";
    if (window.EvraceAuth && EvraceAuth.isVerified()) {
      href = "/my";
    }
    document.querySelectorAll("[data-nav-contribution]").forEach(function (el) {
      el.setAttribute("href", href);
    });
  }

  function initCommunityChrome() {
    document.documentElement.setAttribute("data-theme", "arcade");
    if (localStorage.getItem("ev_race_reduced_fx") === "1") {
      document.body.classList.add("reduced-fx");
      ["flicker", "blink", "shine"].forEach(function (k) {
        document.documentElement.setAttribute("data-anim-" + k, "0");
      });
    }
    var sb = document.getElementById("statusbar");
    if (sb) {
      document.documentElement.style.setProperty("--statusbar-h", sb.offsetHeight + "px");
    }
    updateContributionNav();
    document.addEventListener("click", function () {
      var drop = document.getElementById("dropMenu");
      if (drop) drop.classList.remove("open");
    });
  }

  window.toggleFx = toggleFx;
  window.toggleBurger = toggleBurger;
  window.closeBurger = closeBurger;
  window.toggleDrop = toggleDrop;
  window.toggleMobAcc = toggleMobAcc;

  window.updateContributionNav = updateContributionNav;

  document.addEventListener("DOMContentLoaded", initCommunityChrome);
})();
