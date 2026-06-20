(function () {
  var STORAGE_KEY = "evrace_tg_session";
  var TURNSTILE_SITE_KEY = "0x4AAAAAACtvG988gnpS7YBa";
  var TG_BOT_USERNAME = "evrace_auth_bot";
  var DEFAULT_IDENTITY_API = "https://api.evrace.by/functions/v1";

  function cfg() {
    return window.__EVRACE__ || {};
  }

  function identityApiBase() {
    var url = cfg().identityApiUrl || DEFAULT_IDENTITY_API;
    return String(url).replace(/\/$/, "");
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

  function identityHeaders() {
    return { "Content-Type": "application/json" };
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

  function isVerified(session) {
    session = session || readSession();
    return !!(isValid(session) && session.is_verified);
  }

  function displayName(session) {
    if (!session || !session.display) return "Водитель EV RACE";
    var d = session.display;
    if (d.name) return d.name;
    if (d.username) return "@" + d.username;
    if (d.first_name) return d.first_name;
    return "Водитель EV RACE";
  }

  function applyAuthPayload(data) {
    var prev = readSession() || {};
    writeSession({
      session_token: data.session_token || prev.session_token,
      expires_at: data.expires_at || prev.expires_at,
      is_verified: !!data.is_verified,
      evr_id: data.evr_id || (data.is_verified ? prev.evr_id : null) || null,
      pseudonym: data.pseudonym != null ? data.pseudonym : prev.pseudonym || null,
      member_since: data.member_since || prev.member_since || null,
      display: data.display || prev.display || {},
    });
  }

  function normalizeTelegramUser(user) {
    if (!user || user.id == null || user.auth_date == null || !user.hash) return null;
    var out = {
      id: Number(user.id),
      auth_date: Number(user.auth_date),
      hash: String(user.hash),
    };
    if (user.first_name) out.first_name = String(user.first_name);
    if (user.last_name) out.last_name = String(user.last_name);
    if (user.username) out.username = String(user.username);
    if (user.photo_url) out.photo_url = String(user.photo_url);
    return out;
  }

  function resetTelegramWidget(container) {
    if (!container) return;
    delete container.dataset.mounted;
    container.innerHTML = "";
  }

  function entryErrorMessage(code, phase) {
    if (code === "identity_exists") {
      return "EVR ID уже создан. Переходим в профиль…";
    }
    if (code === "invalid_hash" || code === "invalid_payload") {
      return "Telegram не подтвердил вход. Проверь, что открываешь evrace.by, и попробуй снова.";
    }
    if (code === "auth_expired") {
      return "Сессия Telegram устарела. Нажми кнопку ещё раз.";
    }
    if (code === "invalid_session" || code === "invalid_telegram_auth") {
      return phase === "create"
        ? "Сессия не подтвердилась. Попробуй снова — войдём через Telegram заново."
        : "Не удалось подтвердить Telegram. Попробуй снова.";
    }
    if (code === "session_failed" || code === "db_error" || code === "evr_id_generation_failed") {
      return "Сервер временно не отвечает. Попробуй через минуту.";
    }
    if (phase === "login") {
      return "Не удалось войти через Telegram. Попробуй снова.";
    }
    return code
      ? "Не удалось создать EVR ID (" + code + "). Попробуй снова."
      : "Не удалось создать EVR ID. Попробуй снова.";
  }

  function showEntryError(container, message, opts) {
    opts = opts || {};
    if (!container) return;
    var html = '<p class="cp-entry-error">' + message + "</p>";
    if (opts.retry) {
      html +=
        '<button type="button" class="cp-entry-retry-btn">Попробовать снова</button>';
    }
    container.innerHTML = html;
    if (opts.retry) {
      var btn = container.querySelector(".cp-entry-retry-btn");
      if (btn) {
        btn.addEventListener("click", function () {
          resetTelegramWidget(container);
          mountTelegramWidget(container);
        });
      }
    }
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
    layoutTelegramWidget(container);
  }

  function layoutTelegramWidget(container) {
    if (!container) return;
    var tries = 0;
    var timer = setInterval(function () {
      var iframe = container.querySelector("iframe");
      tries += 1;
      if (!iframe && tries < 50) return;
      clearInterval(timer);
      if (!iframe) return;
      iframe.style.display = "block";
      iframe.style.marginLeft = "auto";
      iframe.style.marginRight = "auto";
      var wrapW = container.clientWidth;
      var iframeW = iframe.getBoundingClientRect().width || 238;
      if (wrapW > 0 && iframeW > 0 && window.innerWidth <= 640 && wrapW > iframeW + 8) {
        var scale = wrapW / iframeW;
        iframe.style.transform = "scale(" + scale + ")";
        iframe.style.transformOrigin = "top center";
        container.style.height = Math.ceil((iframe.offsetHeight || 40) * scale) + "px";
      }
    }, 80);
  }

  async function telegramLogin(user) {
    var payload = normalizeTelegramUser(user);
    if (!payload) {
      var bad = new Error("invalid_payload");
      bad.code = "invalid_payload";
      throw bad;
    }
    var res = await fetch(identityApiBase() + "/telegram-auth", {
      method: "POST",
      headers: identityHeaders(),
      body: JSON.stringify(payload),
    });
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      var err = new Error(data.error || "auth_failed");
      err.code = data.error;
      err.phase = "login";
      throw err;
    }
    applyAuthPayload(data);
    return data;
  }

  async function createIdentity(pseudonym, telegramUser) {
    var body = { pseudonym: pseudonym || null };
    var tg = normalizeTelegramUser(telegramUser);
    if (tg) body.telegram = tg;
    var res = await fetch(identityApiBase() + "/community-identity-create", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      var err = new Error(data.error || "create_failed");
      err.code = data.error;
      err.phase = "create";
      throw err;
    }
    applyAuthPayload(Object.assign({ is_verified: true }, data));
    return data;
  }

  async function fetchMe() {
    if (!isValid(readSession())) return null;
    var res = await fetch(identityApiBase() + "/community-identity-me", {
      headers: authHeaders(),
    });
    var data = await res.json().catch(function () {
      return null;
    });
    if (!res.ok) {
      if (res.status === 401) clearSession();
      return null;
    }
    var session = readSession();
    if (session) {
      session.is_verified = !!data.is_verified;
      if (data.evr_id) session.evr_id = data.evr_id;
      writeSession(session);
    }
    return data;
  }

  async function fetchProfile() {
    if (!isValid(readSession())) return null;
    var res = await fetch(identityApiBase() + "/community-identity-profile", {
      headers: authHeaders(),
    });
    var data = await res.json().catch(function () {
      return null;
    });
    if (!res.ok) {
      if (res.status === 401) clearSession();
      return null;
    }
    var session = readSession();
    if (session && data.evr_id) {
      session.evr_id = data.evr_id;
      session.pseudonym = data.pseudonym;
      session.member_since = data.member_since;
      session.is_verified = true;
      writeSession(session);
    }
    return data;
  }

  function authHeaders() {
    var s = readSession();
    var h = identityHeaders();
    if (s && s.session_token) {
      h.Authorization = "Bearer " + s.session_token;
    }
    return h;
  }

  function contributionHref() {
    return isVerified() ? "/my" : "/evr-id";
  }

  window.onTelegramAuth = async function (user) {
    var entryMount = document.getElementById("tg-login-mount");
    var reviewRoot = document.getElementById("review-form-root");

    if (entryMount) {
      entryMount.innerHTML = '<p class="cp-entry-loading">Секунду…</p>';
      try {
        var authData = await telegramLogin(user);
        if (authData.is_verified) {
          location.href = "/my";
          return;
        }
        await createIdentity(null, user);
        location.href = "/welcome";
      } catch (e) {
        var phase = e.phase || "create";
        var msg = entryErrorMessage(e.code, phase);
        var canRetry = e.code !== "identity_exists";
        showEntryError(entryMount, msg, { retry: canRetry });
        if (e.code === "identity_exists") {
          setTimeout(function () {
            location.href = "/my";
          }, 1200);
        }
      }
      return;
    }

    if (reviewRoot) {
      reviewRoot.innerHTML = '<p class="loc-form-loading">Секунду…</p>';
    }

    try {
      await telegramLogin(user);
      document.dispatchEvent(new CustomEvent("evrace:auth-ready"));
    } catch (e) {
      if (reviewRoot) {
        reviewRoot.innerHTML =
          '<p class="loc-form-error">Не удалось войти. Обнови страницу и попробуй снова.</p>';
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
    isVerified: isVerified,
    displayName: displayName,
    apiBase: apiBase,
    identityApiBase: identityApiBase,
    apiHeaders: apiHeaders,
    authHeaders: authHeaders,
    telegramLogin: telegramLogin,
    createIdentity: createIdentity,
    fetchMe: fetchMe,
    fetchProfile: fetchProfile,
    contributionHref: contributionHref,
    mountTelegramWidget: mountTelegramWidget,
    resetTelegramWidget: resetTelegramWidget,
    normalizeTelegramUser: normalizeTelegramUser,
    renderGuest: function (root) {
      if (!root) return;
      root.innerHTML =
        '<p class="loc-form-sub">Войди через Telegram — так оценка попадёт в общую картину.</p>' +
        '<p class="loc-form-tg-intro">Войти через Telegram</p>' +
        '<p class="loc-form-tg-why">Так мы знаем, что ты живой человек, а не бот с пятой звездой.</p>' +
        '<div id="tg-login-mount" class="loc-tg-widget"></div>' +
        '<p class="loc-privacy-note">🔒 Telegram нужен только для подтверждения личности. Username и фото в БД не храним.</p>' +
        '<p class="loc-form-meta">Быстро · Честно · Одна оценка на локацию</p>';
      mountTelegramWidget(document.getElementById("tg-login-mount"));
    },
    logout: function () {
      clearSession();
      document.dispatchEvent(new CustomEvent("evrace:auth-logout"));
    },
  };
})();
