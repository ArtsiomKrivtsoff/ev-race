(function () {
  var state = {
    rating: 0,
    tagKeys: [],
    isEdit: false,
    submitting: false,
  };

  function pageData() {
    var el = document.getElementById("loc-page-data");
    if (!el) return {};
    try {
      return JSON.parse(el.textContent || "{}");
    } catch (e) {
      return {};
    }
  }

  function rootEl() {
    return document.getElementById("review-form-root");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderStarsInput() {
    var html = '<div class="loc-star-field"><span class="loc-field-label">Твоя оценка <span class="loc-req">*</span></span>';
    html += '<div class="loc-star-input" role="radiogroup" aria-label="Выбери от 1 до 5">';
    for (var i = 1; i <= 5; i++) {
      var filled = i <= state.rating ? " is-on" : "";
      html +=
        '<button type="button" class="loc-star-btn' +
        filled +
        '" data-star="' +
        i +
        '" aria-label="' +
        i +
        ' из 5">' +
        (i <= state.rating ? "★" : "☆") +
        "</button>";
    }
    html += "</div></div>";
    return html;
  }

  function renderTagsInput(tags) {
    var html =
      '<div class="loc-tags-field"><span class="loc-field-label">Что бросилось в глаза?</span>' +
      '<p class="loc-field-hint">Можно несколько — или ни одного</p>' +
      '<div class="loc-tag-chips">';
    tags.forEach(function (t) {
      var sel = state.tagKeys.indexOf(t.key) >= 0 ? " is-on" : "";
      var pol = t.polarity === "negative" ? " negative" : " positive";
      html +=
        '<button type="button" class="loc-tag-chip' +
        sel +
        pol +
        '" data-tag="' +
        escapeHtml(t.key) +
        '">' +
        escapeHtml(t.label) +
        "</button>";
    });
    html += "</div></div>";
    return html;
  }

  function renderForm() {
    var auth = window.EvraceAuth;
    var root = rootEl();
    if (!root || !auth) return;

    var session = auth.readSession();
    if (!auth.isValid(session)) {
      auth.renderGuest(root);
      return;
    }

    var data = pageData();
    var tags = data.form_tags || [];
    var name = auth.displayName(session);

    root.innerHTML =
      '<div class="loc-logged-in-bar"><span class="loc-logged-in-name">Привет, ' +
      escapeHtml(name) +
      '</span><button type="button" class="loc-logout-btn" type="button">Выйти</button></div>' +
      renderStarsInput() +
      renderTagsInput(tags) +
      '<label class="loc-comment-field"><span class="loc-field-label">Расскажи, если есть что добавить</span>' +
      '<textarea class="loc-comment-input" maxlength="280" rows="3" placeholder="Необязательно. До 280 символов."></textarea>' +
      '<span class="loc-char-count">0/280</span></label>' +
      '<label class="loc-visit-field"><span class="loc-field-label">Был здесь</span>' +
      '<input type="date" class="loc-visit-input" /></label>' +
      '<div class="loc-turnstile-wrap"><div class="cf-turnstile" id="review-turnstile" data-sitekey="' +
      auth.TURNSTILE_SITE_KEY +
      '" data-theme="dark" data-size="flexible"></div></div>' +
      '<button type="button" class="loc-btn loc-btn-community loc-submit-review">' +
      (state.isEdit ? "ОБНОВИТЬ" : "ОТПРАВИТЬ") +
      "</button>" +
      '<p class="loc-privacy-note">🔒 Без спама. Без продажи данных. Один человек — одна оценка на точку.</p>';

    root.querySelector(".loc-logout-btn")?.addEventListener("click", function () {
      auth.logout();
    });

    root.querySelectorAll(".loc-star-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.rating = parseInt(btn.dataset.star, 10) || 0;
        root.querySelectorAll(".loc-star-btn").forEach(function (b, idx) {
          var on = idx < state.rating;
          b.classList.toggle("is-on", on);
          b.textContent = on ? "★" : "☆";
          b.setAttribute("aria-label", idx + 1 + " из 5");
        });
      });
    });

    root.querySelectorAll(".loc-tag-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var key = chip.dataset.tag;
        var idx = state.tagKeys.indexOf(key);
        if (idx >= 0) {
          state.tagKeys.splice(idx, 1);
          chip.classList.remove("is-on");
        } else {
          state.tagKeys.push(key);
          chip.classList.add("is-on");
        }
      });
    });

    var ta = root.querySelector(".loc-comment-input");
    var counter = root.querySelector(".loc-char-count");
    if (ta && counter) {
      ta.addEventListener("input", function () {
        counter.textContent = ta.value.length + "/280";
      });
    }

    if (window.turnstile && document.getElementById("review-turnstile")) {
      try {
        window.turnstile.render("#review-turnstile");
      } catch (e) {}
    }

    root.querySelector(".loc-submit-review")?.addEventListener("click", submitReview);
  }

  function renderSuccess(opts) {
    var root = rootEl();
    if (!root) return;
    var body = opts.wasFirst
      ? "Ты первый, кто оценил эту точку. Респект."
      : opts.wasEdit
        ? "Обновили твою оценку. Актуально — это хорошо."
        : "Учтём в рейтинге станции. Спасибо, что не промолчал.";

    root.innerHTML =
      '<div class="loc-form-success">' +
      "<h3 class=\"loc-form-success-title\">✓ Принято</h3>" +
      "<p class=\"loc-form-success-body\">" +
      escapeHtml(body) +
      "</p>" +
      '<p class="loc-form-success-photo">Есть фото этой станции?<br>Покажи, как она выглядит на месте.</p>' +
      '<a class="loc-btn loc-btn-community" href="#add-photo">📷 ПОКАЖИ СТАНЦИЮ</a>' +
      '<button type="button" class="loc-form-done-btn">Готово</button>' +
      "</div>";

    root.querySelector(".loc-form-done-btn")?.addEventListener("click", function () {
      renderForm();
    });
  }

  function updateHeroRating(avg, count) {
    document.querySelectorAll(".loc-rating-val").forEach(function (el) {
      if (avg != null && count > 0) {
        el.textContent = Number(avg).toFixed(1).replace(".", ",");
      }
    });
    document.querySelectorAll(".loc-rating-count").forEach(function (el) {
      if (count > 0) {
        el.textContent = count + " отзыв" + (count === 1 ? "" : count < 5 ? "а" : "ов");
      }
    });
  }

  async function submitReview() {
    if (state.submitting) return;
    var auth = window.EvraceAuth;
    var root = rootEl();
    if (!auth || !auth.isValid(auth.readSession())) {
      auth?.renderGuest(root);
      return;
    }

    if (state.rating < 1) {
      alert("Выбери оценку от 1 до 5");
      return;
    }

    var token = root.querySelector('[name="cf-turnstile-response"]')?.value;
    if (!token) {
      alert("Проверка не прошла. Обнови страницу и попробуй снова.");
      return;
    }

    var data = pageData();
    var session = auth.readSession();
    var comment = root.querySelector(".loc-comment-input")?.value?.trim() || "";
    var visitDate = root.querySelector(".loc-visit-input")?.value || null;

    state.submitting = true;
    var btn = root.querySelector(".loc-submit-review");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "СЕКУНДУ…";
    }

    try {
      var res = await fetch(auth.apiBase() + "/submit-review", {
        method: "POST",
        headers: auth.authHeaders(),
        body: JSON.stringify({
          location_id: data.location_id,
          rating: state.rating,
          tag_keys: state.tagKeys,
          comment: comment,
          visit_date: visitDate,
          turnstile_token: token,
          author_display: auth.displayName(session),
        }),
      });

      var payload = await res.json().catch(function () {
        return {};
      });

      if (!res.ok) {
        var msg =
          payload.error === "session_expired"
            ? "Сессия устарела. Войди через Telegram ещё раз."
            : payload.error === "turnstile_failed"
              ? "Проверка не прошла. Обнови страницу и попробуй снова."
              : payload.error === "rate_limited"
                ? "Подожди немного перед следующей оценкой."
                : "Не получилось отправить. Попробуй ещё раз.";
        alert(msg);
        if (payload.error === "session_expired") auth.clearSession();
        renderForm();
        return;
      }

      updateHeroRating(payload.cached_avg_rating, payload.cached_review_count);
      renderSuccess({
        wasFirst: payload.was_first_on_location,
        wasEdit: !payload.was_new,
      });
      state.isEdit = true;
    } catch (e) {
      alert("Сеть глючит. Проверь интернет и попробуй снова.");
      renderForm();
    } finally {
      state.submitting = false;
    }
  }

  function init() {
    var root = rootEl();
    if (!root || !window.EvraceAuth) return;
    renderForm();
    document.addEventListener("evrace:auth-ready", renderForm);
    document.addEventListener("evrace:auth-logout", function () {
      state.rating = 0;
      state.tagKeys = [];
      state.isEdit = false;
      renderForm();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
