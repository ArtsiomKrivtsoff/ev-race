# Location Page — правки (backlog polish)

**Workflow:** автор присылает скрины/описания → записываем сюда → код **только после команды «ДЕЛАЙ»** одним батчем.

**Visual reference:** `docs/location_page_mockup.png`  
**Spec:** `docs/IMPLEMENTATION_SPEC.md`  
**Текущий код:** `functions/_lib/location-render.js`, `CSS/location-page.css`, `JS/location-page.js`, `JS/location-map.js`

**Prod baseline (Stage 2.2 v2 layout):** задеплоено — hero → infra → stations (multi) → фото+отзывы → nearby → report → status. Smoke OK.

---

## Статус блоков

| Блок | Статус backlog |
|------|----------------|
| **HERO mobile** | ✅ уточнено (ниже) |
| **Инфраструктура / станции mobile** | ✅ философия v2 (ниже) |
| **Desktop layout** | ✅ 67/33 main+sidebar (ниже) |
| **Фото + отзывы mobile** | ✅ (ниже) |
| **Теги + форма + рядом mobile** | ✅ (ниже) |
| **Статус / AI** | ❌ не делаем |
| **HERO desktop** | ✅ shell + inset (ниже) |
| **Design system** | ✅ home-v2 (ниже) |
| **Рядом** | ✅ |
| **Chrome header/footer** | ✅ уже (`site-chrome.js`) |

---

## Design system — продолжение главной

**Источник:** `index.html` + `CSS/home-v2.css` (уже подключён на location page).

**Переиспользовать:** `.blk`, `.blk-hdr`, `.blk-title`, `--home-card`, `--home-bdr`, `border-radius: 5px`, Share Tech Mono labels, Press Start 2P для KPI.

**Приёмы с главной (где уместно):**

| Приём | Класс-референс | Location page |
|--------|----------------|---------------|
| Иконка + текст в ряд | `.ss-cell` / `.ss-ico` + drop-shadow | infra, nearby |
| Карточка в карточке | `.hl-narrative`, `.hm-narr` | desktop hero: рейтинг + карта |
| KPI glow | `.hr-days`, `.ss-txt` text-shadow | рейтинг 84/56px, infra 42/32px, tag counts |
| UPPERCASE labels | `.blk-title`, `.ss-txt` | заголовки секций, breakdown |

**«Неон» (Press Start 2P + text-shadow):** только **крупные цифры и короткие акценты** (рейтинг, мощность, счётчики тегов). **Текст отзывов** — обычный readable шрифт **без** glow (как body на главной, не как ss-grid).

**Не переносить:** ss-grid сезона, race narrative, LIVE, progress bars.

---

## HERO — desktop (shell + inset)

**Одна внешняя рамка** `.loc-hero-shell` (как `.blk` / `.hero-left`): full width, `border-radius: 5px`.

**Внутри grid** (только desktop, `@media min-width`):

```
grid-template-columns: minmax(0, 13fr) auto minmax(180px, 8fr);
/* ≈52% identity | квадрат рейтинга | карта flex */
```

| Зона | Рамка | Содержимое |
|------|-------|------------|
| **Identity** (слева) | без inner — open area | оператор, title 48px, aggregator, 3 кнопки |
| **Рейтинг** | **`.loc-hero-inset`** (как `.hl-narrative`) | «РЕЙТИНГ ЛОКАЦИИ», 84px, звёзды, meta, клик → `#reviews` |
| **Карта** | **`.loc-hero-inset`** | «НА КАРТЕ», Leaflet height 100% |

**Высота ряда (2026-06-05, принято):** задаёт **identity** (адрес + кнопки). Рейтинг и карта **подстраиваются** под неё — не наоборот. См. **D-hero-density** в батче.

**Inset стиль:** `border: 1px solid var(--green)`, `background: rgba(0,255,65,.04)`, `box-shadow: 0 0 18px rgba(0,255,65,.1)`, `border-radius: 4px`.

**Кнопки desktop hero:** МАРШРУТ + ПОДЕЛИТЬСЯ + **ОЦЕНИТЬ** → `#review-form`. Layout 3×1/3 — см. **D-hero-buttons** ниже.

### Identity (содержимое — без изменений)

- **Оператор над** названием/адресом (secondary layer, не hero оператора).
- **Без `location_name`:** две строки крупно — **ГОРОД** / **АДРЕС, ДОМ**.
- **С `location_name`:** name **48px** крупно → адрес **мельче** (meta tier ~14–16px).
- **Убрать** подстроку pin / copy / индекс (`loc-hero-address` и аналоги).
- **Aggregator** («в Malanka») — tertiary, мелкая строка, только если есть.

**Оператор (текст, без logo):**

- Branded operators: **фирменный цвет**, без точки; референс `.op-hero-name` в `operators/forevo.html`, но цвет оператора.
- `op-other` / мелкие юрлица: **зелёный** (`--green`).

**Кнопки (3):**

| Кнопка | Стиль | Действие |
|--------|-------|----------|
| **МАРШРУТ** | primary green filled | Google/Yandex maps (как сейчас) |
| **ПОДЕЛИТЬСЯ** | outline | `shareLocation()` |
| **ОЦЕНИТЬ** | accent (cyan/yellow) | scroll `#review-form` (desktop hero) |

**Mobile:** третья кнопка **не** в левой карточке — **«ОЦЕНИТЬ ЛОКАЦИЮ»** в карточке рейтинга.

### Рейтинг inset (desktop)

- Квадрат, заголовок **«РЕЙТИНГ ЛОКАЦИИ»**, цифра **84px** + glow, звёзды, «N отзывов • N фото»
- Клик → `#reviews`

### Карта inset (desktop)

- **«НА КАРТЕ»**, Leaflet на всю высоту inset

---

## HERO — mobile (mock от автора, 2026-06-03)

**Верх экрана — две карточки в ряд (~60/40):**

| Слева — «Место» | Справа — «Рейтинг» |
|-----------------|-------------------|
| Оператор (14–16px), фирменный цвет, **без logo** (текст) | «РЕЙТИНГ ЛОКАЦИИ» |
| Заголовок места **30px** | Цифра **56px** (или placeholder ☆☆☆☆☆) |
| Aggregator **13–14px** (синий), если есть | Звёзды **22px** |
| Кнопки **14px**: МАРШРУТ + ПОДЕЛИТЬСЯ | «N ОТЗЫВОВ • N ФОТО» **14px** |
| | **Кнопка «ОЦЕНИТЬ ЛОКАЦИЮ»** — внизу карточки рейтинга → `#review-form` |

**Убрать на mobile:** pin, copy, индекс, строка meta-адреса под заголовком.

**Карта на mobile:** **не выводим** — достаточно кнопки МАРШРУТ.

**Desktop:** карта только **внутри hero shell** (inset). Mobile — без карты.

**Высота row:** левая карточка задаёт высоту; правая (рейтинг) **stretch** + «ОЦЕНИТЬ ЛОКАЦИЮ» заполняет низ — выровнять по mock.

---

## HERO — исключить

- Полоска EV RACE / progress (на mockup зачёркнута).
- Race-семантика на location page (spec §2027 test).
- Дублирование рейтинга в hero и в блоке отзывов без связи (hero → anchor `#reviews`).

---

## Данные / API (при реализации hero)

**Адрес в БД:** Область / Город / Адрес (улица, дом).

- Сейчас в `get-location`: `city` + `address`.
- **Область** — проверить наличие в `locations` / `stations`, прокинуть в API и hero при «ДЕЛАЙ».

**Правило identity:** страница = **место**, не компания. URL `/{operator_slug}/{slug}` — routing only.

---

## Typography Spec v1 (hero + общие)

| Элемент | Desktop | Mobile |
|---------|---------|--------|
| Operator | 16px / 600 | 14px |
| Location name | 48px / 700 / lh 0.95 | 30px / 700 / lh 1.0 |
| City / address (no name) | крупный tier (≈ name scale) | пропорционально mobile name |
| Aggregator | 14px | 13px |
| Hero buttons | 14px | 14px |
| Rating value | 84px / 700 | 56px |
| Stars | 28px | 22px |
| Rating meta | 15px | 14px |
| Section headers | 18px / 600 | 16px |
| Infra values | 42px | 32px |
| Infra labels | 13px | 12px |
| Tags / reviews / nearby / footer | по spec GPT — уточнить по блокам |

**Правила:**

- Location name — главный объект; в левой карточке ≥ **2.5×** другого текста.
- Rating **84px** — отдельная KPI-карточка, не inline в identity.

---

## Блоки ниже hero — ждут рекомендаций

*(пусто — дополняется по мере присылки скринов)*

### ⚡ Блок «СТАНЦИЙ В ЛОКАЦИИ» (mobile + desktop)

**Одна карточка `.blk`** — **единственный** технический блок локации. **Таблица станций — убрать** на всех breakpoints.

**Шапка:** **«СТАНЦИЙ В ЛОКАЦИИ»** + badge **X** = `meta.station_count` (`sum(count)`).

**Сетка 3 колонки** — иконки как на mock, ячейки **центрированы**:

| Колонка | Label | Value | Формула |
|---------|-------|-------|---------|
| ⚡ | **МОЩНОСТЬ ЛОКАЦИИ** | суммарно, напр. `384 кВт` | `Σ (dc_power + ac_power) × count` |
| 🔌 | **Коннекторы** | `CCS ×2` · `GBT ×1` … | gun1–3 × `count`, группировка по типу |
| 🚗 | **Одновременно** | `до N авто` | `Σ simultaneous_charge × count` (поле **всегда заполнено** в БД) |

**Footer — sub-block** `.loc-infra-breakdown`:

| Условие | Layout |
|---------|--------|
| Только DC | «DC зарядок» + `160 кВт × 1, 80 кВт × 2` |
| DC + AC | две колонки: DC breakdown \| AC breakdown |
| Только AC | «AC зарядок» + тот же формат |

Breakdown: группировка по `dc_power` / `ac_power` (ненулевые), `sum(count)`, сортировка kW ↓.

**Responsive:** mobile values 28–32px / labels 12–13px / header 16px; desktop values **42px** / labels 13px / header **18px**.

**При «ДЕЛАЙ» удалить:** `renderStationsBlock`, table/mobile station render, связанный CSS.

**Edge:** ACDC с `dc_power` + `ac_power` — оба в сумму мощности; `simultaneous_charge` **never null** в prod data.

---

## Badge-система (все блоки)

Единый паттерн шапки `.blk-hdr`:

```
[ЗАГОЛОВОК]                    [N]
```

| Блок | Badge |
|------|-------|
| СТАНЦИЙ В ЛОКАЦИИ | `station_count` |
| ФОТО ЛОКАЦИИ | `photo_count` (approved, из отзывов) |
| ОТЗЫВЫ | `review_count` |

Badge показывать **только если N > 0**. При 0 — badge скрыт, empty-state в теле блока.

**Единый CTA:** `.loc-review-cta` — текст **«ОЦЕНИТЬ ЛОКАЦИЮ»** (альтернатива «ОСТАВИТЬ ОТЗЫВ» — не использовать «полевой отчёт» / «отправить отчёт»).

**Якорь всех CTA:** `#review-form` (hero рейтинг, empty фото, empty теги — scroll сюда).

---

### 📷 ФОТО ЛОКАЦИИ (`#photos`, mobile + desktop семантика)

**Источник:** только фото из отзывов (отдельного upload нет).

**Empty state** (`photo_count === 0`):

- Текст: **«Фото появляются в отзывах»**
- Кнопка **«ОЦЕНИТЬ ЛОКАЦИЮ»** → `#review-form`
- Без fake-grid «ФОТО 1…6»

**С фото:**

- Strip: до **4** превью в ряд; на последнем видимом — overlay **«+N»** если есть ещё
- **Без** кнопки «СМОТРЕТЬ ВСЕ ФОТО» (mobile и desktop)
- **Tap** на превью или «+N» → **lightbox** (JS в polish-батче):
  - swipe / стрелки между фото
  - счётчик `4 / 12`
  - подпись: **«Из отзыва · {author} · {relative time}»**
  - закрытие ✕ / swipe down

**До Stage 3:** вёрстка + lightbox на mock/static data или пустой strip; URLs из `community.photos[]` когда API готов.

---

### 💬 ОТЗЫВЫ (`#reviews`, mobile)

**Шапка:** «ОТЗЫВЫ» + badge `review_count` (если > 0).

**Empty list** (`review_count === 0`): только «Пока нет отзывов» — **без** второй кнопки (CTA уже в `#review-form` выше). «ПОКАЗАТЬ ЕЩЁ» — скрыта.

**Карточка отзыва** — как mock preview:

| Элемент | Правило |
|---------|---------|
| Аватар | pixel/robot placeholder или Telegram avatar |
| Автор | 15–16px, accent (purple на mock) |
| Время | 12–13px |
| Звёзды | справа вверху карточки |
| **Метка фото** | **📷 N** — только если у отзыва есть фото; tap → lightbox с **фильтром на фото этого отзыва**; mobile + desktop |
| Теги | chips зелёные (+) / красные (−), 12–13px |
| Текст | 15px |
| **ПОЛЕЗНО** + счётчик | 13px — оставить |
| **⋯** | report / модерация — оставить |
| **ОТВЕТИТЬ** | **убрать** (не соцсеть, без threads) |
| Inline-фото в теле | **не показываем** — только метка 📷 |

**Pagination:** первые **3** отзыва; **«ПОКАЗАТЬ ЕЩЁ ОТЗЫВЫ ▾»** — по **+3** (client-side expand до Stage 3 API pagination).

**Typography:** header 16px · author 15–16px · text 15px · tags 12–13px · meta 12–13px · actions 13px.

---

---

## Mobile vs Desktop — порядок (сводка)

| Блок | Mobile (stack) | Desktop |
|------|----------------|---------|
| Hero | full | full (3 cards) |
| Станций | 2 | **main** top |
| Фото | 3 | **sidebar** top |
| Теги | 4 | **main** |
| #review-form | 5 | **sidebar** (2) |
| Отзывы | 6 | **main** |
| Рядом | 7 | **sidebar** (3) |

---

## Desktop — сетка main + sidebar

**Референс wireframe:** присланный скрин — **только** идея «hero full width → две колонки». Содержимое mock **устарело**.

**Правило:** блоки = **те же**, что mobile (данные, empty states, CTA, lightbox). Отличия: **раскладка**, типографика desktop (headers 18px, infra values 42px).

### Пропорция

```css
grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); /* ≈67% / 33% */
```

### Hero (full width)

3-zone **shell** (desktop) / 2 cards row (mobile) — см. выше.

### Main — две колонки (`loc-main-grid`)

**Широкая (~67%) — main**

| Порядок | Блок |
|---------|------|
| 1 | **Станций в локации** (mobile content + desktop typography) |
| 2 | **Теги** (на основе отзывов) |
| 3 | **Отзывы** (список, 3 + по 3) |

**Узкая (~33%) — sidebar**

| Порядок | Блок |
|---------|------|
| 1 | **Фото локации** |
| 2 | **`#review-form`** (ОЦЕНИТЬ + TG + privacy) |
| 3 | **Рядом** (до 8) |

### Первый ярус: equal height (infra ↔ фото)

Верх sidebar **фото** и верх main **станций** — **одна строка**, `align-items: stretch`:

- Высоту задаёт **левый** (infra); фото-panel заполняет высоту соседа
- Thumbs: 2 col, full width, `object-fit: cover`; overflow → **gradient fade** + tap **lightbox**
- Empty фото: тот же copy + ОЦЕНИТЬ → `#review-form`, vertically centered в высоте infra

Ниже первого яруса колонки **растут независимо** (слева длинные отзывы, справа короче — норм).

**Опционально (polish):** `sticky` на sidebar-блоке фото+форма — не обязательно v1.

### Footer infra (desktop)

**Запуск: DD.MM.YY** — если есть `station_date` в БД (min/max — при «ДЕЛАЙ»). Без дубля оператора (он в hero).

**Chrome:** header/footer — **`site-chrome.js`**, без изменений в polish-батче.

---

## Mobile — порядок блоков (v2)

```
1. Hero (место + рейтинг + ОЦЕНИТЬ → #review-form)
2. Станций в локации
3. Фото локации
4. Теги (на основе отзывов)
5. Оценить локацию (#review-form) ← TG + privacy + CTA
6. Отзывы (список)
7. Рядом (до 8)
```

**Не на странице:** блок СТАТУС, AI-сводка, «смотреть все локации {operator}», таблица станций.

---

### 🏷 ТЕГИ (НА ОСНОВЕ ОТЗЫВОВ)

**Visual:** как mock — сетка **`.loc-tag-agg-cell`**: label сверху, **count крупно** снизу; зелёная рамка (+), красная (−). Responsive wrap (mobile 2 col, desktop 3–4 col).

**Данные:** `community.tags[]` из get-location — `{ tag, count, polarity }`, sort count DESC, только count > 0.

**Empty** (нет отзывов или нет агрегированных тегов):

- «Теги появятся после отзывов сообщества»
- **«ОЦЕНИТЬ ЛОКАЦИЮ»** → `#review-form` (не скрывать блок целиком — в отличие от spec «< 3 отзывов hide»)

**Badge:** опционально — число тегов с count > 0.

**Позиция:**

- **Mobile:** после фото, перед `#review-form`
- **Desktop:** широкая колонка — после infra, перед отзывами

---

### ✍️ ОЦЕНИТЬ ЛОКАЦИЮ (`#review-form`)

**Не «отправить отчёт»** — форма входа в отзыв. Единственное место на странице.

| Элемент | Правило |
|---------|---------|
| Заголовок блока | **«ОЦЕНИТЬ ЛОКАЦИЮ»** (16px) |
| Подзаголовок | «Войдите через Telegram» + 🔒 |
| Primary | **ВОЙТИ ЧЕРЕЗ TELEGRAM** (синий outline, 15px) |
| Privacy | **Под кнопкой TG**, явно: *«Не храним и не запрашиваем персональные данные. Telegram — только анонимный hash для одного отзыва на локацию.»* |
| Meta | «Быстро • Безопасно • Анонимно» (12px) — можно объединить с privacy |
| Secondary | **«или»** + `.loc-review-cta` **«ОЦЕНИТЬ ЛОКАЦИЮ»** (анонимный путь, Stage 3) |

**Позиция:**

- **Mobile:** после тегов, перед списком отзывов (короткий scroll с hero)
- **Desktop:** **узкая колонка** — после фото, **перед** «Рядом» (CTA ближе к hero якорю)

---

### 📍 РЯДОМ

**До 8** локаций (как в API), **все операторы**, sort distance → rating.

**Строка:** operator badge/имя (15–16px) · адрес (13–14px) · **справа:**

```
[ ★ 4.4 ]  [ 1.2 км ]
  опционально   always, flush right
```

- **Расстояние** — **крайняя правая** (фикс. колонка); **всегда** (`distance_km` — coords у локаций всегда есть).
- **Рейтинг** — **левее** km; если нет отзывов/rating — **не рендерим**, km **не смещается** (`margin-left: auto` на meta-группе, km — последний child).

**Без** footer «Смотреть все локации {operator}».

**Empty:** «Других локаций в этом городе пока нет» — без badge.

**Позиция:**

- **Mobile:** после отзывов, последний блок
- **Desktop:** **узкая колонка**, после `#review-form`

---

### ❌ СТАТУС / AI

- **СТАТУС (LIVE, очередь)** — **убрать** с location page (нет продукта, никто не будет заполнять).
- **AI-сводка** — **не делаем** (spec §9.10).

---

## После hero polish (не этот батч)

- **2.2b** — slug + ссылки из `stations.html` / `map.html`
- Sitemap location URLs
- **Stage 3** — reviews, Telegram auth, tags, photos

---

## Chrome — лого EV RACE (⏳ после polish-батча)

**Не в текущем батче** — делаем после основной страницы.

**Место:** `.statusbar` в `site-chrome.js` — между burger и nav (как на mock).

**Вид:** две строки, **без 2026** (как присланный asset):

| Строка | Текст | Стиль |
|--------|-------|--------|
| 1 | **EV RACE** | Press Start 2P, green + glow (`.hl-title`) |
| 2 | **в БЕЛАРУСИ** | Press Start 2P, yellow (`.hl-sub`) |

Ссылка на `/`. Hero локации **не** дублирует бренд.

---

## Hero mobile — правки v2 (2026-06-03, согласовано)

### Кнопки — **не** общая строка на всю ширину

**Отклонено:** третья кнопка в отдельном row под hero — ломается при появлении рейтинга.

**Принято:**
- Левая карточка: **МАРШРУТ** + **ПОДЕЛИТЬСЯ** (flex, одинаковая высота).
- Правая карточка (inset-рамка **остаётся**): контент рейтинга **или** empty stub + **ОЦЕНИТЬ** внизу (`margin-top: auto`).
- **ОЦЕНИТЬ** — навсегда в правой карточке; при наличии отзывов сверху цифра/звёзды/meta, кнопка остаётся внизу.
- Все три кнопки — один класс `.loc-btn`, одна высота; визуально одна линия за счёт `align-items: stretch` + `margin-top: auto` на action-row.

### Empty rating

> **Устарело v8.** Актуальная логика — секция **«Hero inset — пустой рейтинг»** ниже (X.X 40% · ☆☆☆☆☆ · «ОТЗЫВОВ ПОКА НЕТ»).

---

### Identity / typography

| Решение | Детали |
|---------|--------|
| **A — иерархия** | Строка 1: **город** → 2: **адрес** → 3 *(если есть)*: `location_name` другим цветом |
| **B — длинный адрес** | **Не обрезать.** JS fit-text: уменьшать `font-size` пока строка влезает в контейнер + отступы |
| **Оператор** | Press Start 2P / Share Tech Mono, **фирменный цвет**, без pill `.op-bf` background |
| **Город/адрес** | Press Start 2P, зелёный; город крупнее адреса |
| **Шрифт** | Рубленый (Press Start 2P), не Share Tech Mono |

### Infra mobile

- Одна строка **3 ячейки** (как mock), dividers, без трёх stacked cards.

### Spacing (desktop + mobile)

- Токены: `--loc-gap: var(--s-3)`, `--loc-pad: var(--s-4)`.
- Grid gap между **всеми** `.blk` — одинаковый по X и Y.
- `.blk { margin: 0 }` внутри `.loc-main-grid` — только gap, не margin collapse.
- Padding контента внутри рамок — `--loc-pad` (в т.ч. `.blk-hdr`).

---

## Desktop + mobile — следующий батч (⏳ не делать)

**Статус:** обсуждение 2026-06-05. Код **не трогать** до команды «ДЕЛАЙ» (desktop + mobile в одном батче или по частям — уточнить).

---

### Hero inset — пустой рейтинг ✅ решено

**Принцип:** имитация **заполненной** карточки с пустыми данными (референс — скрин с 4.6 / звёздами / meta).

| Слой | С отзывами | Пустое состояние |
|------|------------|------------------|
| Заголовок | РЕЙТИНГ ЛОКАЦИИ | **то же** |
| KPI | `4.6` (Press Start 2P, green + glow) | **`X.X`** — **зелёный**, **opacity ~40%**, без glow (placeholder цифры) |
| Звёзды | жёлтые/оранжевые ★ | **☆☆☆☆☆** серые, **opacity ~40%** |
| Meta | `18 ОТЗЫВОВ • 12 ФОТО` | **`ОТЗЫВОВ ПОКА НЕТ`** (одна строка, tier meta) |

- Desktop inset + mobile rating card — **одинаковая логика** (см. **Mobile hero** ниже).
- Desktop empty: CTA **ОЦЕНИТЬ ЛОКАЦИЮ** в hero actions.
- Mobile empty: CTA **ОЦЕНИТЬ** — в карточке рейтинга (plain `.loc-btn`).
- Карточка **не кликабельна** в empty (нет `#reviews` anchor).

---

### Hero inset — заголовки ✅ решено

| Блок | Решение |
|------|---------|
| Рейтинг | **«РЕЙТИНГ ЛОКАЦИИ»** — **оставить** |
| Карта | **«НА КАРТЕ»** — **убрать** |

---

### Infra breakdown — DC / AC ✅ направление

- Формат: **`DC: 160×3, 120×1`** · **`AC: …`** — без слова «зарядок».
- «кВт» в breakdown — **убрать** (мощность уже в KPI сверху).
- Split-row DC | AC — если оба типа есть; одна колонка — если только DC или только AC.

---

### Infra footer — дата запуска ⏸ отложено

**Решение (2026-06-05):** в **следующем батче дату не показываем** — убрать `.loc-infra-footer` / строку «Запуск».

**Почему отложено:** автор пока не знает, как корректно вставить дату на **mobile** (хотя данные, вероятно, **понадобятся** позже).

**На потом (не в батче):** варианты из обсуждения — одна строка с DC/AC + `ЗАПУЩЕНО: DD.MM.YY` справа (desktop); mobile wrap / вторая строка. Вернуть, когда будет mobile-решение.

**Breakdown DC/AC** — делаем без даты (см. ниже).

---

### Mobile hero — карточки «Место» | «Рейтинг» (2026-06-05)

**Скрин-реф:** mobile v8 — обрезка адреса, перенос кнопки.

#### Правая карточка — рейтинг ✅ = desktop

| Слой | Empty |
|------|-------|
| Заголовок | РЕЙТИНГ ЛОКАЦИИ |
| KPI | **X.X** зелёный opacity **40%** |
| Звёзды | ☆☆☆☆☆ серые **40%** |
| Meta | **ОТЗЫВОВ ПОКА НЕТ** |
| CTA | **ОЦЕНИТЬ** — plain `.loc-btn`, full width блока |

#### Левая карточка — адрес + кнопки

**Баг:** номер дома **обрезан**; **ПОДЕЛИТЬСЯ** уехала на вторую строку.

**Адрес:** fit-text — уменьшать шрифт, пока улица **целиком** в контейнере; **без ellipsis**. Проверить padding / overflow.

**Кнопки ✅:**

```
[  МАРШРУТ 50%  |  ПОДЕЛИТЬСЯ 50%  ]     [  карточка рейтинга  ]
                                              … X.X · звёзды …
                                              [ ОЦЕНИТЬ 100%     ]
```

- Левая: **flex row**, две `.loc-btn` по **50%**, **один font-size**
- Правая: **ОЦЕНИТЬ** — **100%** ширины, **та же height** что МАРШРУТ/ПОДЕЛИТЬСЯ
- Row `align-items: stretch` — baseline кнопок на одной линии

**Отступы:** `--loc-gap` между карточками, `--loc-pad` внутри; текст не прижимать к border.

---

### Infra mobile (2026-06-05)

#### Badge `[N]` в «СТАНЦИЙ В ЛОКАЦИИ» ✅

На phone заголовок и цифра **слишком близко** — связь теряется (desktop ok).

**Принято:** badge **крупнее + жирнее** (Press Start 2P или `font-weight: 700`); опционально уменьшить visual gap `space-between` в `.blk-hdr` на mobile.

#### «Одновременно» ✅

**Было:** `до 6 авто` · **принято:** **`6 АВТО`** — слово «ДО» убрать (label «ОДНОВРЕМЕННО» уже даёт смысл).

#### Label ↔ value в ячейках ✅

На mobile label и value **слишком близко** — при батче чуть **увеличить `gap`** в `.loc-infra-copy`.

---

### Desktop hero — плотность + высота (2026-06-05) ✅

**Проблема (скрин):** под кнопками в identity — **пустота**. Причина: `align-items: stretch` + `min-height` карты (180px) / рейтинга (168px) — левая колонка растягивается под соседей.

**Принято — логика «якорь слева»:**

```
┌ identity (якорь) ─┐  ┌ rating stretch ┐  ┌ map stretch ┐
│ оператор · адрес  │  │  center Y      │  │  flex fill  │
│ [ 3 кнопки ]      │  │  fluid type    │  │  Leaflet    │
└───────────────────┘  └────────────────┘  └─────────────┘
         ↑ одна высота ряда = контент identity (+ padding)
```

| # | Решение |
|---|---------|
| D1 | **Снять** shell-level `min-height` у рейтинга (168px) и map-wrap (180px) на desktop — они **не** задают высоту ряда |
| D2 | Рейтинг + map-wrap: **stretch** на высоту identity; padding `--loc-pad` / `--s-3` внутри inset |
| D3 | **Рейтинг:** контент **по центру по вертикали** (`justify-content: center`); **резиновая вёрстка** — `container-type: size` + `clamp` / `cqh` для X.X, звёзд, meta (масштаб от высоты карточки, без JS) |
| D4 | **Карта:** `flex: 1` внутри wrap; **floor** `min-height: ~112px` только у `.loc-hero-map` (чтобы пин читался), не у всего shell |
| D5 | После смены высоты — проверить **`map.invalidateSize()`** в `location-map.js` |
| D6 | Карта **не** опускаем вторым рядом — остаётся **третья колонка**, просто **короче** по высоте |

**Не делать:** оставлять `min-height: 180px` на map-wrap — снова вернёт «воздух» слева.

---

### Desktop hero — кнопки (2026-06-05) ✅

**Принято (вариант B):** три кнопки **3 × 1/3** ширины identity, `flex-wrap: nowrap`, **один крупный шрифт** (`font-weight: 600`).

```
[    МАРШРУТ    |    ПОДЕЛИТЬСЯ    |      ОЦЕНИТЬ      ]
     33.33%            33.33%            33.33%
```

| Аспект | Решение |
|--------|---------|
| Layout | `.loc-hero-actions` — row на всю ширину; `flex: 1 1 33.333%`; `gap: var(--s-2)` |
| Текст третьей кнопки | **«ОЦЕНИТЬ»** (не «ОЦЕНИТЬ ЛОКАЦИЮ») — как mobile card |
| Шрифт | Единый размер на все три, крупнее текущего (~`clamp(11px, 1vw, 14px)`) |
| Стили | МАРШРУТ primary · ПОДЕЛИТЬСЯ outline · ОЦЕНИТЬ accent |
| Высота | Единая; padding симметричный |

**Отклонено:** fit-text в кнопках (A), две строки (C), полная фраза в hero.

**Код:** `renderReviewCta` в desktop hero — label **`ОЦЕНИТЬ`**.
---

### Mobile — сводная таблица батча

| # | Тема | Статус |
|---|------|--------|
| M1 | Empty rating = desktop | ✅ |
| M2 | Кнопки 50/50 + ОЦЕНИТЬ equal height | ✅ |
| M3 | Адрес fit-text, fix обрезки | ✅ |
| M4 | Отступы gap/pad | ✅ |
| M5 | Infra 3-col + connectors stack | ✅ |
| M6 | DC/AC breakdown, **без даты** | ✅ |
| M7 | Badge N крупнее/жирнее | ✅ |
| M8 | `6 АВТО` без «ДО» | ✅ |
| M9 | Дата запуска | ⏸ |

---

### Desktop — сводная таблица батча

| # | Тема | Статус |
|---|------|--------|
| D1–D6 | Hero density — якорь identity, stretch rating/map | ✅ |
| D7 | Empty rating = mobile (X.X · stars · meta) | ✅ |
| D8 | Убрать «НА КАРТЕ» | ✅ |
| D9 | Резиновый рейтинг (`cqh` / container queries) | ✅ |
| D10 | Кнопки 3×1/3, «ОЦЕНИТЬ», крупный шрифт | ✅ |
| D11 | Infra breakdown DC/AC, без даты | ✅ |
| D12 | `6 АВТО` без «ДО» | ✅ |

---
