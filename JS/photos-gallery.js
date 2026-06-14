(function () {
  "use strict";

  function readCommunityData() {
    var el = document.getElementById("loc-community-data");
    if (!el) return {};
    try {
      return JSON.parse(el.textContent || "{}");
    } catch (_e) {
      return {};
    }
  }

  function readPageData() {
    var el = document.getElementById("loc-page-data");
    if (!el) return {};
    try {
      return JSON.parse(el.textContent || "{}");
    } catch (_e) {
      return {};
    }
  }

  function writeCommunityData(data) {
    var el = document.getElementById("loc-community-data");
    if (!el) return;
    el.textContent = JSON.stringify(data).replace(/</g, "\\u003c");
  }

  function formatApprovedAt(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
    } catch (_e) {
      return iso.slice(0, 10);
    }
  }

  function photoFromApi(item, index) {
    return {
      id: item.id,
      url: item.url,
      approved_at: item.approved_at,
      is_review_photo: Boolean(item.is_review_photo),
      review_id: item.review_id,
      review_anchor: item.review_anchor || "#reviews-list",
      index: index,
    };
  }

  function renderThumb(photo, index) {
    var el = document.createElement("div");
    el.className = "loc-photo-thumb";
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    el.dataset.photoIndex = String(index);
    el.dataset.photoId = String(photo.id || index);
    if (photo.approved_at) el.dataset.approvedAt = photo.approved_at;
    if (photo.is_review_photo) el.dataset.reviewPhoto = "1";
    if (photo.review_id != null) el.dataset.reviewId = String(photo.review_id);
    el.setAttribute("aria-label", "Фото " + (index + 1));

    var img = document.createElement("img");
    img.src = photo.url || "";
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    el.appendChild(img);

    if (photo.is_review_photo) {
      var badge = document.createElement("span");
      badge.className = "loc-photo-review-badge";
      badge.textContent = "Из отзыва";
      el.appendChild(badge);
    }

    return el;
  }

  function initMobilePhotoCarousel(galleryRoot) {
    if (!galleryRoot || !window.matchMedia("(max-width: 899px)").matches) return;

    var grid = galleryRoot.querySelector(".loc-photo-grid");
    if (!grid) return;

    function scrollBy(direction) {
      var amount = Math.max(120, Math.round(grid.clientWidth * 0.72));
      grid.scrollBy({ left: direction * amount, behavior: "smooth" });
    }

    galleryRoot.querySelectorAll(".loc-photo-carousel-hint--prev").forEach(function (hint) {
      hint.style.pointerEvents = "auto";
      hint.style.cursor = "pointer";
      hint.addEventListener("click", function () {
        scrollBy(-1);
      });
    });

    galleryRoot.querySelectorAll(".loc-photo-carousel-hint--next").forEach(function (hint) {
      hint.style.pointerEvents = "auto";
      hint.style.cursor = "pointer";
      hint.addEventListener("click", function () {
        scrollBy(1);
      });
    });
  }

  function initPhotoPanelOverflow() {
    if (window.matchMedia("(max-width: 899px)").matches) return;
    var panel = document.querySelector(".loc-photo-panel");
    if (!panel) return;
    requestAnimationFrame(function () {
      panel.classList.remove("loc-photo-panel--overflow");
      if (panel.scrollHeight > panel.clientHeight + 8) {
        panel.classList.add("loc-photo-panel--overflow");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var galleryRoot = document.getElementById("loc-photos-gallery");
    if (!galleryRoot) return;

    var grid = galleryRoot.querySelector(".loc-photo-grid");
    var loadBtn = document.getElementById("loc-photos-load-more");
    initMobilePhotoCarousel(galleryRoot);
    var community = readCommunityData();
    var page = readPageData();
    var photos = (community.photos || []).map(function (p, i) {
      return photoFromApi(p, i);
    });
    var nextCursor = galleryRoot.dataset.nextCursor || community.photos_next_cursor || "";
    var loading = false;

    function syncCommunity() {
      community.photos = photos.map(function (p) {
        return {
          id: p.id,
          url: p.url,
          approved_at: p.approved_at,
          is_review_photo: p.is_review_photo,
          review_id: p.review_id,
          review_anchor: p.review_anchor,
        };
      });
      community.photos_next_cursor = nextCursor || null;
      writeCommunityData(community);
      document.dispatchEvent(
        new CustomEvent("evrace:photos-updated", { detail: { photos: photos.slice() } }),
      );
    }

    function updateLoadMore() {
      if (!loadBtn) return;
      loadBtn.hidden = !nextCursor;
      loadBtn.disabled = false;
      loadBtn.textContent = "Ещё фото";
    }

    function appendPhotos(items) {
      items.forEach(function (item) {
        var index = photos.length;
        var photo = photoFromApi(item, index);
        photos.push(photo);
        grid.appendChild(renderThumb(photo, index));
      });
      syncCommunity();
      initPhotoPanelOverflow();
    }

    updateLoadMore();

    if (!loadBtn || !nextCursor) return;

    loadBtn.addEventListener("click", function () {
      if (loading || !nextCursor) return;
      loading = true;
      loadBtn.disabled = true;
      loadBtn.textContent = "Загрузка…";

      var qs =
        "?location_id=" +
        encodeURIComponent(String(page.location_id || "")) +
        "&limit=12&cursor=" +
        encodeURIComponent(nextCursor);

      fetch("/api/photos/gallery" + qs, { credentials: "same-origin" })
        .then(function (res) {
          if (!res.ok) throw new Error("gallery_fetch_failed");
          return res.json();
        })
        .then(function (payload) {
          appendPhotos(payload.photos || []);
          nextCursor = payload.next_cursor || "";
          galleryRoot.dataset.nextCursor = nextCursor;
          updateLoadMore();
        })
        .catch(function () {
          loadBtn.textContent = "Не удалось загрузить";
        })
        .finally(function () {
          loading = false;
          if (nextCursor) loadBtn.disabled = false;
        });
    });
  });

  window.__evraceFormatPhotoDate = formatApprovedAt;
})();
