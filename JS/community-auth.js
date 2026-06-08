(function () {
  var STORAGE_KEY = "evrace_tg_session";
  var TURNSTILE_SITE_KEY = "0x4AAAAAACtvG988gnpS7YBa";
  var TG_BOT_USERNAME = "evrace_auth_bot";

  function cfg() {
    return window.__EVRACE__ || {};
  }

  function apiBase() {
    var url = cfg().supabaseUrl || "";
    return url.replace(/\/$/, "") + "/functions/v1";
  }

  function apiHeaders() {
    var key = cfg().supabaseKey || "";
    return {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    };
  }

  function readSession() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeSession(data) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function clearSession() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function isValid(session) {
    if (!session || !session.session_token || !session.expires_at) return false;
    return new Date(session.expires_at).getTime() > Date.now();
  }

  function displayName(session) {
    if (!session || !session.display) return "Водитель EV RACE";
    var d = session.display;
    if (d.name) return d.name;
    if (d.username) return "@" + d.username;
    if (d.first_name) return d.first_name;
    return "Водитель EV RACE";
  }

  function mountTelegramWidget(container) {
    if (!container || container.dataset.mounted === "1") return;
    container.dataset.mounted = "1";
    container.innerHTML = "";
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", TG_BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);
  }

  window.onTelegramAuth = async function (user) {
    var root = document.getElementById("review-form-root");
    if (root) {
      root.innerHTML =
        '<p class="loc-form-loading">Секунду…</p>';
    }

    try {
      var res = await fetch(apiBase() + "/telegram-auth", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(user),
      });
      var data = await res.json().catch(function () {
        return {};
      });

      if (!res.ok) {
        var errMsg =
          data.error === "banned"
            ? "Отправка временно недоступна. Если это ошибка — напиши нам."
            : "Не удалось войти. Обнови страницу и попробуй снова.";
        if (root) root.innerHTML = '<p class="loc-form-error">' + errMsg + "</p>";
        return;
      }

      writeSession({
        user_hash: data.user_hash,
        session_token: data.session_token,
        expires_at: data.expires_at,
        display: data.display || {},
      });

      document.dispatchEvent(new CustomEvent("evrace:auth-ready"));
    } catch (e) {
      if (root) {
        root.innerHTML =
          '<p class="loc-form-error">Сеть глючит. Проверь интернет и попробуй снова.</p>';
      }
    }
  };

  window.EvraceAuth = {
    STORAGE_KEY: STORAGE_KEY,
    TURNSTILE_SITE_KEY: TURNSTILE_SITE_KEY,
    TG_BOT_USERNAME: TG_BOT_USERNAME,
    readSession: readSession,
    writeSession: writeSession,
    clearSession: clearSession,
    isValid: isValid,
    displayName: displayName,
    apiBase: apiBase,
    apiHeaders: apiHeaders,
    authHeaders: function () {
      var s = readSession();
      var h = apiHeaders();
      if (s && s.session_token) {
        h.Authorization = "Bearer " + s.session_token;
      }
      return h;
    },
    mountTelegramWidget: mountTelegramWidget,
    renderGuest: function (root) {
      if (!root) return;
      root.innerHTML =
        '<p class="loc-form-sub">Войди через Telegram — так оценка попадёт в общую картину.</p>' +
        '<p class="loc-form-tg-intro">Войти через Telegram</p>' +
        '<p class="loc-form-tg-why">Так мы знаем, что ты живой человек, а не бот с пятой звездой.</p>' +
        '<div id="tg-login-mount" class="loc-tg-widget"></div>' +
        '<p class="loc-privacy-note">🔒 Telegram нужен только чтобы отличить тебя от ботов. Имя в БД не храним — только анонимный hash.</p>' +
        '<p class="loc-form-meta">Быстро · Честно · Одна оценка на локацию</p>';
      mountTelegramWidget(document.getElementById("tg-login-mount"));
    },
    logout: function () {
      clearSession();
      document.dispatchEvent(new CustomEvent("evrace:auth-logout"));
    },
  };
})();
