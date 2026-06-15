(function () {
  "use strict";

  var TURNSTILE_SITE_KEY = "0x4AAAAAACtvG988gnpS7YBa";
  var MAX_SIGNALS = 4;
  var SUCCESS_AUTO_CLOSE_MS = 2000;
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
    modalOpen: false,
    successView: false,
    turnstileWidgetId: null,
    canEdit: true,
    editSecondsRemaining: 0,
    cooldownSeconds: 300,
    isEditing: false,
  };

  var modalEl = null;
  var panelEl = null;
  var lastFocusEl = null;
  var successTimer = null;
  var modalTitleEl = null;

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
    return document.getElementById("cs-signals-modal-root");
  }

  function aggRoot() {
    return document.getElementById("community-signals-agg");
  }

  function addBtn() {
    return document.getElementById("loc-cs-add-btn");
  }

  function editBtn() {
    return document.getElementById("loc-cs-edit-btn");
  }

  function mineLegend() {
    return document.getElementById("loc-cs-mine-legend");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatCooldown(seconds) {
    var s = Math.max(0, parseInt(String(seconds), 10) || 0);
    if (s < 60) return s + " сек";
    var m = Math.ceil(s / 60);
    return m === 1 ? "1 мин" : m + " мин";
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

  function signalIconUrl(slug) {
    return (
      "/assets/icons/community-signals/arcade/" + encodeURIComponent(slug) + ".svg"
    );
  }

  function signalIconHtml(slug) {
    return (
      '<img class="cs-signal-icon" src="' +
      escapeHtml(signalIconUrl(slug)) +
      '" alt="" width="20" height="20" decoding="async" loading="lazy">'
    );
  }

  var MINE_MARK_SVG =
    '<svg class="cs-agg-mine-mark-svg" viewBox="0 0 12 10" width="12" height="10" aria-hidden="true" focusable="false">' +
    '<path d="M1 5.5 L4.5 9 L11 1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/>' +
    "</svg>";

  function mineMarkHtml(title) {
    var label = title || "Ваше наблюдение";
    return (
      '<span class="cs-agg-mine-mark" title="' +
      escapeHtml(label) +
      '" aria-label="' +
      escapeHtml(label) +
      '">' +
      MINE_MARK_SVG +
      "</span>"
    );
  }

  function userSlugSet() {
    var set = {};
    state.selection.forEach(function (s) {
      if (s.slug) set[s.slug] = true;
    });
    return set;
  }

  function renderAggChip(signal, count, isMine) {
    var pol = sentimentKey(signal.sentiment);
    var mineClass = isMine ? " cs-agg-chip--mine" : "";
    var meta =
      '<div class="cs-agg-meta"><span class="cs-agg-count">×' +
      escapeHtml(String(count)) +
      "</span>";
    if (isMine) meta += mineMarkHtml("Ваше наблюдение");
    meta += "</div>";
    return (
      '<div class="cs-agg-chip cs-agg-chip--' +
      pol +
      mineClass +
      '" data-signal-slug="' +
      escapeHtml(signal.slug) +
      '">' +
      signalIconHtml(signal.slug) +
      '<span class="cs-agg-label">' +
      escapeHtml(signal.label) +
      "</span>" +
      meta +
      "</div>"
    );
  }

  function renderAreaAFromSignals(signals) {
    var root = aggRoot();
    if (!root) return;
    if (!signals || !signals.length) {
      root.innerHTML =
        '<p class="cs-agg-empty">СТАНЦИЯ ЖДЁТ ПЕРВОЕ НАБЛЮДЕНИЕ СООБЩЕСТВА</p>';
      return;
    }
    var mine = userSlugSet();
    var chips = signals
      .map(function (s) {
        return renderAggChip(s, s.count || 0, Boolean(mine[s.slug]));
      })
      .join("");
    root.innerHTML = '<div class="cs-agg-chips">' + chips + "</div>";
  }

  function updateCtaUI() {
    var add = addBtn();
    var edit = editBtn();
    var legend = mineLegend();
    var hasMine = state.submitted && state.selection.length;

    if (hasMine) {
      if (add) add.hidden = true;
      if (edit) {
        edit.hidden = false;
        edit.disabled = !state.canEdit;
        edit.title = state.canEdit
          ? ""
          : "Можно изменить через " + formatCooldown(state.editSecondsRemaining);
      }
      if (legend) legend.hidden = false;
    } else {
      if (add) add.hidden = state.formSignals.length === 0;
      if (edit) edit.hidden = true;
      if (legend) legend.hidden = true;
    }
  }

  function renderRecapChips(items) {
    var html = '<div class="cs-success-chips">';
    items.forEach(function (s) {
      var pol = sentimentKey(s.sentiment);
      html +=
        '<span class="cs-success-chip cs-success-chip--' +
        pol +
        ' is-on"><span class="cs-success-chip-label">' +
        escapeHtml(s.label) +
        " ✓</span></span>";
    });
    html += "</div>";
    return html;
  }

  function clearSuccessTimer() {
    if (successTimer) {
      clearTimeout(successTimer);
      successTimer = null;
    }
  }

  function renderSuccessView(selection) {
    var root = formRoot();
    if (!root) return;
    state.successView = true;
    destroyTurnstile();
    var title = state.isEditing ? "✓ Наблюдение обновлено" : "✓ Наблюдение учтено";
    var bodyHtml = selection.length
      ? renderRecapChips(selection)
      : '<p class="cs-success-lead">Ваш вклад убран из агрегации.</p>';
    root.innerHTML =
      '<div class="cs-success">' +
      '<p class="cs-success-title">' +
      title +
      "</p>" +
      '<p class="cs-success-lead">Спасибо за вклад в EVrace</p>' +
      bodyHtml +
      '<button type="button" class="loc-btn loc-btn-community cs-success-close" id="cs-success-close">Закрыть</button>' +
      "</div>";
    root.querySelector("#cs-success-close")?.addEventListener("click", function () {
      closeModal(true);
    });
    clearSuccessTimer();
    successTimer = setTimeout(function () {
      closeModal(true);
    }, SUCCESS_AUTO_CLOSE_MS);
  }

  function setModalTitle() {
    if (!modalTitleEl) {
      modalTitleEl = document.getElementById("loc-cs-modal-title");
    }
    if (modalTitleEl) {
      modalTitleEl.textContent = state.isEditing
        ? "Изменить наблюдение"
        : "Добавить наблюдение";
    }
  }

  function buildFormHtml() {
    var cooldownHint =
      '<p class="cs-form-cooldown">Изменения можно вносить не чаще одного раза в 5 минут.</p>';
    var cooldownWait =
      state.isEditing && !state.canEdit
        ? '<p class="cs-form-error">Следующее изменение через ' +
          escapeHtml(formatCooldown(state.editSecondsRemaining)) +
          ".</p>"
        : "";

    var html =
      '<div class="cs-form">' +
      '<p class="cs-form-hint">Выберите до 4 наблюдений</p>' +
      cooldownHint +
      cooldownWait +
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
        '">' +
        signalIconHtml(s.slug) +
        '<span class="cs-form-chip-label">' +
        escapeHtml(s.label) +
        "</span></button>";
    });

    var submitLabel = state.isEditing ? "Сохранить" : "Учесть наблюдение";

    html +=
      "</div>" +
      '<p class="cs-form-error" id="cs-form-error" hidden></p>' +
      '<div class="cs-turnstile" id="cs-turnstile"></div>' +
      '<button type="button" class="loc-btn loc-btn-accent cs-submit" id="cs-submit" disabled>' +
      escapeHtml(submitLabel) +
      "</button>" +
      "</div>";
    return html;
  }

  function renderForm() {
    var root = formRoot();
    if (!root || !state.modalOpen || state.successView) return;
    if (!state.formSignals.length) {
      root.innerHTML =
        '<p class="cs-form-loading">Наблюдения для этой локации временно недоступны.</p>';
      return;
    }
    setModalTitle();
    root.innerHTML = buildFormHtml();
    bindFormEvents();
    updateSubmitState();
    mountTurnstile();
  }

  function destroyTurnstile() {
    state.turnstileToken = "";
    if (window.turnstile && state.turnstileWidgetId != null) {
      try {
        window.turnstile.remove(state.turnstileWidgetId);
      } catch (_e) {
        /* ignore */
      }
    }
    state.turnstileWidgetId = null;
    var box = document.getElementById("cs-turnstile");
    if (box) box.innerHTML = "";
  }

  function resetTurnstileWidget() {
    state.turnstileToken = "";
    updateSubmitState();
    if (window.turnstile && state.turnstileWidgetId != null) {
      try {
        window.turnstile.reset(state.turnstileWidgetId);
      } catch (_e) {
        destroyTurnstile();
        mountTurnstile();
      }
    }
  }

  function mountTurnstile() {
    if (!state.modalOpen || state.successView) return;
    if (!state.formSignals.length) return;
    var box = document.getElementById("cs-turnstile");
    if (!box) return;
    if (!window.turnstile) {
      setTimeout(mountTurnstile, 200);
      return;
    }

    destroyTurnstile();

    try {
      state.turnstileWidgetId = window.turnstile.render(box, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        size: "flexible",
        callback: function (token) {
          state.turnstileToken = token || "";
          updateSubmitState();
        },
        "expired-callback": function () {
          resetTurnstileWidget();
        },
        "timeout-callback": function () {
          resetTurnstileWidget();
        },
        "error-callback": function () {
          resetTurnstileWidget();
        },
      });
    } catch (_e) {
      setTimeout(mountTurnstile, 300);
    }
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

    var minSelected = state.isEditing ? 0 : 1;
    var cooldownBlocked = state.isEditing && !state.canEdit;
    var ok =
      !cooldownBlocked &&
      state.selected.length >= minSelected &&
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
    if (submitBtn) {
      submitBtn.addEventListener("click", function () {
        if (submitBtn.disabled) {
          if (state.isEditing && !state.canEdit) {
            showError(
              "Следующее изменение через " + formatCooldown(state.editSecondsRemaining) + ".",
            );
          } else if (!state.turnstileToken) {
            showError("Подождите завершения проверки безопасности.");
          } else if (!state.isEditing && state.selected.length < 1) {
            showError("Выбери хотя бы одно наблюдение");
          }
          return;
        }
        onSubmit();
      });
    }
  }

  function errorMessage(code, payload) {
    payload = payload || {};
    if (code === "edit_cooldown") {
      return (
        "Следующее изменение через " +
        formatCooldown(payload.edit_seconds_remaining || payload.cooldown_seconds)
      );
    }
    var map = {
      conflicting_signals: "Эти наблюдения противоречат друг другу — сними одно.",
      empty_selection: "Выбери хотя бы одно наблюдение",
      too_many_signals: "Можно выбрать не больше 4 сигналов.",
      turnstile_failed: "Проверка не прошла. Обнови страницу и попробуй снова.",
      rate_limited: "Слишком много попыток. Попробуй позже.",
    };
    return map[code] || "Не удалось отправить. Попробуйте позже.";
  }

  function applyStatusData(data) {
    if (data.signals) {
      renderAreaAFromSignals(data.signals);
    }

    state.cooldownSeconds = data.cooldown_seconds || 300;
    state.canEdit = data.can_edit !== false;
    state.editSecondsRemaining = data.edit_seconds_remaining || 0;

    if (data.submitted) {
      state.submitted = true;
      state.selection = data.selection || [];
    } else {
      state.submitted = false;
      state.selection = [];
    }

    updateCtaUI();
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

      if (!res.ok) {
        if (data.error === "edit_cooldown") {
          state.canEdit = false;
          state.editSecondsRemaining = data.edit_seconds_remaining || 0;
          updateCtaUI();
        }
        showError(errorMessage(data.error, data));
        resetTurnstileWidget();
        state.submitting = false;
        updateSubmitState();
        return;
      }

      if (data.signals) {
        renderAreaAFromSignals(data.signals);
      }

      if (data.removed) {
        state.submitted = false;
        state.selection = [];
        state.canEdit = true;
        state.editSecondsRemaining = 0;
      } else {
        state.submitted = true;
        state.selection = data.selection || [];
        state.canEdit = false;
        state.editSecondsRemaining = state.cooldownSeconds;
      }

      updateCtaUI();
      state.submitting = false;

      if (state.isEditing) {
        closeModal(true);
        return;
      }

      renderSuccessView(data.selection || []);
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

      applyStatusData(data);
    } catch (err) {
      updateCtaUI();
    }
  }

  function focusableInPanel() {
    if (!panelEl) return [];
    return Array.prototype.slice.call(
      panelEl.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }

  function trapFocus(e) {
    if (!state.modalOpen || e.key !== "Tab" || !panelEl) return;
    var nodes = focusableInPanel();
    if (!nodes.length) return;
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function requestClose() {
    if (state.submitting) {
      if (!window.confirm("Прервать отправку?")) return;
      state.submitting = false;
    }
    closeModal(true);
  }

  function openModal(forEdit) {
    if (!modalEl || state.modalOpen) return;
    if (forEdit) {
      if (!state.submitted || !state.canEdit) return;
      state.isEditing = true;
      state.selected = state.selection.map(function (s) {
        return s.slug;
      });
    } else {
      if (state.submitted) return;
      state.isEditing = false;
      state.selected = [];
    }
    if (!state.formSignals.length) return;

    state.modalOpen = true;
    state.successView = false;
    state.turnstileToken = "";
    showError("");
    lastFocusEl = document.activeElement;
    modalEl.hidden = false;
    document.body.classList.add("loc-modal-open");
    renderForm();
    var nodes = focusableInPanel();
    if (nodes.length) nodes[0].focus();
  }

  function closeModal(force) {
    if (!modalEl || !state.modalOpen) return;
    if (state.submitting && !force) {
      requestClose();
      return;
    }
    clearSuccessTimer();
    destroyTurnstile();
    state.modalOpen = false;
    state.successView = false;
    state.submitting = false;
    state.isEditing = false;
    state.selected = [];
    modalEl.hidden = true;
    document.body.classList.remove("loc-modal-open");
    var root = formRoot();
    if (root) root.innerHTML = "";
    if (lastFocusEl && typeof lastFocusEl.focus === "function") {
      lastFocusEl.focus();
    } else if (state.submitted) {
      editBtn()?.focus();
    } else {
      addBtn()?.focus();
    }
  }

  function onKeyDown(e) {
    if (!state.modalOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      requestClose();
    }
    trapFocus(e);
  }

  function initModalChrome() {
    modalEl = document.getElementById("loc-cs-modal");
    panelEl = modalEl?.querySelector(".loc-action-modal-panel");
    modalTitleEl = document.getElementById("loc-cs-modal-title");
    if (!modalEl) return;

    addBtn()?.addEventListener("click", function () {
      openModal(false);
    });
    editBtn()?.addEventListener("click", function () {
      loadStatus().then(function () {
        if (!state.submitted || !state.canEdit) return;
        openModal(true);
      });
    });

    modalEl.querySelector("#loc-cs-modal-close")?.addEventListener("click", requestClose);
    modalEl.querySelectorAll("[data-modal-dismiss]").forEach(function (el) {
      el.addEventListener("click", requestClose);
    });

    document.addEventListener("keydown", onKeyDown);
  }

  async function init() {
    var data = readJson("loc-signals-data");
    state.locationId = data.location_id || 0;
    state.formSignals = data.form_signals || [];
    if (!aggRoot() || !state.locationId) return;
    initModalChrome();
    await loadStatus();
    if (window.location.hash === "#add-signal") {
      if (state.submitted) openModal(true);
      else openModal(false);
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
