(function () {
  var TURNSTILE_SITE_KEY = "0x4AAAAAACtvG988gnpS7YBa";
  var MAX_SIGNALS = 4;
  var MOBILE_MQ = "(max-width: 899px)";
  var FORBIDDEN_PAIRS = [
    ["power_match", "power_disappointed"],
    ["access_good", "access_bad"],
  ];

  var state = {
    selected: [],
    submitted: false,
    selection: [],
    submitting: false,
    turnstileToken: "",
    formSignals: [],
    locationId: 0,
    mobileExpanded: false,
  };

  function cfg() {
    return window.__EVRACE__ || {};
  }

  function statusUrl() {
    return (
      "/api/community-signals-status?location_id=" +
      encodeURIComponent(String(state.locationId))
    );
  }

  function submitUrl() {
    return "/api/submit-community-signals";
  }

  function postHeaders() {
    return { "Content-Type": "application/json" };
  }

  function readJson(id) {
    var el = document.getElementById(id);
    if (!el) return {};
    try {
      return JSON.parse(el.textContent || "{}");
    } catch (e) {
      return {};
    }
  }

  function formRoot() {
    return document.getElementById("community-signals-form");
  }

  function aggRoot() {
    return document.getElementById("community-signals-agg");
  }

  function formBlock() {
    return document.getElementById("community-signals-input-block");
  }

  function isMobile() {
    return window.matchMedia(MOBILE_MQ).matches;
  }

  function setBlockMode(mode) {
    var block = formBlock();
    if (!block) return;
    block.classList.remove(
      "cs-mobile-collapsed",
      "cs-mobile-expanded",
      "cs-mobile-done"
    );
    if (mode) block.classList.add(mode);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function sentimentKey(sentiment) {
    if (sentiment === "negative") return "neg";
    if (sentiment === "warning") return "warn";
    return "pos";
  }

  function hasForbiddenPair(slugs) {
    var set = {};
    slugs.forEach(function (s) {
      set[s] = true;
    });
    for (var i = 0; i < FORBIDDEN_PAIRS.length; i++) {
      var pair = FORBIDDEN_PAIRS[i];
      if (set[pair[0]] && set[pair[1]]) return true;
    }
    return false;
  }

  function signalBySlug(slug) {
    for (var i = 0; i < state.formSignals.length; i++) {
      if (state.formSignals[i].slug === slug) return state.formSignals[i];
    }
    return null;
  }

  function renderAggChip(signal, count) {
    var pol = sentimentKey(signal.sentiment);
    return (
      '<div class="cs-agg-chip cs-agg-chip--' +
      pol +
      '" data-signal-slug="' +
      escapeHtml(signal.slug) +
      '">' +
      '<span class="cs-agg-label">' +
      escapeHtml(signal.label) +
      "</span>" +
      '<span class="cs-agg-count">×' +
      escapeHtml(String(count)) +
      "</span></div>"
    );
  }

  function renderAreaAFromSignals(signals) {
    var root = aggRoot();
    if (!root) return;
    if (!signals || !signals.length) {
      root.innerHTML =
        '<p class="cs-agg-empty">Станция ждёт первое наблюдение сообщества.</p>';
      return;
    }
    var chips = signals
      .map(function (s) {
        return renderAggChip(s, s.count || 0);
      })
      .join("");
    root.innerHTML = '<div class="cs-agg-chips">' + chips + "</div>";
  }

  function patchAreaA(countsDelta, selection) {
    var root = aggRoot();
    if (!root) return;

    var existing = {};
    root.querySelectorAll(".cs-agg-chip[data-signal-slug]").forEach(function (el) {
      var slug = el.getAttribute("data-signal-slug");
      var countEl = el.querySelector(".cs-agg-count");
      var n = 0;
      if (countEl) {
        var m = (countEl.textContent || "").match(/(\d+)/);
        n = m ? parseInt(m[1], 10) : 0;
      }
      existing[slug] = { el: el, count: n };
    });

    var emptyEl = root.querySelector(".cs-agg-empty");
    if (emptyEl) {
      root.innerHTML = '<div class="cs-agg-chips"></div>';
    }

    var chipsWrap = root.querySelector(".cs-agg-chips");
    if (!chipsWrap) {
      chipsWrap = document.createElement("div");
      chipsWrap.className = "cs-agg-chips";
      root.appendChild(chipsWrap);
    }

    var slugsToUpdate = Object.keys(countsDelta || {});
    if (!slugsToUpdate.length && selection) {
      selection.forEach(function (s) {
        if (slugsToUpdate.indexOf(s.slug) < 0) slugsToUpdate.push(s.slug);
      });
    }

    slugsToUpdate.forEach(function (slug) {
      var delta = (countsDelta && countsDelta[slug]) || 1;
      var sig = signalBySlug(slug);
      if (!sig) {
        var fromSel = (selection || []).find(function (s) {
          return s.slug === slug;
        });
        if (fromSel) sig = fromSel;
      }
      if (!sig) return;

      if (existing[slug]) {
        var next = existing[slug].count + delta;
        existing[slug].el.querySelector(".cs-agg-count").textContent = "×" + next;
      } else {
        chipsWrap.insertAdjacentHTML("beforeend", renderAggChip(sig, delta));
      }
    });
  }

  function renderRecapChips(items, mode) {
    var prefix = mode === "form" ? "cs-form" : "cs-success";
    var html = '<div class="' + prefix + '-chips">';
    items.forEach(function (s) {
      var pol = sentimentKey(s.sentiment);
      html +=
        '<span class="' +
        prefix +
        "-chip " +
        prefix +
        "-chip--" +
        pol +
        ' is-on"><span class="' +
        prefix +
        '-chip-label">' +
        escapeHtml(s.label) +
        " ✓</span></span>";
    });
    html += "</div>";
    return html;
  }

  function renderSuccess(selection) {
    var root = formRoot();
    if (!root) return;

    if (isMobile()) {
      setBlockMode("cs-mobile-done");
      root.innerHTML =
        '<div class="cs-success cs-mobile-success">' +
        '<p class="cs-success-title">✓ Наблюдение учтено</p>' +
        '<p class="cs-success-lead">Спасибо за вклад в EVrace</p>' +
        renderRecapChips(selection, "success") +
        '<a class="loc-btn loc-btn-community" href="#review-form">Оставить отзыв</a>' +
        '<p class="cs-review-cta-note">Для публикации отзыва потребуется Telegram</p>' +
        "</div>";
      return;
    }

    setBlockMode(null);
    root.innerHTML =
      '<div class="cs-success">' +
      '<p class="cs-success-title">✓ Сигнал учтён</p>' +
      '<p class="cs-success-lead">Спасибо за вклад в EVrace</p>' +
      renderRecapChips(selection, "success") +
      "</div>";
  }

  function renderMobileTeaser() {
    var root = formRoot();
    if (!root) return;
    setBlockMode("cs-mobile-collapsed");
    root.innerHTML =
      '<div class="cs-mobile-teaser">' +
      '<p class="cs-mobile-teaser-title">Добавить наблюдение</p>' +
      '<p class="cs-mobile-teaser-lead">Поделитесь своим опытом на этой локации</p>' +
      '<button type="button" class="loc-btn loc-btn-accent cs-mobile-expand">Добавить наблюдение</button>' +
      "</div>";
    root.querySelector(".cs-mobile-expand")?.addEventListener("click", function () {
      state.mobileExpanded = true;
      renderForm();
    });
  }

  function renderForm() {
    var root = formRoot();
    if (!root || !state.formSignals.length) {
      if (root) root.innerHTML = "";
      return;
    }

    if (isMobile() && !state.mobileExpanded && !state.submitted) {
      renderMobileTeaser();
      return;
    }

    if (isMobile()) {
      setBlockMode("cs-mobile-expanded");
    } else {
      setBlockMode(null);
    }

    var html =
      '<div class="cs-form">' +
      '<p class="cs-form-hint">Выберите до 4 наблюдений</p>' +
      '<p class="cs-form-counter">Выбрано <span id="cs-selected-count">' +
      state.selected.length +
      "</span> из " +
      MAX_SIGNALS +
      "</p>" +
      '<div class="cs-form-chips" role="group" aria-label="Сигналы сообщества">';

    state.formSignals.forEach(function (s) {
      var pol = sentimentKey(s.sentiment);
      var on = state.selected.indexOf(s.slug) >= 0 ? " is-on" : "";
      html +=
        '<button type="button" class="cs-form-chip cs-form-chip--' +
        pol +
        on +
        '" data-slug="' +
        escapeHtml(s.slug) +
        '"><span class="cs-form-chip-label">' +
        escapeHtml(s.label) +
        "</span></button>";
    });

    html +=
      "</div>" +
      '<p class="cs-form-error" id="cs-form-error" hidden></p>' +
      '<div class="cs-turnstile" id="cs-turnstile"></div>' +
      '<button type="button" class="loc-btn loc-btn-accent cs-submit" id="cs-submit" disabled>Учесть наблюдение</button>' +
      "</div>";

    root.innerHTML = html;
    mountTurnstile();
    bindFormEvents();
    updateSubmitState();
  }

  function mountTurnstile() {
    var box = document.getElementById("cs-turnstile");
    if (!box || box.dataset.mounted === "1") return;
    if (!window.turnstile) {
      setTimeout(mountTurnstile, 200);
      return;
    }
    box.dataset.mounted = "1";
    window.turnstile.render(box, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: function (token) {
        state.turnstileToken = token;
        updateSubmitState();
      },
      "expired-callback": function () {
        state.turnstileToken = "";
        updateSubmitState();
      },
      "error-callback": function () {
        state.turnstileToken = "";
        updateSubmitState();
      },
    });
  }

  function showError(msg) {
    var el = document.getElementById("cs-form-error");
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = msg;
  }

  function updateSubmitState() {
    var btn = document.getElementById("cs-submit");
    var countEl = document.getElementById("cs-selected-count");
    if (countEl) countEl.textContent = String(state.selected.length);
    if (!btn) return;
    var ok =
      state.selected.length >= 1 &&
      state.selected.length <= MAX_SIGNALS &&
      !hasForbiddenPair(state.selected) &&
      !!state.turnstileToken &&
      !state.submitting;
    btn.disabled = !ok;
  }

  function toggleSlug(slug) {
    var idx = state.selected.indexOf(slug);
    if (idx >= 0) {
      state.selected.splice(idx, 1);
    } else {
      if (state.selected.length >= MAX_SIGNALS) return;
      var next = state.selected.concat([slug]);
      if (hasForbiddenPair(next)) {
        showError("Эти наблюдения противоречат друг другу — сними одно.");
        return;
      }
      state.selected = next;
    }
    showError("");
    var chip = document.querySelector('.cs-form-chip[data-slug="' + slug + '"]');
    if (chip) chip.classList.toggle("is-on", state.selected.indexOf(slug) >= 0);
    updateSubmitState();
  }

  function bindFormEvents() {
    var root = formRoot();
    if (!root) return;
    root.querySelectorAll(".cs-form-chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        toggleSlug(btn.getAttribute("data-slug"));
      });
    });
    var submitBtn = document.getElementById("cs-submit");
    if (submitBtn) submitBtn.addEventListener("click", onSubmit);
  }

  function errorMessage(code) {
    var map = {
      conflicting_signals: "Эти наблюдения противоречат друг другу — сними одно.",
      empty_selection: "Выбери хотя бы одно наблюдение",
      too_many_signals: "Можно выбрать не больше 4 сигналов.",
      turnstile_failed: "Проверка не прошла. Обнови страницу и попробуй снова.",
      already_submitted: "Ты уже учёл наблюдение для этой локации",
      rate_limited: "Слишком много попыток. Попробуй позже.",
    };
    return map[code] || "Не удалось отправить. Попробуйте позже.";
  }

  async function onSubmit() {
    if (state.submitting) return;
    state.submitting = true;
    updateSubmitState();
    showError("");

    try {
      var res = await fetch(submitUrl(), {
        method: "POST",
        headers: postHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({
          location_id: state.locationId,
          signal_slugs: state.selected,
          turnstile_token: state.turnstileToken,
        }),
      });

      var data = {};
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }

      if (res.status === 409 && data.error === "already_submitted") {
        state.submitted = true;
        state.selection = state.selected.map(function (slug) {
          return signalBySlug(slug) || { slug: slug, label: slug, sentiment: "positive" };
        });
        renderSuccess(state.selection);
        return;
      }

      if (!res.ok) {
        showError(errorMessage(data.error));
        if (window.turnstile) {
          var box = document.getElementById("cs-turnstile");
          if (box) window.turnstile.reset(box);
        }
        state.turnstileToken = "";
        state.submitting = false;
        updateSubmitState();
        return;
      }

      state.submitted = true;
      state.selection = data.selection || [];
      if (data.signals) {
        renderAreaAFromSignals(data.signals);
      } else {
        patchAreaA(data.counts_delta, state.selection);
      }
      renderSuccess(state.selection);
    } catch (err) {
      showError("Сеть недоступна. Попробуйте позже.");
      state.submitting = false;
      updateSubmitState();
    }
  }

  async function loadStatus() {
    if (!state.locationId) return;
    try {
      var res = await fetch(statusUrl(), {
        credentials: "same-origin",
      });
      var data = {};
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }

      if (data.signals) {
        renderAreaAFromSignals(data.signals);
      }

      if (data.submitted && data.selection && data.selection.length) {
        state.submitted = true;
        state.selection = data.selection;
        renderSuccess(data.selection);
        return;
      }

      renderForm();
    } catch (err) {
      renderForm();
    }
  }

  function init() {
    var data = readJson("loc-signals-data");
    state.locationId = data.location_id || 0;
    state.formSignals = data.form_signals || [];
    if (!formRoot() || !state.locationId) return;
    loadStatus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
