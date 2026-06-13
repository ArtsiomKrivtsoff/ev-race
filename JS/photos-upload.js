(function () {
  "use strict";

  var TURNSTILE_SITE_KEY = "0x4AAAAAACtvG988gnpS7YBa";
  var MAX_FILES = 3;
  var MAX_BYTES = 10 * 1024 * 1024;
  var SUCCESS_AUTO_CLOSE_MS = 2000;

  var state = {
    status: null,
    files: [],
    turnstileToken: "",
    submitting: false,
    statusLoading: false,
    banner: "",
    bannerKind: "",
    turnstileWidgetId: null,
    modalOpen: false,
    successView: false,
  };

  var modalEl = null;
  var panelEl = null;
  var lastFocusEl = null;
  var successTimer = null;

  function pageData() {
    var el = document.getElementById("loc-page-data");
    if (!el) return {};
    try {
      return JSON.parse(el.textContent || "{}");
    } catch (_e) {
      return {};
    }
  }

  function rootEl() {
    return document.getElementById("photo-upload-root");
  }

  function addBtn() {
    return document.getElementById("loc-photos-add-btn");
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

  function errorMessage(code, payload) {
    payload = payload || {};
    if (code === "turnstile_failed") {
      return "Проверка не прошла. Обновите страницу и попробуйте снова.";
    }
    if (code === "cooldown_active") {
      return "Следующую загрузку можно через " + formatCooldown(payload.cooldown_seconds) + ".";
    }
    if (code === "pending_limit") {
      return (
        "У вас " +
        (payload.pending_count != null ? payload.pending_count : "несколько") +
        " фото на модерации. Дождитесь решения модератора."
      );
    }
    if (code === "too_many_files") return "Можно отправить не больше 3 фото за раз.";
    if (code === "file_too_large") return "Каждый файл — не больше 10 МБ.";
    if (code === "invalid_file_type") return "Поддерживаются только изображения (JPEG, PNG, WebP).";
    if (code === "no_files") return "Выберите хотя бы одно фото.";
    if (code === "invalid_location") return "Не удалось определить локацию.";
    return "Не удалось отправить. Попробуйте позже.";
  }

  function blockedMessage(status) {
    if (!status) return "Загрузка временно недоступна.";
    if (status.cooldown_seconds > 0) {
      return "Следующую загрузку можно через " + formatCooldown(status.cooldown_seconds) + ".";
    }
    if (status.pending_count >= status.max_pending) {
      return (
        "У вас " +
        status.pending_count +
        " фото на модерации (максимум " +
        status.max_pending +
        "). Дождитесь решения модератора."
      );
    }
    return "Загрузка временно недоступна.";
  }

  function canSubmit() {
    return (
      state.status &&
      state.status.can_upload &&
      state.files.length > 0 &&
      !!state.turnstileToken &&
      !state.submitting &&
      !state.statusLoading &&
      !state.successView
    );
  }

  function renderFileList() {
    if (!state.files.length) return "";
    var items = state.files
      .map(function (file, i) {
        var kb = Math.max(1, Math.round(file.size / 1024));
        return (
          '<li class="loc-upload-file-item">' +
          "<span>" +
          escapeHtml(file.name) +
          " · " +
          kb +
          " КБ</span>" +
          '<button type="button" class="loc-upload-file-remove" data-file-index="' +
          i +
          '" aria-label="Убрать файл">×</button>' +
          "</li>"
        );
      })
      .join("");
    return '<ul class="loc-upload-file-list">' + items + "</ul>";
  }

  function updateFileListDom(root) {
    if (!root) root = rootEl();
    if (!root) return;
    var label = root.querySelector(".loc-upload-file-label");
    if (!label) return;
    var old = root.querySelector(".loc-upload-file-list");
    if (old) old.remove();
    var html = renderFileList();
    if (html) label.insertAdjacentHTML("afterend", html);
    root.querySelectorAll(".loc-upload-file-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.dataset.fileIndex, 10);
        state.files = state.files.filter(function (_f, i) {
          return i !== idx;
        });
        updateFileListDom(root);
        updateSubmitButton();
      });
    });
    updateSubmitButton();
  }

  function renderSuccessView() {
    var root = rootEl();
    if (!root) return;
    state.successView = true;
    destroyTurnstile();
    root.innerHTML =
      '<div class="loc-upload-success">' +
      '<p class="loc-upload-success-title">Фото отправлены на модерацию.</p>' +
      '<p class="loc-upload-success-body">Спасибо за вклад в сообщество EVrace.</p>' +
      '<button type="button" class="loc-btn loc-btn-community loc-upload-success-close" id="loc-upload-success-close">Закрыть</button>' +
      "</div>";
    root.querySelector("#loc-upload-success-close")?.addEventListener("click", function () {
      closeModal(true);
    });
    clearSuccessTimer();
    successTimer = setTimeout(function () {
      closeModal(true);
    }, SUCCESS_AUTO_CLOSE_MS);
  }

  function clearSuccessTimer() {
    if (successTimer) {
      clearTimeout(successTimer);
      successTimer = null;
    }
  }

  function renderForm() {
    var root = rootEl();
    if (!root || state.successView) return;

    var blocked = state.status && !state.status.can_upload;
    var bannerHtml = state.banner
      ? '<p class="loc-upload-banner loc-upload-banner--' +
        escapeHtml(state.bannerKind || "info") +
        '">' +
        escapeHtml(state.banner) +
        "</p>"
      : "";

    var formInner;
    if (state.statusLoading && !state.status) {
      formInner = '<p class="loc-upload-loading">Загрузка…</p>';
    } else if (blocked) {
      formInner =
        bannerHtml +
        '<p class="loc-upload-blocked">' +
        escapeHtml(blockedMessage(state.status)) +
        "</p>" +
        '<button type="button" class="loc-upload-refresh" id="loc-upload-refresh">Обновить статус</button>';
    } else {
      formInner =
        bannerHtml +
        '<p class="loc-upload-hint">Фото можно добавить анонимно.</p>' +
        '<p class="loc-upload-hint loc-upload-hint--sub">Через Telegram ваши публикации останутся за вами и смогут участвовать в будущих активностях и программах сообщества EVrace.</p>' +
        '<label class="loc-upload-file-label">' +
        '<span class="loc-upload-file-btn">Выбрать фото (до 3)</span>' +
        '<input type="file" class="loc-upload-file-input" accept="image/*" multiple />' +
        "</label>" +
        renderFileList() +
        '<div class="loc-upload-turnstile" id="loc-upload-turnstile"></div>' +
        '<button type="button" class="loc-btn loc-btn-community loc-upload-submit" id="loc-upload-submit"' +
        (canSubmit() ? "" : " disabled") +
        ">" +
        (state.submitting ? "Отправка…" : "ОТПРАВИТЬ НА МОДЕРАЦИЮ") +
        "</button>" +
        '<button type="button" class="loc-upload-refresh" id="loc-upload-refresh">Обновить статус</button>';
    }

    root.innerHTML =
      formInner +
      '<p class="loc-form-consent">Загружая фотографии, вы соглашаетесь с <a href="/community-rules">Правилами сообщества</a>.</p>';

    bindEvents(root);
    if (!blocked && !(state.statusLoading && !state.status)) {
      mountTurnstile();
    }
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
  }

  function resetTurnstileWidget() {
    state.turnstileToken = "";
    updateSubmitButton();
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
    if (!state.status || !state.status.can_upload) return;
    var box = document.getElementById("loc-upload-turnstile");
    if (!box) return;
    if (!window.turnstile) {
      setTimeout(mountTurnstile, 200);
      return;
    }

    destroyTurnstile();
    box.innerHTML = "";

    try {
      state.turnstileWidgetId = window.turnstile.render(box, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "dark",
        size: "flexible",
        callback: function (token) {
          state.turnstileToken = token || "";
          updateSubmitButton();
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

  function updateSubmitButton() {
    var btn = document.getElementById("loc-upload-submit");
    if (!btn) return;
    btn.disabled = !canSubmit();
    btn.textContent = state.submitting ? "Отправка…" : "ОТПРАВИТЬ НА МОДЕРАЦИЮ";
  }

  function bindEvents(root) {
    root.querySelector("#loc-upload-refresh")?.addEventListener("click", function () {
      fetchStatus(true);
    });

    var input = root.querySelector(".loc-upload-file-input");
    if (input) {
      input.addEventListener("change", function () {
        var picked = Array.prototype.slice.call(input.files || []);
        var merged = state.files.concat(picked);
        var next = [];
        var rejected = false;
        for (var i = 0; i < merged.length; i++) {
          var file = merged[i];
          if (file.size > MAX_BYTES) {
            rejected = true;
            continue;
          }
          if (next.length >= MAX_FILES) {
            rejected = true;
            continue;
          }
          next.push(file);
        }
        state.files = next;
        if (rejected) {
          state.banner = "Можно выбрать до 3 фото, каждое — не больше 10 МБ.";
          state.bannerKind = "warn";
        }
        input.value = "";
        if (rejected) renderForm();
        else updateFileListDom(root);
      });
    }

    root.querySelector("#loc-upload-submit")?.addEventListener("click", submitUpload);
  }

  function fetchStatus(manual) {
    state.statusLoading = true;
    if (manual) {
      state.banner = "";
      state.bannerKind = "";
    }
    renderForm();

    return fetch("/api/photos/status", { credentials: "same-origin" })
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (result) {
        if (!result.ok) throw new Error("status_fetch_failed");
        state.status = result.body;
        state.statusLoading = false;
        if (manual && !state.status.can_upload) {
          state.banner = blockedMessage(state.status);
          state.bannerKind = "info";
        }
        renderForm();
      })
      .catch(function () {
        state.statusLoading = false;
        state.banner = "Не удалось проверить статус. Попробуйте обновить.";
        state.bannerKind = "error";
        renderForm();
      });
  }

  function submitUpload() {
    if (!canSubmit()) return;
    var data = pageData();
    if (!data.location_id) {
      state.banner = errorMessage("invalid_location");
      state.bannerKind = "error";
      renderForm();
      return;
    }

    state.submitting = true;
    state.banner = "";
    state.bannerKind = "";
    updateSubmitButton();

    var form = new FormData();
    form.append("location_id", String(data.location_id));
    form.append("turnstile_token", state.turnstileToken);
    state.files.forEach(function (file) {
      form.append("files", file, file.name);
    });

    fetch("/api/photos/upload", {
      method: "POST",
      credentials: "same-origin",
      body: form,
    })
      .then(function (res) {
        return res.json().then(function (body) {
          return { status: res.status, body: body };
        });
      })
      .then(function (result) {
        state.submitting = false;
        if (result.status === 200) {
          state.files = [];
          state.banner = "";
          renderSuccessView();
          return;
        }
        var code = result.body.error || "server_error";
        state.banner = errorMessage(code, result.body);
        state.bannerKind = "error";
        resetTurnstileWidget();
        renderForm();
      })
      .catch(function () {
        state.submitting = false;
        state.banner = "Не удалось отправить. Проверьте связь и попробуйте снова.";
        state.bannerKind = "error";
        resetTurnstileWidget();
        renderForm();
      });
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
      if (!window.confirm("Прервать загрузку?")) return;
      state.submitting = false;
    }
    closeModal(true);
  }

  function openModal() {
    if (!modalEl || state.modalOpen) return;
    state.modalOpen = true;
    state.successView = false;
    state.files = [];
    state.banner = "";
    state.bannerKind = "";
    lastFocusEl = document.activeElement;
    modalEl.hidden = false;
    document.body.classList.add("loc-modal-open");
    fetchStatus(false).then(function () {
      var nodes = focusableInPanel();
      if (nodes.length) nodes[0].focus();
    });
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
    state.files = [];
    state.submitting = false;
    state.banner = "";
    modalEl.hidden = true;
    document.body.classList.remove("loc-modal-open");
    var root = rootEl();
    if (root) root.innerHTML = "";
    if (lastFocusEl && typeof lastFocusEl.focus === "function") {
      lastFocusEl.focus();
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
    modalEl = document.getElementById("loc-upload-modal");
    panelEl = modalEl?.querySelector(".loc-action-modal-panel");
    if (!modalEl) return;

    addBtn()?.addEventListener("click", openModal);

    modalEl.querySelector("#loc-upload-modal-close")?.addEventListener("click", requestClose);
    modalEl.querySelectorAll("[data-modal-dismiss]").forEach(function (el) {
      el.addEventListener("click", requestClose);
    });

    document.addEventListener("keydown", onKeyDown);

    if (window.location.hash === "#add-photo") {
      openModal();
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("loc-photos-add-btn")) return;
    initModalChrome();
  });
})();
