(function () {
  var THEMES = ["arcade", "tesla-light", "tesla-dark"];
  var SURL = "https://uvrboxrddqlasgrnnnne.supabase.co";
  var SKEY = "sb_publishable_Tmx9z-PHntDW4cZQrhOTHQ_1R1Bns7Y";

  var SITE_FOOTER_HTML =
    '<div class="big-phrase">СТАВКИ СДЕЛАНЫ, ГОСПОДА</div>' +
    '<div class="blk chronicle-blk">' +
    '<div class="blk-hdr"><span class="blk-title">◈ ХРОНИКА ПРАВИЛ</span></div>' +
    '<div class="site-chrome-in">' +
    '<div class="upd-block upd2">' +
    '<div class="upd-label">► UPD 2 · 16.05.2026</div>' +
    '<div class="upd-text">100 DC станций за полгода. Серьёзно?<br>Окей. Меняю правила — теперь считаю AC тоже.<br>Не потому что так надо. Потому что хочу живой гонки, а не похорон.<br>Вперёд.</div>' +
    '<div class="upd-sign">Блюститель честного заряда · <span>Artsiom Krivtsoff</span></div>' +
    "</div>" +
    '<div class="upd-block">' +
    '<div class="upd-label">► UPD 26.03.2026</div>' +
    '<div class="upd-text">Великодушие — одно из моих имён! Засчитываю все DC станции с 1 января 2026 года.<br>Это фора, господа операторы. Теперь отмазок нет. Пользуйтесь.</div>' +
    '<div class="upd-sign">Блюститель честного заряда · <span>Artsiom Krivtsoff</span></div>' +
    "</div></div></div>" +
    '<div class="blk author-blk">' +
    '<div class="blk-hdr"><span class="blk-title">◈ ОБ АВТОРЕ</span></div>' +
    '<div class="site-chrome-in">' +
    '<a class="author-about-btn" href="https://me.imeyuskazat.by" target="_blank" rel="noopener noreferrer">▶ ОБ АВТОРЕ ◀</a>' +
    '<a class="author-chat-btn" href="https://t.me/evclubb" target="_blank" rel="noopener noreferrer">▶ ЗЕЛЁНЫЙ ЧАТ ◀<span class="chat-sub">крупнейшее электромобильное сообщество в Беларуси</span></a>' +
    '<div class="section-label">▼ TG-КАНАЛЫ #ИМЕЮСКАЗАТЬ ▼</div>' +
    '<div class="author-links">' +
    '<a class="author-link-btn" href="https://t.me/imeyuskazat" target="_blank" rel="noopener noreferrer">EV ОПЫТ</a>' +
    '<a class="author-link-btn" href="https://t.me/imeyuskazat_lifestyle" target="_blank" rel="noopener noreferrer">EV LIFE</a>' +
    '<a class="author-link-btn" href="https://t.me/imeyuskazat_evnews" target="_blank" rel="noopener noreferrer">EV WORLD NEWS</a>' +
    "</div>" +
    '<div class="section-label">▼ ИНОЕ #НЕТЕЛЕГА ▼</div>' +
    '<div class="author-links">' +
    '<a class="author-link-btn" href="https://www.instagram.com/artsiomkrivtsoff/" target="_blank" rel="noopener noreferrer">Instagram</a>' +
    '<a class="author-link-btn" href="https://tiktok.com/@artsiomkrivtsoff" target="_blank" rel="noopener noreferrer">TikTok</a>' +
    '<a class="author-link-btn" href="https://www.youtube.com/@imeyuskazat" target="_blank" rel="noopener noreferrer">YouTube</a>' +
    "</div>" +
    '<div class="section-label">▼ СВЯЗАТЬСЯ | УСТАНОВИТЬ ЗАРЯДНУЮ СТАНЦИЮ | ПОЛУЧИТЬ КОНСУЛЬТАЦИЮ ▼</div>' +
    '<div class="author-contacts">' +
    '<a class="author-contact-btn" href="tel:+375295170067">📞 +375 29 517-00-67</a>' +
    '<a class="author-contact-btn" href="https://t.me/Krivtsoffag" target="_blank" rel="noopener noreferrer">✈ TELEGRAM</a>' +
    "</div></div></div>" +
    '<div class="visit-counter">СТРАНИЦУ ПОСМОТРЕЛИ <span id="visit-count">…</span> РАЗ</div>' +
    '<div class="theme-footer-switch">' +
    '<span class="theme-foot-lbl">СТИЛЬ</span>' +
    '<button type="button" class="theme-foot-btn active" id="foot-arcade" title="Arcade" onclick="setTheme(\'arcade\')">⬡</button>' +
    '<button type="button" class="theme-foot-btn" id="foot-tesla-light" title="Tesla Light" onclick="setTheme(\'tesla-light\')">☀</button>' +
    '<button type="button" class="theme-foot-btn" id="foot-tesla-dark" title="Tesla Dark" onclick="setTheme(\'tesla-dark\')">◑</button>' +
    "</div>" +
    '<div class="footer">' +
    '<div class="footer-trust">' +
    '<div class="footer-trust-title">ДОВЕРИЕ</div>' +
    '<nav class="footer-trust-row" aria-label="Доверие">' +
    '<a class="footer-trust-link" href="/how-data-works">КАК EVRACE РАБОТАЕТ С ДАННЫМИ</a><span class="footer-trust-sep" aria-hidden="true">|</span>' +
    '<a class="footer-trust-link" href="/community-rules">ПРАВИЛА СООБЩЕСТВА</a><span class="footer-trust-sep" aria-hidden="true">|</span>' +
    '<a class="footer-trust-link" href="/privacy">КОНФИДЕНЦИАЛЬНОСТЬ</a>' +
    "</nav></div>" +
    '<div class="footer-disclaimer">Эта страница создана исключительно в развлекательных целях.<br>Все данные об установленных станциях носят информационный характер и не являются официальной статистикой.<br>Прогнозы — это игра, а не инвестиционная рекомендация. 🎮<br>Страница не запрашивает и не хранит ваши личные данные.</div>' +
    '<div class="footer-copy">© 2026 ARTSIOM KRIVTSOFF | #ИМЕЮСКАЗАТЬ ЗА #ЭЛЕКТРОМОБИЛЬНОЕ</div>' +
    "</div>";

  function visitPageKey() {
    var page = document.body && document.body.getAttribute("data-community-page");
    if (page === "entry") return "evr-id";
    if (page) return page;
    return "community";
  }

  function setTheme(t) {
    if (THEMES.indexOf(t) === -1) return;
    var link = document.getElementById("theme-css");
    if (link) link.href = "/CSS/" + t + ".css?v=6";
    localStorage.setItem("ev_race_theme", t);
    document.documentElement.setAttribute("data-theme", t);
    THEMES.forEach(function (x) {
      var b = document.getElementById("btn-" + x);
      if (b) b.classList.toggle("active", x === t);
      var f = document.getElementById("foot-" + x);
      if (f) f.classList.toggle("active", x === t);
    });
  }

  function initTheme() {
    var saved = localStorage.getItem("ev_race_theme");
    if (saved && THEMES.indexOf(saved) !== -1) setTheme(saved);
    else {
      document.documentElement.setAttribute("data-theme", "arcade");
      var link = document.getElementById("theme-css");
      if (link) link.href = "/CSS/arcade.css?v=6";
    }
  }

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
    if (window.EvraceAuth && EvraceAuth.isVerified()) href = "/my";
    document.querySelectorAll("[data-nav-contribution]").forEach(function (el) {
      el.setAttribute("href", href);
    });
  }

  function mountSiteFooter() {
    var mount = document.getElementById("site-chrome-footer");
    if (!mount || mount.dataset.mounted === "1") return;
    mount.dataset.mounted = "1";
    mount.innerHTML = SITE_FOOTER_HTML;
  }

  function ensureScrollTop() {
    if (document.getElementById("scroll-top")) return;
    var btn = document.createElement("button");
    btn.id = "scroll-top";
    btn.type = "button";
    btn.title = "Наверх";
    btn.textContent = "↑";
    btn.onclick = function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    document.body.appendChild(btn);
    window.addEventListener("scroll", function () {
      btn.classList.toggle("visible", window.scrollY > 300);
    });
  }

  async function trackVisit() {
    var el = document.getElementById("visit-count");
    if (!el) return;
    var page = visitPageKey();
    try {
      await fetch(SURL + "/rest/v1/visits", {
        method: "POST",
        headers: {
          apikey: SKEY,
          Authorization: "Bearer " + SKEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ visited_at: new Date().toISOString(), page: page }),
      });
      var r = await fetch(SURL + "/rest/v1/visits?select=id&page=eq." + encodeURIComponent(page), {
        headers: {
          apikey: SKEY,
          Authorization: "Bearer " + SKEY,
          Prefer: "count=exact",
          Range: "0-0",
        },
      });
      var cnt = r.headers.get("content-range");
      cnt = cnt ? cnt.split("/")[1] : "...";
      el.textContent = Number(cnt).toLocaleString("ru");
    } catch (e) {
      el.textContent = "...";
    }
  }

  function initCommunityChrome() {
    mountSiteFooter();
    ensureScrollTop();
    initTheme();
    var sb = document.getElementById("statusbar");
    if (sb) {
      document.documentElement.style.setProperty("--statusbar-h", sb.offsetHeight + "px");
    }
    updateContributionNav();
    trackVisit();
    document.addEventListener("click", function () {
      var drop = document.getElementById("dropMenu");
      if (drop) drop.classList.remove("open");
    });
    if (localStorage.getItem("ev_race_reduced_fx") === "1") {
      document.body.classList.add("reduced-fx");
      ["flicker", "blink", "shine"].forEach(function (k) {
        document.documentElement.setAttribute("data-anim-" + k, "0");
      });
      var fxOn = document.querySelector(".fx-seg.fx-on");
      var fxOff = document.querySelector(".fx-seg.fx-off");
      if (fxOn) fxOn.classList.remove("active");
      if (fxOff) fxOff.classList.add("active");
    }
  }

  window.setTheme = setTheme;
  window.toggleFx = toggleFx;
  window.toggleBurger = toggleBurger;
  window.closeBurger = closeBurger;
  window.toggleDrop = toggleDrop;
  window.toggleMobAcc = toggleMobAcc;
  window.updateContributionNav = updateContributionNav;

  document.addEventListener("DOMContentLoaded", initCommunityChrome);
})();
