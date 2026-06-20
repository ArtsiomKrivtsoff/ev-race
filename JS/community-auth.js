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

  async function telegramLogin(user) {
    var res = await fetch(identityApiBase() + "/telegram-auth", {
      method: "POST",
      headers: identityHeaders(),
      body: JSON.stringify(user),
    });
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      var err = new Error(data.error || "auth_failed");
      err.code = data.error;
      throw err;
    }
    applyAuthPayload(data);
    return data;
  }

  async function createIdentity(pseudonym) {
    var body = { pseudonym: pseudonym || null };
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
        await createIdentity();
        location.href = "/welcome";
      } catch (e) {
        var msg =
          e.code === "identity_exists"
            ? "Identity уже создан. Переходим в профиль…"
            : "Не удалось создать EVR ID. Обнови страницу и попробуй снова.";
        entryMount.innerHTML = '<p class="cp-entry-error">' + msg + "</p>";
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
