(function () {
  "use strict";

  var TURNSTILE_SITE_KEY = "0x4AAAAAACtvG988gnpS7YBa";
  var MAX_FILES = 3;
  var MAX_BYTES = 10 * 1024 * 1024;

  var state = {
    status: null,
    files: [],
    turnstileToken: "",
    submitting: false,
    statusLoading: false,
    banner: "",
    bannerKind: "",
    turnstileWidgetId: null,
  };

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
      !state.statusLoading
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

  function renderForm() {
    var root = rootEl();
    if (!root) return;

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
    mountTurnstile();
  }

  function mountTurnstile() {
    if (!state.status || !state.status.can_upload) return;
    var box = document.getElementById("loc-upload-turnstile");
    if (!box || !window.turnstile) return;
    box.innerHTML = "";
    state.turnstileToken = "";
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
          state.turnstileToken = "";
          updateSubmitButton();
        },
        "error-callback": function () {
          state.turnstileToken = "";
          updateSubmitButton();
        },
      });
    } catch (_e) {
      /* turnstile not ready yet */
    }
  }

  function updateSubmitButton() {
    var btn = document.getElementById("loc-upload-submit");
    if (!btn) return;
    btn.disabled = !canSubmit();
    btn.textContent = state.submitting ? "Отправка…" : "ОТПРАВИТЬ НА МОДЕРАЦИЮ";
  }

  function resetTurnstile() {
    state.turnstileToken = "";
    if (window.turnstile && state.turnstileWidgetId != null) {
      try {
        window.turnstile.reset(state.turnstileWidgetId);
      } catch (_e) {
        /* ignore */
      }
    }
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
        renderForm();
      });
    }

    root.querySelectorAll(".loc-upload-file-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.dataset.fileIndex, 10);
        state.files = state.files.filter(function (_f, i) {
          return i !== idx;
        });
        renderForm();
      });
    });

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
          state.banner = result.body.message || "Фото отправлены на модерацию";
          state.bannerKind = "success";
          resetTurnstile();
          return fetchStatus(false);
        }
        var code = result.body.error || "server_error";
        state.banner = errorMessage(code, result.body);
        state.bannerKind = "error";
        resetTurnstile();
        renderForm();
      })
      .catch(function () {
        state.submitting = false;
        state.banner = "Не удалось отправить. Проверьте связь и попробуйте снова.";
        state.bannerKind = "error";
        resetTurnstile();
        renderForm();
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!rootEl()) return;
    fetchStatus(false);
    if (window.turnstile) return;
    var waited = 0;
    var timer = setInterval(function () {
      waited += 200;
      if (window.turnstile) {
        clearInterval(timer);
        mountTurnstile();
      } else if (waited > 10000) {
        clearInterval(timer);
      }
    }, 200);
  });
})();
