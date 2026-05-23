
// EVRACE LETTERS ENGINE
// extracted from inline scripts

function updateFilterCounters() {
  const waiting = document.querySelectorAll('.letter-want-reply').length;
  const replied = document.querySelectorAll('.let-responded').length;

  const wc = document.getElementById('waiting-count');
  const rc = document.getElementById('reply-count');

  if (wc) wc.textContent = waiting;
  if (rc) rc.textContent = replied;
}

document.addEventListener('DOMContentLoaded', () => {
  updateFilterCounters();
});



const SURL = 'https://uvrboxrddqlasgrnnnne.supabase.co';
const SKEY = 'sb_publishable_Tmx9z-PHntDW4cZQrhOTHQ_1R1Bns7Y';
const FN_URL = SURL + '/functions/v1/submit-letter';

const OP_NAMES = {
  batteryfly:'BatteryFly', evika:'Evika', forevo:'forEVo',
  malanka:'Malanka', orange:'Orange', prizma:'Prizma',
  united:'United Co.', zaryadka:'Zaryadka', all:'ВСЕМ ОПЕРАТОРАМ'
};
const OP_CLASS = {
  batteryfly:'op-bf', evika:'op-ev', forevo:'op-fo',
  malanka:'op-ma', orange:'op-or', prizma:'op-pr',
  united:'op-uc', zaryadka:'op-za', all:''
};
const OP_COLORS = {
  batteryfly:'#005EEB', evika:'#832af5', forevo:'#b44fff',
  malanka:'#76d275', orange:'#FF6B00', prizma:'#24c3d3',
  united:'#F5821F', zaryadka:'#00cfff'
};
const ALL_TAGS = [
  'благодарность','другое','зарядная_сессия','инфраструктура',
  'карты_и_навигация','новая_локация','предложение','приложение',
  'роуминг','станция','цены_и_тарифы'
];

// ── ТЕМА ──
const THEMES = ['arcade','tesla-light','tesla-dark'];
function setTheme(theme) {
  document.getElementById('theme-css').href = 'CSS/' + theme + '.css?v=2';
  localStorage.setItem('ev_race_theme', theme);
  THEMES.forEach(function(t) {
    var b = document.getElementById('btn-' + t); if(b) b.classList.toggle('active', t===theme);
    var f = document.getElementById('foot-' + t); if(f) f.classList.toggle('active', t===theme);
  });
  document.body.className = theme !== 'arcade' ? 'theme-' + theme : '';
}
(function(){ var s = localStorage.getItem('ev_race_theme'); if(s && THEMES.includes(s)) setTheme(s); })();

// ── БУРГЕР ──
function toggleBurger() {
  var btn = document.getElementById('burgerBtn');
  var menu = document.getElementById('mobileMenu');
  var open = menu.classList.toggle('open');
  btn.classList.toggle('open', open);
}
function closeBurger() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('burgerBtn').classList.remove('open');
}
document.addEventListener('click', function(e) {
  var menu = document.getElementById('mobileMenu');
  var btn = document.getElementById('burgerBtn');
  if(menu && menu.classList.contains('open') && !menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.remove('open'); btn.classList.remove('open');
  }
});

// ── SCROLL ──
window.addEventListener('scroll', function() {
  var b = document.getElementById('scroll-top');
  if(b) b.classList.toggle('visible', window.scrollY > 300);
});

// ── ДАННЫЕ ──
var allLetters = [];
var activeOp = 'all';
var activeStatus = null;
var activeTag = null;
const PAGE_SIZE = 10;
var visibleCount = PAGE_SIZE;

async function loadLetters() {
  try {
    var res = await fetch(
      SURL + '/rest/v1/letters?select=*&status=eq.approved&order=published_at.desc&limit=200',
      { headers: { 'apikey': SKEY, 'Authorization': 'Bearer ' + SKEY } }
    );
    allLetters = await res.json();
    if (!Array.isArray(allLetters)) allLetters = [];
    updateStats();
    buildTagFilterRow();
    renderRating();
    renderLetters();
  } catch(e) {
    document.getElementById('lettersWrap').innerHTML = '<div class="loading">ОШИБКА ЗАГРУЗКИ</div>';
  }
}

function updateStats() {
  document.getElementById('stat-total').textContent = allLetters.length || '0';

  var waiting = allLetters.filter(function(l){
    if (!l.want_reply) return false;

    if (l.operator === 'all') {
      return !l.op_reply;
    }

    return !l.op_reply;
  }).length;

  document.getElementById('stat-waiting').textContent = waiting || '0';

  document.getElementById('stat-replies').textContent =
    allLetters.filter(function(l){ return l.op_reply; }).length || '0';
}

// ── РЕЙТИНГ ОПЕРАТОРОВ ──
function renderRating() {
  var block = document.getElementById('ratingBlock');

  var totalReplies = allLetters.filter(function(l){
    return !!l.op_reply;
  }).length;

  if (totalReplies === 0) {
    block.innerHTML =
      '<div class="let-rating-none">// ОПЕРАТОРЫ ПОКА НЕ ОТВЕТИЛИ НИ НА ОДНО ОБРАЩЕНИЕ<br><br>Первые публичные ответы появятся здесь.</div>';
    return;
  }

  var opKeys = Object.keys(OP_COLORS);
  var rows = [];

  opKeys.forEach(function(op) {

    var received = allLetters.filter(function(l){
      return l.operator === op || l.operator === 'all';
    });

    var replied = received.filter(function(l){
      return !!l.op_reply;
    }).length;

    var pct = received.length > 0
      ? Math.round((replied / received.length) * 100)
      : 0;

    rows.push({
      op: op,
      total: received.length,
      replied: replied,
      pct: pct
    });
  });

  rows.sort(function(a,b){
    return b.pct - a.pct || b.replied - a.replied;
  });

  var html = '<div class="let-rating-title">// ОТЗЫВЧИВОСТЬ ОПЕРАТОРОВ</div>';

  rows.forEach(function(r) {

    var color = OP_COLORS[r.op] || '#00ff41';
    var name = OP_NAMES[r.op] || r.op;
    var barW = r.pct > 0 ? Math.max(r.pct, 3) : 0;

    html +=
      '<div class="let-rating-row">' +
        '<div class="let-rating-top">' +
          '<div class="let-rating-op" style="color:' + color + ';">' + escHtml(name) + '</div>' +
          '<div class="let-rating-pct">' + r.pct + '%</div>' +
        '</div>' +

        '<div class="let-rating-bar-wrap">' +
          '<div class="let-rating-bar-fill" style="width:' + barW + '%;background:' + color + ';"></div>' +
        '</div>' +

        '<div class="let-rating-meta">' +
          'ОТВЕТИЛИ НА ' + r.replied + ' ИЗ ' + r.total + ' ОБРАЩЕНИЙ' +
        '</div>' +
      '</div>';
  });

  block.innerHTML = html;
}

// ── ТЕГИ ФИЛЬТР (динамическая сортировка) ──
function sortedTagsByFreq() {
  var freq = {};
  ALL_TAGS.forEach(function(t){ freq[t] = 0; });
  allLetters.forEach(function(l){
    if (Array.isArray(l.tags)) l.tags.forEach(function(t){ if(freq[t] !== undefined) freq[t]++; });
  });
  return ALL_TAGS.slice().sort(function(a,b){
    var diff = freq[b] - freq[a];
    return diff !== 0 ? diff : a.localeCompare(b, 'ru');
  }).filter(function(t){ return freq[t] > 0; });
}

function buildTagFilterRow() {
  var row = document.getElementById('filterRowTag');
  var tags = sortedTagsByFreq();
  if (tags.length === 0) {
    row.innerHTML = '<div class="let-rating-none" style="font-size:8px;">// ТЕГОВ ПОКА НЕТ</div>';
    return;
  }
  var html = '';
  tags.forEach(function(tag) {
    var isOn = activeTag === tag ? ' on' : '';
    html += '<button class="tag-filter-btn' + isOn + '" data-tag="' + escHtml(tag) + '" onclick="setTagFilter(this,\'' + tag + '\')">#' + escHtml(tag.replace(/_/g,' ')) + '</button>';
  });
  row.innerHTML = html;
}

// ── ФИЛЬТРЫ ──
function getFiltered() {
  var result = allLetters;
  if (activeOp === 'all_op') result = result.filter(function(l){ return l.operator === 'all'; });
  else if (activeOp !== 'all') result = result.filter(function(l){ return l.operator === activeOp; });
  if (activeStatus === 'wants_reply') result = result.filter(function(l){ return l.want_reply && !l.op_reply; });
  else if (activeStatus === 'has_reply') result = result.filter(function(l){ return l.op_reply; });
  if (activeTag) result = result.filter(function(l){ return Array.isArray(l.tags) && l.tags.includes(activeTag); });
  return result;
}

function activeFilterCount() {
  var n = 0;
  if (activeOp !== 'all') n++;
  if (activeStatus) n++;
  if (activeTag) n++;
  return n;
}

function updateResetBtn() {
  var n = activeFilterCount();
  var btn = document.getElementById('filterResetBtn');
  var cnt = document.getElementById('filterCount');
  btn.classList.toggle('visible', n > 0);
  if(cnt) cnt.textContent = n;
}

function setOpFilter(btn, val) {
  activeOp = val;
  visibleCount = PAGE_SIZE;
  document.querySelectorAll('#filterRowOp .let-filter-btn').forEach(function(b){ b.classList.toggle('on', b.dataset.val === val); });
  updateResetBtn(); renderLetters();
}

function setStatusFilter(btn, val) {
  if (activeStatus === val) {
    activeStatus = null;
    btn.classList.remove('on');
  } else {
    activeStatus = val;
    document.querySelectorAll('#filterRowStatus .let-filter-btn').forEach(function(b){ b.classList.remove('on'); });
    btn.classList.add('on');
  }
  visibleCount = PAGE_SIZE;
  updateResetBtn(); renderLetters();
}

function setTagFilter(btn, val) {
  if (activeTag === val) {
    activeTag = null;
    btn.classList.remove('on');
  } else {
    activeTag = val;
    document.querySelectorAll('#filterRowTag .let-filter-btn').forEach(function(b){ b.classList.remove('on'); });
    btn.classList.add('on');
  }
  visibleCount = PAGE_SIZE;
  updateResetBtn(); renderLetters();
}

function resetFilters() {
  activeOp = 'all'; activeStatus = null; activeTag = null;
  visibleCount = PAGE_SIZE;
  document.querySelectorAll('#filterRowOp .let-filter-btn').forEach(function(b){ b.classList.toggle('on', b.dataset.val === 'all'); });
  document.querySelectorAll('#filterRowStatus .let-filter-btn').forEach(function(b){ b.classList.remove('on'); });
  document.querySelectorAll('#filterRowTag .let-filter-btn').forEach(function(b){ b.classList.remove('on'); });
  updateResetBtn(); renderLetters();
}

// ── РЕНДЕР ──
function isNew(dateStr) {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr).getTime()) < 5 * 24 * 60 * 60 * 1000;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function opBadge(op) {
  var cls = OP_CLASS[op] || '';
  if (op === 'all') return '<span class="let-op-badge" style="border:1px solid rgba(255,215,0,.4);color:var(--yellow,#ffd700);background:rgba(255,215,0,.08);">ВСЕМ ОПЕРАТОРАМ</span>';
  return '<span class="let-op-badge op-badge ' + cls + '">' + (OP_NAMES[op] || op) + '</span>';
}

function tagBadge(tag) {
  return '<span class="let-tag">#' + escHtml(tag.replace(/_/g,' ')) + '</span>';
}

function statusBadge(l) {

  if (l.op_reply) {

    if (l.operator === 'all') {
      return '<span class="let-responded">✓ ОТВЕТИЛ ' + escHtml(OP_NAMES[l.operator_reply_by] || 'ОПЕРАТОР') + '</span>';
    }

    return '<span class="let-responded">ЕСТЬ ОТВЕТ</span>';
  }

  if (l.want_reply) {
    return '<span class="letter-want-reply">ЖДЁТ ОТВЕТА</span>';
  }

  return '';
}

function replyBlock(l) {
  if (!l.op_reply) return '';
  var opBadgeHtml = l.operator === 'all'
    ? '<span class="let-op-badge" style="border:1px solid rgba(255,215,0,.4);color:var(--yellow,#ffd700);background:rgba(255,215,0,.08);font-size:7px;padding:2px 6px;">ВСЕМ</span>'
    : '<span class="let-op-badge op-badge ' + (OP_CLASS[l.operator]||'') + '" style="font-size:7px;padding:2px 6px;">' + escHtml(OP_NAMES[l.operator]||l.operator) + '</span>';
  return '<div class="let-reply-block">'
    + '<div class="let-reply-hdr"><span class="let-reply-hdr-label">ОТВЕТ ОПЕРАТОРА</span><span class="let-reply-hdr-sep"> ── </span>' + opBadgeHtml + '</div>'
    + '<div class="let-reply-body">' + escHtml(l.op_reply).replace(/\n/g,'<br>') + '</div>'
    + '<div class="let-reply-date">' + fmtDate(l.published_at) + '</div>'
    + '</div>';
}

function renderLetters() {
  var filtered = getFiltered();
  var wrap = document.getElementById('lettersWrap');
  var btn = document.getElementById('showMoreBtn');

  if (filtered.length === 0) {
    wrap.innerHTML = '<div class="empty-state">// ПИСЕМ ПО ЭТОМУ ФИЛЬТРУ ПОКА НЕТ<br>БУДЬ ПЕРВЫМ ↑</div>';
    btn.style.display = 'none';
    return;
  }

  var html = '';
  filtered.slice(0, visibleCount).forEach(function(l) {
    var newBadge = isNew(l.published_at) ? '<span class="new-badge" style="margin-left:2px;">NEW</span>' : '';
    var tags = Array.isArray(l.tags) && l.tags.length > 0 ? l.tags.map(tagBadge).join('') : '';
    var status = statusBadge(l);
    var lid = l.id;
    html += '<div class="letter-card" id="letter-' + lid + '">'
      + '<div class="let-head1">' + opBadge(l.operator) + newBadge + tags + '</div>'
      + '<div class="let-head2"><div class="let-status">' + status + '</div>'
      + '<button class="let-share-btn" title="Поделиться" aria-label="Поделиться">↗</button></div>'
      + '<div class="let-body-wrap" data-id="' + lid + '">'
      + '<div class="let-body-inner">&laquo;' + escHtml(l.body).replace(/\n/g,'<br>') + '&raquo;</div>'
      + '</div>'
      + '<button class="let-read-more" data-id="' + lid + '" onclick="toggleCollapse(' + lid + ')">ЧИТАТЬ ПОЛНОСТЬЮ ↓</button>'
      + '<div class="letter-footer"><span class="letter-author">' + escHtml(l.author_name||'Аноним') + '</span><span>' + fmtDate(l.published_at) + '</span></div>'
      + replyBlock(l)
      + '</div>';
  });

  wrap.innerHTML = html;
  requestAnimationFrame(initCollapse);

  if (filtered.length > visibleCount) {
    btn.style.display = 'block';
    btn.textContent = '▼ ПОКАЗАТЬ ЕЩЁ (' + (filtered.length - visibleCount) + ')';
  } else {
    btn.style.display = 'none';
  }
}

// ── COLLAPSE ──
function initCollapse() {
  if (window.innerWidth >= 600) return;
  var THRESHOLD = 22 * 6;
  document.querySelectorAll('.let-body-wrap').forEach(function(wrap) {
    var inner = wrap.querySelector('.let-body-inner');
    var id = wrap.dataset.id;
    var btn = document.querySelector('.let-read-more[data-id="' + id + '"]');
    if (!inner || !btn) return;
    if (inner.scrollHeight > THRESHOLD) {
      wrap.classList.add('collapsed');
      btn.style.display = 'block';
    }
  });
}

function toggleCollapse(id) {
  var wrap = document.querySelector('.let-body-wrap[data-id="' + id + '"]');
  var btn = document.querySelector('.let-read-more[data-id="' + id + '"]');
  if (!wrap || !btn) return;
  var isCollapsed = wrap.classList.toggle('collapsed');
  btn.textContent = isCollapsed ? 'ЧИТАТЬ ПОЛНОСТЬЮ ↓' : 'СВЕРНУТЬ ↑';
}

function showMore() { visibleCount += PAGE_SIZE; renderLetters(); }

// ── ТЕГИ ФОРМА ──
var selectedTags = [];

function selectTag(btn) {
  var tag = btn.dataset.tag;
  var idx = selectedTags.indexOf(tag);
  if (idx !== -1) {
    selectedTags.splice(idx, 1);
    btn.classList.remove('sel');
  } else {
    if (selectedTags.length >= 2) {
      var warn = document.getElementById('tagWarn');
      warn.style.display = 'block';
      setTimeout(function(){ warn.style.display = 'none'; }, 2000);
      return;
    }
    selectedTags.push(tag);
    btn.classList.add('sel');
  }
}

// ── МОДАЛКА ──
var selectedOp = null;
var cfToken = null;

function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  selectedOp = null; cfToken = null; selectedTags = [];
  document.querySelectorAll('.modal-op-btn').forEach(function(b){ b.classList.remove('sel'); });
  document.querySelectorAll('.form-tag-btn').forEach(function(b){ b.classList.remove('sel'); });
  document.getElementById('fieldName').value = '';
  document.getElementById('fieldBody').value = '';
  document.getElementById('fieldWantReply').checked = false;
  document.getElementById('bodyCounter').textContent = '0 / 2000';
  document.getElementById('bodyCounter').className = 'form-counter';
  document.getElementById('tagWarn').style.display = 'none';
  document.getElementById('submitBtn').disabled = true;
  document.getElementById('submitBtn').style.display = 'block';
  document.getElementById('submitBtn').textContent = 'ОТПРАВИТЬ ПИСЬМО →';
  document.getElementById('formError').style.display = 'none';
  document.getElementById('formSuccess').style.display = 'none';
  if (window.turnstile) { try { window.turnstile.reset(); } catch(e) {} }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function onOverlayClick(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }

function selectOp(btn) {
  document.querySelectorAll('.modal-op-btn').forEach(function(b){ b.classList.remove('sel'); });
  btn.classList.add('sel');
  selectedOp = btn.dataset.val;
  checkFormReady();
}

function updateCounter() {
  var val = document.getElementById('fieldBody').value.length;
  var el = document.getElementById('bodyCounter');
  el.textContent = val + ' / 2000';
  el.className = 'form-counter' + (val > 1800 ? ' warn' : '') + (val >= 2000 ? ' over' : '');
  checkFormReady();
}

function checkFormReady() {
  var body = document.getElementById('fieldBody').value.trim();
  document.getElementById('submitBtn').disabled = !(selectedOp && body.length > 0 && body.length <= 2000 && cfToken);
}

window.onTurnstileSuccess = function(token) { cfToken = token; checkFormReady(); };
window.onTurnstileExpired = function() { cfToken = null; checkFormReady(); };

async function submitLetter() {
  var btn = document.getElementById('submitBtn');
  var errEl = document.getElementById('formError');
  var okEl = document.getElementById('formSuccess');
  if (!selectedOp) { showErr('Выбери оператора'); return; }
  var body = document.getElementById('fieldBody').value.trim();
  if (!body) { showErr('Напиши текст письма'); return; }
  if (body.length > 2000) { showErr('Слишком длинный текст'); return; }
  if (!cfToken) { showErr('Пройди проверку'); return; }
  btn.disabled = true; btn.textContent = 'ОТПРАВКА...'; errEl.style.display = 'none';
  try {
    var res = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operator: selectedOp,
        author_name: document.getElementById('fieldName').value.trim() || null,
        body: body,
        cf_token: cfToken,
        want_reply: document.getElementById('fieldWantReply').checked,
        tags: selectedTags
      })
    });
    var data = await res.json();
    if (!res.ok) { showErr(data.error || 'Ошибка отправки'); btn.disabled = false; btn.textContent = 'ОТПРАВИТЬ ПИСЬМО →'; return; }
    btn.style.display = 'none'; okEl.style.display = 'block';
    setTimeout(closeModal, 3000);
  } catch(e) {
    showErr('Ошибка соединения'); btn.disabled = false; btn.textContent = 'ОТПРАВИТЬ ПИСЬМО →';
  }
}

function showErr(msg) { var el = document.getElementById('formError'); el.textContent = msg; el.style.display = 'block'; }

loadLetters();
