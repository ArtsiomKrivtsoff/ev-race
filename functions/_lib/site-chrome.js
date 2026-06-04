/**
 * Shared site chrome — header (index.html) + footer (stations.html).
 * Infrastructure location pages only; keep in sync with production templates.
 */

export function renderSiteHeader(activeNav) {
  const nav = (id, href, label, mobileHref) => {
    const cls = activeNav === id ? " active" : "";
    const h = mobileHref ?? href;
    return {
      desktop: `<a class="nav-link${cls}" href="${href}">${label}</a>`,
      mobile: `<a class="nav-mobile-link${cls}" href="${h}" onclick="closeBurger()">${label}</a>`,
    };
  };

  const main = nav("main", "/", "ГЛАВНАЯ");
  const tourDesktop = `<a class="nav-link${activeNav === "tour" ? " active" : ""}" href="/tour.html">ТУРНИРНАЯ ТАБЛИЦА</a>`;
  const tourMobileRow = `<a class="nav-mobile-link${activeNav === "tour" ? " active" : ""}" href="/tour.html">ТУРНИРНАЯ ТАБЛИЦА</a>`;
  const stations = nav("stations", "/stations.html", "СТАНЦИИ 2026");
  const letters = nav("letters", "/letters.html", "ПИСЬМА");
  const map = nav("map", "/map.html", "КАРТА");

  return `<div class="statusbar" id="statusbar">
  <button class="burger-btn" id="burgerBtn" onclick="toggleBurger()" aria-label="Меню">
    <span></span><span></span><span></span>
  </button>
  <div class="nav-desktop">
    ${main.desktop}
    <div class="nav-dropdown-wrap">
      ${tourDesktop}
      <button class="nav-drop-btn" onclick="toggleDrop(event)" aria-label="Операторы">▾</button>
      <div class="dropdown-menu" id="dropMenu">
        <a class="dropdown-item" href="/operators/batteryfly.html"><span class="d-dot" style="background:#005EEB"></span>BatteryFly</a>
        <a class="dropdown-item" href="/operators/forevo.html"><span class="d-dot" style="background:#b44fff"></span>forEVo</a>
        <a class="dropdown-item" href="/operators/united.html"><span class="d-dot" style="background:#F5821F"></span>United Company</a>
        <a class="dropdown-item" href="/operators/zaryadka.html"><span class="d-dot" style="background:#00cfff"></span>Zaryadka</a>
        <a class="dropdown-item" href="/operators/csms.html"><span class="d-dot" style="background:#FF6B6B"></span>ЦСМС</a>
      </div>
    </div>
    ${stations.desktop}
    ${letters.desktop}
    ${map.desktop}
  </div>
  <div class="theme-seg">
    <button class="theme-seg-btn active" id="btn-arcade" onclick="setTheme('arcade')">⬡ ARCADE</button>
    <button class="theme-seg-btn" id="btn-tesla-light" onclick="setTheme('tesla-light')">☀ TESLA</button>
    <button class="theme-seg-btn" id="btn-tesla-dark" onclick="setTheme('tesla-dark')">◑ TESLA</button>
  </div>
  <button class="fx-toggle" id="fxToggle" onclick="toggleFx()" title="Сканлайны и свечение">
    <span class="fx-seg fx-on active" data-state="on">ЭФФЕКТЫ</span>
    <span class="fx-seg fx-off" data-state="off">ЧЁТКО</span>
  </button>
</div>
<div class="nav-mobile-drop" id="mobileMenu">
  ${main.mobile}
  <div class="mob-nav-row">
    ${tourMobileRow}
    <button class="mob-acc-btn open" id="mobAccBtn" onclick="toggleMobAcc()" aria-label="Операторы">▾</button>
  </div>
  <div class="mob-acc-list open" id="mobAccList">
    <a href="/operators/batteryfly.html" onclick="closeBurger()"><span class="d-dot" style="background:#005EEB"></span>BatteryFly</a>
    <a href="/operators/forevo.html" onclick="closeBurger()"><span class="d-dot" style="background:#b44fff"></span>forEVo</a>
    <a href="/operators/united.html" onclick="closeBurger()"><span class="d-dot" style="background:#F5821F"></span>United Company</a>
    <a href="/operators/zaryadka.html" onclick="closeBurger()"><span class="d-dot" style="background:#00cfff"></span>Zaryadka</a>
    <a href="/operators/csms.html" onclick="closeBurger()"><span class="d-dot" style="background:#FF6B6B"></span>ЦСМС</a>
  </div>
  ${stations.mobile}
  ${letters.mobile}
  ${map.mobile}
</div>`;
}

export function renderSiteFooter() {
  return `<div class="big-phrase">СТАВКИ СДЕЛАНЫ, ГОСПОДА</div>
<div class="author-section">
  <a class="author-about-btn" href="https://me.imeyuskazat.by" target="_blank" rel="noopener noreferrer">▶ ОБ АВТОРЕ ◀</a>
  <a class="author-chat-btn" href="https://t.me/evclubb" target="_blank" rel="noopener noreferrer">▶ ЗЕЛЁНЫЙ ЧАТ ◀<span class="chat-sub">крупнейшее электромобильное сообщество в Беларуси</span></a>
  <div class="section-label">▼ TG-КАНАЛЫ #ИМЕЮСКАЗАТЬ ▼</div>
  <div class="author-links">
    <a class="author-link-btn" href="https://t.me/imeyuskazat" target="_blank" rel="noopener noreferrer">EV ОПЫТ</a>
    <a class="author-link-btn" href="https://t.me/imeyuskazat_lifestyle" target="_blank" rel="noopener noreferrer">EV LIFE</a>
    <a class="author-link-btn" href="https://t.me/imeyuskazat_evnews" target="_blank" rel="noopener noreferrer">EV WORLD NEWS</a>
  </div>
  <div class="section-label">▼ ИНОЕ #НЕТЕЛЕГА ▼</div>
  <div class="author-links">
    <a class="author-link-btn" href="https://www.instagram.com/artsiomkrivtsoff/" target="_blank" rel="noopener noreferrer">Instagram</a>
    <a class="author-link-btn" href="https://tiktok.com/@artsiomkrivtsoff" target="_blank" rel="noopener noreferrer">TikTok</a>
    <a class="author-link-btn" href="https://www.youtube.com/@imeyuskazat" target="_blank" rel="noopener noreferrer">YouTube</a>
  </div>
  <div class="section-label">▼ СВЯЗАТЬСЯ | УСТАНОВИТЬ ЗАРЯДНУЮ СТАНЦИЮ | ПОЛУЧИТЬ КОНСУЛЬТАЦИЮ ▼</div>
  <div class="author-contacts">
    <a class="author-contact-btn" href="tel:+375295170067">📞 +375 29 517-00-67</a>
    <a class="author-contact-btn" href="https://t.me/Krivtsoffag" target="_blank" rel="noopener noreferrer">✈ TELEGRAM</a>
  </div>
</div>
<div class="visit-counter">СТРАНИЦУ ПОСМОТРЕЛИ <span id="visit-count">…</span> РАЗ</div>
<div class="theme-footer-switch">
  <span class="theme-foot-lbl">СТИЛЬ</span>
  <button class="theme-foot-btn active" id="foot-arcade" title="Arcade" onclick="setTheme('arcade')">⬡</button>
  <button class="theme-foot-btn" id="foot-tesla-light" title="Tesla Light" onclick="setTheme('tesla-light')">☀</button>
  <button class="theme-foot-btn" id="foot-tesla-dark" title="Tesla Dark" onclick="setTheme('tesla-dark')">◑</button>
</div>
<div class="footer">
  <div class="footer-disclaimer">Эта страница создана в развлекательных и информационных целях.<br>Все данные об установленных станциях носят информационный характер и не являются официальной статистикой.<br>Страница не запрашивает и не хранит ваши личные данные.</div>
  <div class="footer-copy">© 2026 ARTSIOM KRIVTSOFF | #ИМЕЮСКАЗАТЬ ЗА #ЭЛЕКТРОМОБИЛЬНОЕ</div>
</div>
<button id="scroll-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Наверх" aria-label="Наверх">↑</button>`;
}
