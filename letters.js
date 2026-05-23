// EVRACE LETTERS ENGINE v2
// letters.js — all logic, letters.html — layout only

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
  document.getElementById('theme-css').href = 'CSS/' + theme + '.css?v=4';
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
var allReplies = [];
var repliesMap = {}; // { letter_id: [reply, ...] }
var activeOp = 'all';
var activeStatus = null;
var activeTag = null;
var PAGE_SIZE = 10;
var visibleCount = PAGE_SIZE;

async function loadLetters() {
  try {
    var results = await Promise.all([
      fetch(SURL + '/rest/v1/letters?select=*&status=eq.approved&order=published_at.desc&limit=200',
        { headers: { 'apikey': SKEY, 'Authorization': 'Bearer ' + SKEY } }),
      fetch(SURL + '/rest/v1/letter_replies?select=*&order=replied_at.asc',
        { headers: { 'apikey': SKEY, 'Authorization': 'Bearer ' + SKEY } })
    ]);
    allLetters = await results[0].json();
    allReplies = await results[1].json();
    if (!Array.isArray(allLetters)) allLetters = [];
    if (!Array.isArray(allReplies)) allReplies = [];
    // Build replies map
    repliesMap = {};
    allReplies.forEach(function(r) {
      if (!repliesMap[r.letter_id]) repliesMap[r.letter_id] = [];
      repliesMap[r.letter_id].push(r);
    });
    updateStats();
    buildTagFilterRow();
    renderRating();
    renderLetters();
  } catch(e) {
    document.getElementById('lettersWrap').innerHTML = '<div class="loading">ОШИБКА ЗАГРУЗКИ</div>';
  }
}

function hasReply(l) {
  return repliesMap[l.id] && repliesMap[l.id].length > 0;
}

function updateStats() {
  var el;
  el = document.getElementById('stat-total');
  if (el) el.textContent = allLetters.length || '0';
  el = document.getElementById('stat-waiting');
  if (el) el.textContent = allLetters.filter(function(l){ return l.want_reply && !hasReply(l); }).length || '0';
  el = document.getElementById('stat-replies');
  if (el) el.textContent = allLetters.filter(hasReply).length || '0';
  // legacy stat-ops support
  el = document.getElementById('stat-ops');
  if (el) el.textContent = new Set(allLetters.map(function(l){ return l.operator; })).size || '0';
}

// ── РЕЙТИНГ ──
// received = прямые письма + письма "всем"
// answered = писем где этот оператор присутствует в replies
function renderRating() {
  var block = document.getElementById('ratingBlock');
  if (!block) return;
  if (allReplies.length === 0) {
    block.innerHTML = '<div class="let-rating-none">// ОПЕРАТОРЫ ПОКА НЕ ОТВЕТИЛИ НИ НА ОДНО ОБРАЩЕНИЕ<br><br>Первые публичные ответы появятся здесь.</div>';
    return;
  }
  var opKeys = Object.keys(OP_COLORS);
  var rows = [];
  opKeys.forEach(function(op) {
    var received = allLetters.filter(function(l){ return l.operator === op || l.operator === 'all'; });
    if (received.length === 0) return;
    var answered = received.filter(function(l){
      var reps = repliesMap[l.id] || [];
      return reps.some(function(r){ return r.operator === op; });
    }).length;
    if (answered === 0) return; // скрываем тех у кого нет ответов
    var pct = Math.round(answered / received.length * 100);
    rows.push({ op: op, total: received.length, replied: answered, pct: pct });
  });
  if (rows.length === 0) {
    block.innerHTML = '<div class="let-rating-none">// ОПЕРАТОРЫ ПОКА НЕ ОТВЕТИЛИ НИ НА ОДНО ОБРАЩЕНИЕ<br><br>Первые публичные ответы появятся здесь.</div>';
    return;
  }
  rows.sort(function(a,b){ return b.pct - a.pct || b.replied - a.replied; });
  var html = '<div class="let-rating-title">// ОТЗЫВЧИВОСТЬ · % ОТВЕТОВ НА ОБРАЩЕНИЯ</div>';
  rows.forEach(function(r) {
    var color = OP_COLORS[r.op] || '#00ff41';
    var name = OP_NAMES[r.op] || r.op;
    var barW = Math.max(r.pct, 2);
    html += '<div class="let-rating-row">'
      + '<div class="let-rating-op" style="color:' + color + ';">' + escHtml(name) + '</div>'
      + '<div class="let-rating-bar-wrap"><div class="let-rating-bar-fill" style="width:' + barW + '%;background:' + color + ';"></div></div>'
      + '<div class="let-rating-pct" style="color:' + color + ';">' + r.pct + '%</div>'
      + '<div class="let-rating-count">(' + r.replied + '/' + r.total + ')</div>'
      + '</div>';
  });
  block.innerHTML = html;
}

// ── ТЕГИ ФИЛЬТР ──
function sortedTagsByFreq() {
  var freq = {};
  ALL_TAGS.forEach(function(t){ freq[t] = 0; });
  allLetters.forEach(function(l){
    if (Array.isArray(l.tags)) l.tags.forEach(function(t){ if(freq[t] !== undefined) freq[t]++; });
  });
  return { sorted: ALL_TAGS.slice().sort(function(a,b){
    var diff = freq[b] - freq[a];
    return diff !== 0 ? diff : a.localeCompare(b, 'ru');
  }).filter(function(t){ return freq[t] > 0; }), freq: freq };
}

function buildTagFilterRow() {
  var row = document.getElementById('filterRowTag');
  if (!row) return;
  var result = sortedTagsByFreq();
  var tags = result.sorted;
  var freq = result.freq;
  if (tags.length === 0) {
    row.innerHTML = '<div class="let-rating-none" style="font-size:8px;">// ТЕГОВ ПОКА НЕТ</div>';
    return;
  }
  var html = '';
  tags.forEach(function(tag) {
    var isOn = activeTag === tag ? ' on' : '';
    // Формат: #роуминг | 12
    html += '<button class="tag-filter-btn' + isOn + '" data-tag="' + escHtml(tag)
      + '" onclick="setTagFilter(this,\'' + tag + '\')">#'
      + escHtml(tag.replace(/_/g,' '))
      + ' <span class="filter-count">| ' + freq[tag] + '</span></button>';
  });
  row.innerHTML = html;
}

// ── ФИЛЬТРЫ ──
function getFiltered() {
  var result = allLetters;
  if (activeOp === 'all_op') result = result.filter(function(l){ return l.operator === 'all'; });
  else if (activeOp !== 'all') result = result.filter(function(l){ return l.operator === activeOp; });
  if (activeStatus === 'wants_reply') result = result.filter(function(l){ return l.want_reply && !hasReply(l); });
  else if (activeStatus === 'has_reply') result = result.filter(hasReply);
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
  if (btn) btn.classList.toggle('visible', n > 0);
  if (cnt) cnt.textContent = n;
}

function setOpFilter(btn, val) {
  activeOp = val;
  visibleCount = PAGE_SIZE;
  document.querySelectorAll('#filterRowOp .op-filter-btn').forEach(function(b){
    b.classList.toggle('on', b.dataset.val === val);
  });
  updateResetBtn(); renderLetters();
}

function setStatusFilter(btn, val) {
  if (activeStatus === val) {
    activeStatus = null;
    btn.classList.remove('on');
  } else {
    activeStatus = val;
    document.querySelectorAll('#filterRowStatus .op-filter-btn').forEach(function(b){ b.classList.remove('on'); });
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
    document.querySelectorAll('#filterRowTag .tag-filter-btn').forEach(function(b){ b.classList.remove('on'); });
    btn.classList.add('on');
  }
  visibleCount = PAGE_SIZE;
  updateResetBtn(); renderLetters();
}

function resetFilters() {
  activeOp = 'all'; activeStatus = null; activeTag = null;
  visibleCount = PAGE_SIZE;
  document.querySelectorAll('#filterRowOp .op-filter-btn').forEach(function(b){
    b.classList.toggle('on', b.dataset.val === 'all');
  });
  document.querySelectorAll('#filterRowStatus .op-filter-btn').forEach(function(b){ b.classList.remove('on'); });
  document.querySelectorAll('#filterRowTag .tag-filter-btn').forEach(function(b){ b.classList.remove('on'); });
  updateResetBtn(); renderLetters();
}

// ── РЕНДЕР КАРТОЧЕК ──
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

// Статус: всегда первый оператор по имени, остальные числом
function statusBadge(l) {
  var replies = repliesMap[l.id] || [];
  if (replies.length === 0) {
    if (l.want_reply) return '<span class="letter-want-reply">📬 ЖДЁТ ОТВЕТА</span>';
    return '';
  }
  var n = replies.length;
  var first = OP_NAMES[replies[0].operator] || replies[0].operator;
  if (n === 1) return '<span class="let-responded">✓ ОТВЕТИЛ ' + escHtml(first) + '</span>';
  if (n === 2) {
    var second = OP_NAMES[replies[1].operator] || replies[1].operator;
    return '<span class="let-responded">✓ ОТВЕТИЛИ ' + escHtml(first) + ' и ' + escHtml(second) + '</span>';
  }
  return '<span class="let-responded">✓ ОТВЕТИЛИ ' + escHtml(first) + ' и ещё ' + (n - 1) + '</span>';
}

// Каждый ответ — отдельный блок
function replyBlock(l) {
  var replies = repliesMap[l.id] || [];
  if (replies.length === 0) return '';
  return replies.map(function(r) {
    var cls = OP_CLASS[r.operator] || '';
    var name = OP_NAMES[r.operator] || r.operator;
    var badge = '<span class="let-op-badge op-badge ' + cls + '" style="font-size:7px;padding:2px 6px;">' + escHtml(name) + '</span>';
    return '<div class="let-reply-block">'
      + '<div class="let-reply-hdr">'
      + '<span class="let-reply-hdr-label">ОТВЕТ ОПЕРАТОРА</span>'
      + '<span class="let-reply-hdr-sep"> ── </span>'
      + badge
      + '</div>'
      + '<div class="let-reply-body">' + escHtml(r.body).replace(/\n/g,'<br>') + '</div>'
      + '<div class="let-reply-date">' + (r.replied_at ? fmtDate(r.replied_at) : '') + '</div>'
      + '</div>';
  }).join('');
}

function renderLetters() {
  var filtered = getFiltered();
  var wrap = document.getElementById('lettersWrap');
  var btn = document.getElementById('showMoreBtn');
  if (!wrap) return;

  if (filtered.length === 0) {
    wrap.innerHTML = '<div class="empty-state">// ПИСЕМ ПО ЭТОМУ ФИЛЬТРУ ПОКА НЕТ<br>БУДЬ ПЕРВЫМ ↑</div>';
    if (btn) btn.style.display = 'none';
    return;
  }

  var html = '';
  filtered.slice(0, visibleCount).forEach(function(l) {
    var lid = l.id;
    // Порядок: ОПЕРАТОР → ТЕГИ → NEW
    var tags = Array.isArray(l.tags) && l.tags.length > 0 ? l.tags.map(tagBadge).join('') : '';
    var newBadge = isNew(l.published_at) ? '<span class="new-badge" style="margin-left:2px;">NEW</span>' : '';
    var status = statusBadge(l);

    html += '<div class="letter-card" id="letter-' + lid + '">'
      + '<div class="let-head1">' + opBadge(l.operator) + tags + newBadge + '</div>'
      + '<div class="let-head2">'
      + '<div class="let-status">' + status + '</div>'
      + '<button class="let-share-btn" title="Поделиться" aria-label="Поделиться">↗</button>'
      + '</div>'
      + '<div class="let-body-wrap" data-id="' + lid + '">'
      + '<div class="let-body-inner">&laquo;' + escHtml(l.body).replace(/\n/g,'<br>') + '&raquo;</div>'
      + '</div>'
      + '<button class="let-read-more" data-id="' + lid + '" onclick="toggleCollapse(' + lid + ')">ЧИТАТЬ ПОЛНОСТЬЮ ↓</button>'
      + '<div class="letter-footer">'
      + '<span class="letter-author">' + escHtml(l.author_name || 'Аноним') + '</span>'
      + '<span>' + fmtDate(l.published_at) + '</span>'
      + '</div>'
      + replyBlock(l)
      + '</div>';
  });

  wrap.innerHTML = html;
  requestAnimationFrame(initCollapse);

  if (btn) {
    if (filtered.length > visibleCount) {
      btn.style.display = 'block';
      btn.textContent = '▼ ПОКАЗАТЬ ЕЩЁ (' + (filtered.length - visibleCount) + ')';
    } else {
      btn.style.display = 'none';
    }
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
      if (warn) { warn.style.display = 'block'; setTimeout(function(){ warn.style.display = 'none'; }, 2000); }
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
  var fn = document.getElementById('fieldName');
  var fb = document.getElementById('fieldBody');
  var fw = document.getElementById('fieldWantReply');
  var bc = document.getElementById('bodyCounter');
  var tw = document.getElementById('tagWarn');
  var sb = document.getElementById('submitBtn');
  var fe = document.getElementById('formError');
  var fs = document.getElementById('formSuccess');
  if (fn) fn.value = '';
  if (fb) fb.value = '';
  if (fw) fw.checked = false;
  if (bc) { bc.textContent = '0 / 2000'; bc.className = 'form-counter'; }
  if (tw) tw.style.display = 'none';
  if (sb) { sb.disabled = true; sb.style.display = 'block'; sb.textContent = 'ОТПРАВИТЬ ПИСЬМО →'; }
  if (fe) fe.style.display = 'none';
  if (fs) fs.style.display = 'none';
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
  var fb = document.getElementById('fieldBody');
  var bc = document.getElementById('bodyCounter');
  if (!fb || !bc) return;
  var val = fb.value.length;
  bc.textContent = val + ' / 2000';
  bc.className = 'form-counter' + (val > 1800 ? ' warn' : '') + (val >= 2000 ? ' over' : '');
  checkFormReady();
}

function checkFormReady() {
  var fb = document.getElementById('fieldBody');
  var sb = document.getElementById('submitBtn');
  if (!fb || !sb) return;
  var body = fb.value.trim();
  sb.disabled = !(selectedOp && body.length > 0 && body.length <= 2000 && cfToken);
}

window.onTurnstileSuccess = function(token) { cfToken = token; checkFormReady(); };
window.onTurnstileExpired = function() { cfToken = null; checkFormReady(); };

async function submitLetter() {
  var btn = document.getElementById('submitBtn');
  var errEl = document.getElementById('formError');
  var okEl = document.getElementById('formSuccess');
  var fb = document.getElementById('fieldBody');
  var fn = document.getElementById('fieldName');
  var fw = document.getElementById('fieldWantReply');
  if (!selectedOp) { showErr('Выбери оператора'); return; }
  var body = fb ? fb.value.trim() : '';
  if (!body) { showErr('Напиши текст письма'); return; }
  if (body.length > 2000) { showErr('Слишком длинный текст'); return; }
  if (!cfToken) { showErr('Пройди проверку'); return; }
  btn.disabled = true; btn.textContent = 'ОТПРАВКА...';
  if (errEl) errEl.style.display = 'none';
  try {
    var res = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operator: selectedOp,
        author_name: fn ? (fn.value.trim() || null) : null,
        body: body,
        cf_token: cfToken,
        want_reply: fw ? fw.checked : false,
        tags: selectedTags
      })
    });
    var data = await res.json();
    if (!res.ok) {
      showErr(data.error || 'Ошибка отправки');
      btn.disabled = false; btn.textContent = 'ОТПРАВИТЬ ПИСЬМО →';
      return;
    }
    btn.style.display = 'none';
    if (okEl) okEl.style.display = 'block';
    setTimeout(closeModal, 3000);
  } catch(e) {
    showErr('Ошибка соединения');
    btn.disabled = false; btn.textContent = 'ОТПРАВИТЬ ПИСЬМО →';
  }
}

function showErr(msg) {
  var el = document.getElementById('formError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

// ── INIT ──
loadLetters();
