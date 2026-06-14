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
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "loc-photo-thumb";
    btn.dataset.photoIndex = String(index);
    btn.dataset.photoId = String(photo.id || index);
    if (photo.approved_at) btn.dataset.approvedAt = photo.approved_at;
    if (photo.is_review_photo) btn.dataset.reviewPhoto = "1";
    if (photo.review_id != null) btn.dataset.reviewId = String(photo.review_id);
    btn.setAttribute("aria-label", "Фото " + (index + 1));

    var img = document.createElement("img");
    img.src = photo.url || "";
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    btn.appendChild(img);

    if (photo.is_review_photo) {
      var badge = document.createElement("span");
      badge.className = "loc-photo-review-badge";
      badge.textContent = "Из отзыва";
      btn.appendChild(badge);
    }

    return btn;
  }

  function initMobileGallerySwipe(grid) {
    if (!grid || !window.matchMedia("(max-width: 899px)").matches) return;

    var startX = 0;
    var startY = 0;
    var lockAxis = null;

    grid.addEventListener(
      "touchstart",
      function (e) {
        if (!e.touches.length) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        lockAxis = null;
      },
      { passive: true },
    );

    grid.addEventListener(
      "touchmove",
      function (e) {
        if (!e.touches.length) return;
        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;
        if (!lockAxis) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          lockAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        }
        if (lockAxis === "x") {
          e.preventDefault();
        }
      },
      { passive: false },
    );
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
    initMobileGallerySwipe(grid);
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
