
// EVRACE LETTERS ENGINE

document.addEventListener('DOMContentLoaded', () => {

  // =========================
  // STATUS COUNTERS
  // =========================

  function updateStatusCounters() {

    const letters = document.querySelectorAll('.letter-card');

    let waiting = 0;
    let answered = 0;

    letters.forEach(letter => {

      const hasReply =
        letter.querySelector('.let-reply-block') ||
        letter.querySelector('.let-responded');

      if (hasReply) {
        answered++;
      } else {
        waiting++;
      }

    });

    const waitingEl = document.getElementById('waiting-count');
    const answeredEl = document.getElementById('reply-count');

    if (waitingEl) waitingEl.textContent = waiting;
    if (answeredEl) answeredEl.textContent = answered;

  }

  // =========================
  // TAG COUNTERS
  // =========================

  function updateTagCounters() {

    const tagMap = {};

    document.querySelectorAll('.letter-card .let-tag').forEach(tag => {

      const raw = tag.textContent
        .replace(/\|\s*\d+/g, '')
        .trim();

      if (!tagMap[raw]) {
        tagMap[raw] = 0;
      }

      tagMap[raw]++;

    });

    document.querySelectorAll('.filter-tag').forEach(filterTag => {

      const raw = filterTag.dataset.tag;

      const count = tagMap[raw] || 0;

      let counter = filterTag.querySelector('.tag-counter');

      if (!counter) {

        counter = document.createElement('span');
        counter.className = 'tag-counter';
        filterTag.appendChild(counter);

      }

      counter.textContent = ' | ' + count;

    });

  }

  // =========================
  // MOVE NEW BADGE LAST
  // =========================

  function normalizeHeaderBadges() {

    document.querySelectorAll('.let-head1').forEach(head => {

      const newBadge = head.querySelector('.let-new-badge');

      if (newBadge) {
        head.appendChild(newBadge);
      }

    });

  }

  // =========================
  // REMOVE STATUS ICONS
  // =========================

  function cleanStatuses() {

    document.querySelectorAll('.letter-want-reply, .let-responded').forEach(el => {

      el.innerHTML = el.innerHTML
        .replace('📬', '')
        .replace('✓', '')
        .trim();

    });

  }

  // =========================
  // INIT
  // =========================

  normalizeHeaderBadges();
  cleanStatuses();
  updateStatusCounters();
  updateTagCounters();

});
