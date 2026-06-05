# Правки v2 (backlog)

*Батч 2026-06-02 (батч 2) выполнен — см. `context.md`.*

## Два типа текстов (зафиксировано автором)

**Полная философия блока «СОСТОЯНИЕ СЕЗОНА»:** [`v2/SEASON-STATE.md`](SEASON-STATE.md)

| Блок | Источник | Пример |
|------|----------|--------|
| **СОСТОЯНИЕ СЕЗОНА** (`#diag-leader`, `#diag-region`, `#diag-tempo`) | **Deterministic diagnostics** — код + pools + правила (`diagLeader`, `diagRegion`, `diagTempo`). Без GPT. | «Лидер замедлился», «Минск в центре роста» |
| **Narrative** (`.hl-narrative`, `.hm-narr`) | **Только AI** (snapshots / Edge Functions) | заглушка «AI NARRATIVE — СКОРО» |
| **Heartbeat** | Отдельный temporal layer | **Не** повторять wording diagnostics |

**Не смешивать:** rule-based фразы **не** в narrative; AI **не** в ss-grid; heartbeat **≠** diagnostics.

Не вносить в код до явного **ДЕЛАЙ**.

---

## Отложено (фаза 3)

- ~~Tesla-темы для v2 dashboard~~ — **сделано** в `CSS/home-v2.css` (`[data-theme="tesla-light|dark"]`, только `.page-wrap`)
- **ЭФФЕКТЫ / ЧЁТКО** (`.fx-toggle`) — **только ARCADE**; на TESLA скрыт, не используется
- Live AI narrative / snapshots — **только** блок `.hl-narrative` / `.hm-narr`, не ss-grid
- Длинные формулировки `diag*` как на макете
- Слияние `home-v2.css` → `CSS/arcade.css`
- ~~Замена production `index.html`~~ — **сделано:** корневой `index.html` + `home-v2.css`; старая версия → `index-legacy.html`; `/v2/index_new.html` → редирект на `/`
- Общий `JS/rounds.js` с `tour.html`
- «БЕЛАРУСЬ» → «в БЕЛАРУСИ» на остальных страницах

## Мелочи (не блокер)

- Dropdown операторов — проверить z-index / `.open` на prod
- Theme switcher на очень узком mobile
- Countdown `diff <= 0` — текст «ФИНАЛ»
- `pixBar` при `goal=0` (ЦСМС)
- Nav: смешение `/tour.html` и `https://evrace.by/...` на локальном preview
- Hero meta эмодзи vs SVG — единый стиль или оставить
- Mobile «О СЕЗОНЕ» — упростить дубль meta (опционально)

---

## Добавить от автора

- 
- 
- 
