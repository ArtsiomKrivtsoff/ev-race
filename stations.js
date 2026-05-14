// =============================================================
// EV RACE — stations.js
// URL-state filters · сортировка · sticky · пагинация · location-key
// =============================================================

const SURL = 'https://uvrboxrddqlasgrnnnne.supabase.co';
const SKEY = 'sb_publishable_Tmx9z-PHntDW4cZQrhOTHQ_1R1Bns7Y';

const OP_NAMES = {
  batteryfly:'BatteryFly', forevo:'forEVo', zaryadka:'Zaryadka',
  united:'United Company', csms:'ЦСМС',
  malanka:'Malanka', evika:'Evika!', orange:'Orange', prizma:'Prizma', gto:'Белтехосмотр'
};
const OP_CLASS = {
  batteryfly:'op-bf', forevo:'op-fo', zaryadka:'op-za',
  united:'op-uc', csms:'op-cs',
  malanka:'op-ma', evika:'op-ev', orange:'op-or', prizma:'op-pr', gto:'op-gt'
};

const MONTHS = ['ЯНВ','ФЕВ','МАР','АПР','МАЙ','ИЮН','ИЮЛ','АВГ','СЕН','ОКТ','НОЯ','ДЕК'];
const MONTH_SEASON = ['winter','winter','spring','spring','spring','summer','summer','summer','autumn','autumn','autumn','winter'];

const PAGE_SIZE = 50;

// =============================================================
// СОСТОЯНИЕ
// =============================================================
const STATE = {
  filterMonth:  'all',
  filterOp:     'all',
  filterCity:   'all',
  filterSearch: '',
  sortBy:       'date',          // 'date' | 'power' | 'city'
  sortDir:      'desc',          // 'asc' | 'desc'
  view:         'group',         // 'group' | 'list' (десктоп)
  visibleCount: PAGE_SIZE,
};

let allStations = [];
let firstRender = true;         // флаг для NEW-flash

// =============================================================
// URL ↔ STATE
// =============================================================
function loadStateFromURL() {
  const p = new URLSearchParams(location.search);
  if (p.has('op'))     STATE.filterOp     = p.get('op');
  if (p.has('city'))   STATE.filterCity   = p.get('city');
  if (p.has('month'))  STATE.filterMonth  = p.get('month');
  if (p.has('q'))      STATE.filterSearch = p.get('q');
  if (p.has('sort'))   { const [b,d] = p.get('sort').split('-'); if(b) STATE.sortBy = b; if(d) STATE.sortDir = d; }
  if (p.has('view'))   STATE.view         = p.get('view');
}
function saveStateToURL() {
  const p = new URLSearchParams();
  if (STATE.filterOp     !== 'all') p.set('op',    STATE.filterOp);
  if (STATE.filterCity   !== 'all') p.set('city',  STATE.filterCity);
  if (STATE.filterMonth  !== 'all') p.set('month', STATE.filterMonth);
  if (STATE.filterSearch)           p.set('q',     STATE.filterSearch);
  if (STATE.sortBy !== 'date' || STATE.sortDir !== 'desc') p.set('sort', STATE.sortBy + '-' + STATE.sortDir);
  if (STATE.view !== 'group')       p.set('view',  STATE.view);
  const q = p.toString();
  history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
}

// =============================================================
// ДИНАМИЧЕСКАЯ ВЫСОТА STATUSBAR  (фикс хардкода top:41px на nav-mobile-drop)
// =============================================================
(function setStatusbarHeight() {
  let raf = 0;
  function u() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const b = document.getElementById('statusbar');
      if (b) document.documentElement.style.setProperty('--statusbar-h', b.offsetHeight + 'px');
    });
  }
  window.addEventListener('load', u);
  window.addEventListener('resize', u);
  if (window.ResizeObserver) document.addEventListener('DOMContentLoaded', () => { const b = document.getElementById('statusbar'); if (b) new ResizeObserver(u).observe(b); });
})();

// =============================================================
// ТЕМА
// =============================================================
const THEMES = ['arcade','tesla-light','tesla-dark'];
function setTheme(theme) {
  document.getElementById('theme-css').href = 'CSS/' + theme + '.css?v=4';
  localStorage.setItem('ev_race_theme', theme);
  THEMES.forEach(t => {
    document.getElementById('btn-'  + t)?.classList.toggle('active', t === theme);
    document.getElementById('foot-' + t)?.classList.toggle('active', t === theme);
  });
}
(function () { const s = localStorage.getItem('ev_race_theme'); if (s && THEMES.includes(s)) setTheme(s); })();

// =============================================================
// БУРГЕР
// =============================================================
function toggleBurger() {
  const btn  = document.getElementById('burgerBtn');
  const menu = document.getElementById('mobileMenu');
  const open = menu.classList.toggle('open');
  btn.classList.toggle('open', open);
}
function closeBurger() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('burgerBtn').classList.remove('open');
}
document.addEventListener('click', function (e) {
  const menu = document.getElementById('mobileMenu');
  const btn  = document.getElementById('burgerBtn');
  if (menu && menu.classList.contains('open') && !menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.remove('open'); btn.classList.remove('open');
  }
});

// =============================================================
// HELPERS
// =============================================================
function locationKey(s) {
  // Приоритет — координаты (если есть в схеме). Иначе город+адрес.
  if (s.lat != null && s.lng != null) return Number(s.lat).toFixed(5) + ',' + Number(s.lng).toFixed(5);
  return ((s.city || '').toLowerCase() + '|' + (s.address || '').toLowerCase()).trim();
}
function getCurrentRoundEnd() {
  const now = new Date();
  const dow = now.getDay();
  const fri = new Date(now);
  const diff = dow <= 5 ? (5 - dow) : (5 + 7 - dow);
  fri.setDate(fri.getDate() + diff);
  fri.setHours(23,59,59,0);
  return fri;
}
function isNew(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  const roundEnd = getCurrentRoundEnd();
  const mon = new Date(roundEnd); mon.setDate(mon.getDate() - 4); mon.setHours(0,0,0,0);
  return d >= mon && d <= roundEnd;
}
function opBadge(op)   { return '<span class="op-badge ' + (OP_CLASS[op] || '') + '">' + (OP_NAMES[op] || op) + '</span>'; }
function typeBadge(t)  {
  if (!t)        return '';
  if (t === 'DC')   return '<span class="badge-dc">DC</span>';
  if (t === 'AC')   return '<span class="badge-ac">AC</span>';
  if (t === 'ACDC') return '<span class="badge-acdc">AC+DC</span>';
  return '';
}
function gunCell(type) {
  if (!type) return '<span class="no-gun">—</span>';
  return '<span class="gun-pill"><span class="gun-dot"></span>' + type + '</span>';
}
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const p = dateStr.split('-');
  return p[2] + '.' + p[1] + '.' + p[0].slice(2);
}
function powerSum(s) { return (s.dc_power || 0) + (s.ac_power || 0); }

// rating-slot — placeholder под народный рейтинг (страница «скоро»)
function ratingSlot(locKey) {
  return '<span class="loc-rating" data-loc-id="' + locKey + '" title="Народный рейтинг локаций — скоро"><span class="loc-rating-stars">☆☆☆☆☆</span><span class="loc-rating-soon">СКОРО</span></span>';
}

// =============================================================
// FILTERS
// =============================================================
function getFiltered() {
  return allStations.filter(s => {
    if (STATE.filterMonth !== 'all') {
      const m = parseInt(s.station_date.split('-')[1], 10) - 1;
      if (m !== parseInt(STATE.filterMonth, 10)) return false;
    }
    if (STATE.filterOp   !== 'all' && s.operator !== STATE.filterOp) return false;
    if (STATE.filterCity !== 'all' && (s.city || '').toLowerCase() !== STATE.filterCity) return false;
    if (STATE.filterSearch) {
      const q = STATE.filterSearch.toLowerCase();
      const hay = [s.city, s.address, s.location_name, OP_NAMES[s.operator] || s.operator, s.gun1_type, s.gun2_type, s.gun3_type].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
function getSorted(arr) {
  const d = STATE.sortDir === 'asc' ? 1 : -1;
  const cmp = {
    date:  (a,b) => (a.station_date || '').localeCompare(b.station_date || '') * d,
    power: (a,b) => (powerSum(a) - powerSum(b)) * d,
    city:  (a,b) => ((a.city || '').localeCompare(b.city || '', 'ru')) * d,
  }[STATE.sortBy];
  return cmp ? [...arr].sort(cmp) : arr;
}

function buildMonthFilter(stations) {
  const counts = {};
  stations.forEach(s => {
    const m = parseInt(s.station_date.split('-')[1], 10) - 1;
    counts[m] = (counts[m] || 0) + (s.count || 1);
  });
  const max = Math.max(1, ...Object.values(counts));
  const wrap = document.getElementById('month-filter');
  let html = '';
  MONTHS.forEach((name, i) => {
    if (!counts[i]) return;
    const heat = (counts[i] / max).toFixed(3);
    const on = String(i) === String(STATE.filterMonth) ? ' on' : '';
    html += '<span class="month-btn ' + MONTH_SEASON[i] + on + '" onclick="setMonth(' + i + ')" data-month="' + i + '" style="--heat:' + heat + '">' + name + ' | ' + counts[i] + '</span>';
  });
  wrap.innerHTML = html;
}
function buildCityFilter(stations) {
  const cities = [...new Set(stations.map(s => s.city).filter(Boolean))].sort();
  const wrap = document.getElementById('city-filter');
  let html = '';
  cities.forEach(c => {
    const lc = c.toLowerCase();
    const on = lc === STATE.filterCity ? ' on' : '';
    html += '<span class="city-btn' + on + '" onclick="setCity(\'' + lc.replace(/'/g, "\\'") + '\')" data-city="' + lc + '">' + c.toUpperCase() + '</span>';
  });
  wrap.innerHTML = html;
}
function activeFiltersCount() {
  let n = 0;
  if (STATE.filterMonth !== 'all') n++;
  if (STATE.filterOp    !== 'all') n++;
  if (STATE.filterCity  !== 'all') n++;
  if (STATE.filterSearch)          n++;
  return n;
}
function updateResetBtn() {
  const n = activeFiltersCount();
  const btn = document.getElementById('reset-btn');
  btn.classList.toggle('visible', n > 0);
  document.getElementById('reset-count').textContent = n > 0 ? n : '';
}

function setMonth(val) {
  STATE.filterMonth = STATE.filterMonth == val ? 'all' : String(val);
  STATE.visibleCount = PAGE_SIZE;
  document.querySelectorAll('#month-filter span').forEach(el => el.classList.toggle('on', String(el.dataset.month) === String(STATE.filterMonth)));
  applyFilters();
}
function setOp(val) {
  STATE.filterOp = STATE.filterOp === val ? 'all' : val;
  STATE.visibleCount = PAGE_SIZE;
  document.querySelectorAll('#op-filter span').forEach(el => el.classList.toggle('on', el.dataset.op === STATE.filterOp));
  applyFilters();
}
function setCity(val) {
  STATE.filterCity = STATE.filterCity === val ? 'all' : val;
  STATE.visibleCount = PAGE_SIZE;
  document.querySelectorAll('#city-filter span').forEach(el => el.classList.toggle('on', el.dataset.city === STATE.filterCity));
  applyFilters();
}
function setSearch(val) {
  STATE.filterSearch = val.trim();
  STATE.visibleCount = PAGE_SIZE;
  document.getElementById('search-clear').style.display = STATE.filterSearch ? 'block' : 'none';
  applyFilters();
}
function clearSearch() {
  STATE.filterSearch = '';
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').style.display = 'none';
  applyFilters();
}
function resetFilters() {
  Object.assign(STATE, { filterMonth:'all', filterOp:'all', filterCity:'all', filterSearch:'', visibleCount: PAGE_SIZE });
  document.querySelectorAll('#month-filter span,#op-filter span,#city-filter span').forEach(el => el.classList.remove('on'));
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').style.display = 'none';
  applyFilters();
}
function setView(v) {
  STATE.view = v;
  document.getElementById('view-list' ).classList.toggle('active', v === 'list');
  document.getElementById('view-group').classList.toggle('active', v === 'group');
  applyFilters();
}
function setSort(by) {
  if (STATE.sortBy === by) {
    STATE.sortDir = STATE.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    STATE.sortBy  = by;
    STATE.sortDir = (by === 'date' || by === 'power') ? 'desc' : 'asc';
  }
  applyFilters();
}
function loadMore() {
  STATE.visibleCount += PAGE_SIZE;
  applyFilters();
}
function showAll(total) {
  STATE.visibleCount = total;
  applyFilters();
}

function applyFilters() {
  updateResetBtn();
  saveStateToURL();
  const filtered = getFiltered();
  const sorted   = getSorted(filtered);
  renderStats(filtered);
  renderHeaderArrows();
  renderTable(sorted);
  firstRender = false;
}

// =============================================================
// STATS
// =============================================================
function renderStats(stations) {
  const dc   = stations.filter(s => s.station_type === 'DC' || s.station_type === 'ACDC' || !s.station_type);
  const dcCount = dc.reduce((n, s) => n + (s.count || 1), 0);
  const ac   = stations.filter(s => s.station_type === 'AC');
  const acCount = ac.reduce((n, s) => n + (s.count || 1), 0);
  const guns   = dc.reduce((n, s) => { const c = s.count || 1; if (s.gun1_type) n += c; if (s.gun2_type) n += c; if (s.gun3_type) n += c; return n; }, 0);
  const acGuns = ac.reduce((n, s) => { const c = s.count || 1; if (s.gun1_type) n += c; if (s.gun2_type) n += c; if (s.gun3_type) n += c; return n; }, 0);
  const cars   = stations.reduce((n, s) => n + ((s.simultaneous_charge || 1) * (s.count || 1)), 0);
  const cities = new Set(stations.map(s => s.city).filter(Boolean)).size;
  const dcPower = dc.reduce((n, s) => n + ((s.dc_power || 0) * (s.count || 1)), 0);
  const acPower = stations.reduce((n, s) => n + ((s.ac_power || 0) * (s.count || 1)), 0);

  document.getElementById('stat-dc').textContent      = dcPower ? dcCount + ' | ' + dcPower.toLocaleString('ru') : (dcCount || '—');
  document.getElementById('stat-ac').textContent      = acPower ? acCount + ' | ' + acPower.toLocaleString('ru') : (acCount || '—');
  document.getElementById('stat-guns').textContent    = guns   || '—';
  document.getElementById('stat-ac-guns').textContent = acGuns || '—';
  document.getElementById('stat-cities').textContent  = cities;
  document.getElementById('stat-cars').textContent    = cars   || '—';
}

// =============================================================
// HEADER ARROWS (sortable)
// =============================================================
function renderHeaderArrows() {
  document.querySelectorAll('#reg-head-row th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === STATE.sortBy) th.classList.add(STATE.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  });
}
document.addEventListener('click', function (e) {
  const th = e.target.closest('th.sortable');
  if (th) setSort(th.dataset.sort);
});

// =============================================================
// TABLE + CARDS
// =============================================================
function renderTable(stations) {
  const totalCount = stations.reduce((n, s) => n + (s.count || 1), 0);
  document.getElementById('table-head-text').textContent = '► СТАНЦИЙ УСТАНОВЛЕНО: ' + totalCount;

  if (stations.length === 0) {
    document.getElementById('reg-tbody').innerHTML  = '<tr><td colspan="10" class="loading">НЕТ ДАННЫХ ПО ВЫБРАННЫМ ФИЛЬТРАМ</td></tr>';
    document.getElementById('cards-wrap').innerHTML = '<div class="loading">НЕТ ДАННЫХ ПО ВЫБРАННЫМ ФИЛЬТРАМ</div>';
    document.getElementById('load-more-wrap').innerHTML = '';
    return;
  }

  // DESKTOP: либо плоский список, либо группа по locationKey
  renderDesktop(stations);

  // MOBILE: всегда группа
  renderMobile(stations);

  // LOAD-MORE
  renderLoadMore(stations.length);
}

function renderDesktop(stations) {
  const tbody = document.getElementById('reg-tbody');
  if (STATE.view === 'list') {
    // ПЛОСКИЙ СПИСОК с пагинацией по строкам
    const visible = stations.slice(0, STATE.visibleCount);
    tbody.innerHTML = visible.map(s => renderTableRow(s)).join('');
  } else {
    // ГРУППА по locationKey, пагинация по группам
    const groups = groupByLocation(stations);
    const visibleGroups = groups.slice(0, STATE.visibleCount);
    tbody.innerHTML = visibleGroups.map(g => renderGroupRows(g)).join('');
  }
  if (firstRender) flashNew('#reg-tbody');
}

function renderTableRow(s) {
  const locKey = locationKey(s);
  const newBadge = isNew(s.station_date) ? ' <span class="new-badge">NEW</span>' : '';
  const locHtml = s.location_name
    ? '<span class="loc-name">' + s.location_name + '</span><span class="loc-address">' + (s.address || '') + '</span>'
    : '<span class="loc-address">' + (s.address || '—') + '</span>';
  const dc = s.dc_power || 0, ac = s.ac_power || 0, cnt = s.count || 1;
  let pwrHtml = '—';
  if (dc || ac) {
    const pwrStr = dc && ac ? dc + '+' + ac + ' кВт' : (dc || ac) + ' кВт';
    pwrHtml = cnt > 1 ? pwrStr + ' <span style="color:var(--yellow)">×' + cnt + '</span>' : pwrStr;
  }
  const flash = (firstRender && isNew(s.station_date)) ? ' new-flash' : '';
  return '<tr data-loc-id="' + locKey + '" class="' + flash.trim() + '">'
    + '<td>' + opBadge(s.operator) + '</td>'
    + '<td>' + typeBadge(s.station_type) + '</td>'
    + '<td class="city">' + (s.city || '—') + '</td>'
    + '<td class="addr">' + locHtml + '</td>'
    + '<td class="center">' + gunCell(s.gun1_type) + '</td>'
    + '<td class="center">' + gunCell(s.gun2_type) + '</td>'
    + '<td class="center">' + gunCell(s.gun3_type) + '</td>'
    + '<td class="power right">' + pwrHtml + '</td>'
    + '<td class="date right">' + fmtDate(s.station_date) + newBadge + '</td>'
    + '<td class="right">' + ratingSlot(locKey) + '</td>'
    + '</tr>';
}

function renderGroupRows(group) {
  // первая строка — сводка локации (объединённая ячейка с адресом), затем по строке на каждую станцию
  const first = group.stations[0];
  const totalPower = group.stations.reduce((n, s) => n + (((s.dc_power || 0) + (s.ac_power || 0)) * (s.count || 1)), 0);
  const totalGuns  = group.stations.reduce((n, s) => { const c = s.count || 1; let g = 0; if (s.gun1_type) g += c; if (s.gun2_type) g += c; if (s.gun3_type) g += c; return n + g; }, 0);
  const latestDate = group.stations.reduce((d, s) => s.station_date > d ? s.station_date : d, '');
  const newBadge   = isNew(latestDate) ? ' <span class="new-badge">NEW</span>' : '';
  const flash = (firstRender && isNew(latestDate)) ? ' new-flash' : '';

  // если в группе 1 станция — рисуем обычной строкой как в list view
  if (group.stations.length === 1) return renderTableRow(first);

  // несколько станций в одной локации — заголовок локации + строки
  const operators = [...new Set(group.stations.map(s => s.operator))];
  const opBadges = operators.map(o => opBadge(o)).join(' ');
  const locHtml = first.location_name
    ? '<strong style="color:var(--green)">' + first.location_name + '</strong><br><span class="loc-address">' + (first.address || '') + '</span>'
    : '<span style="color:var(--green)">' + (first.address || '—') + '</span>';

  let html = '<tr data-loc-id="' + group.key + '" class="' + flash.trim() + '" style="background:rgba(0,255,65,.03)">'
    + '<td>' + opBadges + '</td>'
    + '<td colspan="2" style="color:var(--cyan);font-family:\'Press Start 2P\',monospace;font-size:9px">📍 ' + group.stations.length + ' СТ.</td>'
    + '<td class="addr">' + locHtml + '</td>'
    + '<td colspan="3" class="center" style="color:var(--text-dim);font-size:10px">' + totalGuns + ' пист. всего</td>'
    + '<td class="power right">' + (totalPower ? totalPower.toLocaleString('ru') + ' кВт' : '—') + '</td>'
    + '<td class="date right">' + fmtDate(latestDate) + newBadge + '</td>'
    + '<td class="right">' + ratingSlot(group.key) + '</td>'
    + '</tr>';
  // вложенные строки станций (без рейтинга — он на локацию)
  group.stations.forEach(s => {
    const dc = s.dc_power || 0, ac = s.ac_power || 0, cnt = s.count || 1;
    const pwrStr = dc && ac ? dc + '+' + ac + ' кВт' : ((dc || ac) ? (dc || ac) + ' кВт' : '—');
    const pwrHtml = (pwrStr !== '—' && cnt > 1) ? pwrStr + ' <span style="color:var(--yellow)">×' + cnt + '</span>' : pwrStr;
    html += '<tr data-loc-id="' + group.key + '" style="opacity:.92">'
      + '<td style="padding-left:24px;color:var(--text-dim);font-size:11px">↳ ' + (OP_NAMES[s.operator] || s.operator) + '</td>'
      + '<td>' + typeBadge(s.station_type) + '</td>'
      + '<td></td><td></td>'
      + '<td class="center">' + gunCell(s.gun1_type) + '</td>'
      + '<td class="center">' + gunCell(s.gun2_type) + '</td>'
      + '<td class="center">' + gunCell(s.gun3_type) + '</td>'
      + '<td class="power right">' + pwrHtml + '</td>'
      + '<td class="date right">' + fmtDate(s.station_date) + '</td>'
      + '<td></td>'
      + '</tr>';
  });
  return html;
}

function renderMobile(stations) {
  const groups = groupByLocation(stations);
  const visibleGroups = groups.slice(0, STATE.visibleCount);
  const cardsWrap = document.getElementById('cards-wrap');

  cardsWrap.innerHTML = visibleGroups.map(g => {
    const first = g.stations[0];
    const totalPower = g.stations.reduce((n, s) => n + (((s.dc_power || 0) + (s.ac_power || 0)) * (s.count || 1)), 0);
    const totalGuns  = g.stations.reduce((n, s) => { const c = s.count || 1; let x = 0; if (s.gun1_type) x += c; if (s.gun2_type) x += c; if (s.gun3_type) x += c; return n + x; }, 0);
    const latestDate = g.stations.reduce((d, s) => s.station_date > d ? s.station_date : d, '');
    const newBadge   = isNew(latestDate) ? '<span class="new-badge">NEW</span>' : '';
    const flash      = (firstRender && isNew(latestDate)) ? ' new-flash' : '';

    const stationsHtml = g.stations.map(s => {
      const guns = [s.gun1_type, s.gun2_type, s.gun3_type].filter(Boolean);
      const gunsHtml = guns.map(x => '<span class="gun-pill"><span class="gun-dot"></span>' + x + '</span>').join('') || '<span class="st-no-gun">—</span>';
      const cnt = s.count || 1, dcP = s.dc_power || 0, acP = s.ac_power || 0;
      const pwrStr = dcP && acP ? dcP + '+' + acP + ' кВт' : ((dcP || acP) ? (dcP || acP) + ' кВт' : '—');
      const pwrHtml = (pwrStr !== '—' && cnt > 1) ? pwrStr + ' <span style="color:var(--yellow)">×' + cnt + '</span>' : pwrStr;
      return '<div class="station-row"><div class="st-left">' + typeBadge(s.station_type) + '<div class="st-guns">' + gunsHtml + '</div></div><div class="st-right"><span class="st-power">' + pwrHtml + '</span></div></div>';
    }).join('');

    const locNameHtml = first.location_name ? '<span class="loc-name">' + first.location_name + '</span>' : '';
    const locAddrHtml = first.address       ? '<span class="loc-addr">' + first.address + '</span>'       : '';

    return '<div class="loc-card' + flash + '" data-loc-id="' + g.key + '">'
      + '<div class="loc-head">'
        + '<div class="loc-head-left">' + opBadge(first.operator) + '<span class="loc-city">' + (first.city || '—') + '</span>' + locNameHtml + locAddrHtml + '</div>'
        + '<div class="loc-head-right">'
          + '<div class="loc-total-power">' + (totalPower ? totalPower + ' кВт' : '—') + '</div>'
          + '<div class="loc-total-label">ВСЕГО</div>'
          + (totalGuns ? '<div class="loc-total-label" style="margin-top:2px">' + totalGuns + ' пист.</div>' : '')
        + '</div>'
      + '</div>'
      + stationsHtml
      + '<div class="loc-footer">'
        + '<span class="loc-date">' + fmtDate(latestDate) + '</span>'
        + newBadge
      + '</div>'
      + ratingSlot(g.key)
    + '</div>';
  }).join('');
}

function groupByLocation(stations) {
  const map = new Map();
  stations.forEach(s => {
    const k = locationKey(s);
    if (!map.has(k)) map.set(k, { key: k, stations: [] });
    map.get(k).stations.push(s);
  });
  // порядок групп — по позиции первой станции в уже отсортированном массиве
  const order = [];
  const seen = new Set();
  stations.forEach(s => {
    const k = locationKey(s);
    if (!seen.has(k)) { seen.add(k); order.push(map.get(k)); }
  });
  return order;
}

function renderLoadMore(totalGroups) {
  const wrap = document.getElementById('load-more-wrap');
  // на десктопе в list view считаем строки; в group view — группы (как на мобиле)
  const isDesktopList = STATE.view === 'list' && window.matchMedia('(min-width:641px)').matches;
  const sorted = getSorted(getFiltered());
  const totalItems = isDesktopList ? sorted.length : groupByLocation(sorted).length;
  const remaining  = totalItems - STATE.visibleCount;

  if (remaining <= 0) { wrap.innerHTML = ''; return; }

  const nextChunk = Math.min(PAGE_SIZE, remaining);
  wrap.innerHTML = '<button class="load-more-btn" onclick="loadMore()">▼ ЗАГРУЗИТЬ ЕЩЁ ' + nextChunk + ' <span class="lm-rem">(осталось ' + remaining + ')</span></button>'
    + (remaining > PAGE_SIZE ? '<button class="show-all-btn" onclick="showAll(' + totalItems + ')">▼▼ ПОКАЗАТЬ ВСЕ (' + totalItems + ')</button>' : '');
}

// NEW-flash: убираем класс через 2.1с, чтобы анимация завершилась и больше не запускалась при перерендере
function flashNew(rootSel) {
  setTimeout(() => {
    document.querySelectorAll(rootSel + ' .new-flash').forEach(el => el.classList.remove('new-flash'));
  }, 2100);
}

// =============================================================
// VISIT
// =============================================================
async function trackVisit() {
  try {
    await fetch(SURL + '/rest/v1/visits', { method:'POST', headers:{ 'apikey':SKEY, 'Authorization':'Bearer '+SKEY, 'Content-Type':'application/json', 'Prefer':'return=minimal' }, body: JSON.stringify({ visited_at: new Date().toISOString(), page: 'stations' }) });
    const res = await fetch(SURL + '/rest/v1/visits?select=id&page=eq.stations', { headers:{ 'apikey':SKEY, 'Authorization':'Bearer '+SKEY, 'Prefer':'count=exact', 'Range':'0-0' } });
    const c = res.headers.get('content-range')?.split('/')[1] || '…';
    document.getElementById('visit-count').textContent = Number(c).toLocaleString('ru');
  } catch (e) { document.getElementById('visit-count').textContent = '…'; }
}

// =============================================================
// INIT
// =============================================================
async function init() {
  loadStateFromURL();

  // отразить начальное состояние в input + view-toggle
  document.getElementById('search-input').value = STATE.filterSearch;
  if (STATE.filterSearch) document.getElementById('search-clear').style.display = 'block';
  setView(STATE.view);

  try {
    const res = await fetch(SURL + '/rest/v1/stations?select=*&order=station_date.desc,station_time.desc.nullslast', {
      headers: { 'apikey': SKEY, 'Authorization': 'Bearer ' + SKEY }
    });
    allStations = await res.json();
    if (!Array.isArray(allStations)) allStations = [];
    buildMonthFilter(allStations);
    buildCityFilter(allStations);

    // подсветить активный op-btn по URL
    document.querySelectorAll('#op-filter span').forEach(el => el.classList.toggle('on', el.dataset.op === STATE.filterOp));

    applyFilters();
  } catch (e) {
    console.log('Error:', e);
    document.getElementById('reg-tbody').innerHTML  = '<tr><td colspan="10" class="loading">ОШИБКА ЗАГРУЗКИ</td></tr>';
    document.getElementById('cards-wrap').innerHTML = '<div class="loading">ОШИБКА ЗАГРУЗКИ</div>';
  }
  trackVisit();
}
init();

// scroll-top
window.addEventListener('scroll', function () {
  const b = document.getElementById('scroll-top');
  if (b) b.classList.toggle('visible', window.scrollY > 300);
});
