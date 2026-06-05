# SEO-B P1-2 — Map → Location (план)

**Дата:** 2026-06-05  
**Статус:** **CLOSED** — prod после deploy  
**Предусловие:** P1-1 Dynamic Sitemap — **CLOSED** (prod 133 URL, commit `2671277`)

---

## 1. Текущее состояние `map.html`

### Ссылки на location pages

**Нет.**

Popup сегодня содержит только:
- оператор / адрес / мощность / разъёмы / дата;
- кнопку **«► МАРШРУТ»** (только mobile).

Файл: [`map.html`](../map.html) — `makePopup()`, ~стр. 558–602.

Запрос данных **без** `operator_slug`, `slug`, JOIN с `locations`:

```javascript
const fields = 'operator,aggregator,station_type,city,address,location_name,count,dc_power,...';
fetch(SURL + '/rest/v1/stations?select=' + fields + '&lat=not.is.null', ...)
```

Аудит: [`LOCATION-PAGE-SEO-AUDIT.md`](LOCATION-PAGE-SEO-AUDIT.md) — map **FAIL**, нет ссылки на location page.

### Сколько объектов на карте (prod, 2026-06-05)

| Метрика | Значение |
|---------|----------|
| Строк `stations` с координатами | **166** |
| **Маркеров** (уникальные lat/lng, `groupByCoords`) | **123** |
| Активных `locations` | **123** |

Маркер = **1 pin на координату** (не 1 pin = 1 location). При совпадении coords у разных операторов — один pin, popup со всеми станциями в точке.

По умолчанию (слайдер «сейчас», без фильтров): **~123 маркера**, zoom 7, вся Беларусь.

---

## 2. План реализации Map → Location

### Подход (surgical)

По [`IMPLEMENTATION_SPEC.md`](IMPLEMENTATION_SPEC.md) §9.11 — **только** [`map.html`](../map.html), ~0.5 д.

#### Шаг A — данные

1. Параллельно с `stations` загрузить `locations`:
   ```
   GET /rest/v1/locations
     ?select=operator,city,address,operator_slug,slug
     &is_active=eq.true
   ```
2. На клиенте — lookup по каноническому ключу (как `generate_location_key` в БД):
   ```text
   normalize(operator)|normalize(city)|normalize(address) → { operator_slug, slug }
   ```
   `normalize`: lower + trim + collapse `\s+`.

#### Шаг B — popup (`makePopup`)

3. После блока адреса (`locHtml`), **перед** списком станций:
   - если slug найден → **`<a href="https://evrace.by/{operator_slug}/{slug}">`**
   - текст: **«КАРТОЧКА ЛОКАЦИИ →»** или **«ПОДРОБНЕЕ →»**
   - если slug нет → блок не рисуем (UI не ломаем).

4. **Edge case:** один pin, несколько `location_key` (редко) → ссылка на **каждую** уникальную локацию в группе.

5. CSS: `.popup-loc-link` — в духе `.popup-route-btn`, без переписывания popup logic.

#### Макет popup (после)

```
┌─ popup ─────────────────────┐
│ [forEVo]                     │
│ 📍 Минск, Рудобельская, 3    │
│ ┌─────────────────────────┐  │
│ │ КАРТОЧКА ЛОКАЦИИ →       │  │  ← NEW <a href>
│ └─────────────────────────┘  │
│ ⚡ DC 80 кВт · …             │
│ ► МАРШРУТ (mobile)           │
└──────────────────────────────┘
```

### Crawler без JS

| Слой | Location links |
|------|------------------|
| Исходный HTML `map.html` | **нет** (Leaflet SPA) |
| Popup после JS | **да** — `<a href="https://evrace.by/...">` |

P1-2 **не** делает map crawlable без JS. No-JS path закрыт **P1-1 sitemap**.  
P1-2 — internal links для JS-ботов и пользователей.

Static HTML / `<noscript>` — **не в scope P1-2**.

### Проверка после реализации

| # | Проверка |
|---|----------|
| 1 | В `makePopup` есть `<a href="https://evrace.by/` + slug |
| 2 | Manual: 5 маркеров (Malanka, forEVo, Zaryadka, Orange, AC-only) → 200 location page |
| 3 | Fallback: нет slug → popup без ссылки, без ошибок |
| 4 | Regression: ~123 маркера без фильтров |
| 5 | `node scripts/verify-map-location-links.mjs` → PASS |
| 6 | Mobile: ссылка видна и кликабельна в popup |

**Эталоны smoke:**

- `https://evrace.by/malanka/minsk-k-turovskogo-6`
- `https://evrace.by/forevo/minsk-rudobel-skaya-3`
- `https://evrace.by/zaryadka/minsk-inzhenernaya-18`
- `https://evrace.by/orange/minsk-per-rabochiy-6`
- `https://evrace.by/zaryadka/minsk-mstislavca-6` (AC)

---

## 3. Definition of Done — P1-2

| # | Критерий |
|---|----------|
| 1 | `locations` загружаются, lookup по `location_key` |
| 2 | Popup: `<a href="https://evrace.by/{operator_slug}/{slug}">` при наличии slug |
| 3 | Абсолютный URL (не `#`, не `javascript:`) |
| 4 | Fallback без slug — без ошибок |
| 5 | Smoke 5 маркеров → корректные location pages |
| 6 | Маркеры / фильтры / маршрут — без регрессии |
| 7 | `verify-map-location-links.mjs` → PASS |

**Не в scope P1-2:** звёзды/reviews в popup, static HTML без JS, переписывание clustering.

---

## Связанные документы

- [`SEO-A-DECISIONS.md`](SEO-A-DECISIONS.md) — roadmap SEO-B
- [`LOCATION-PAGE-SEO-FOUNDATION.md`](LOCATION-PAGE-SEO-FOUNDATION.md) — §3 linking
- [`IMPLEMENTATION_SPEC.md`](IMPLEMENTATION_SPEC.md) — §9.11

---

## Changelog

| Дата | Событие |
|------|---------|
| 2026-06-05 | План P1-2 зафиксирован перед реализацией |
