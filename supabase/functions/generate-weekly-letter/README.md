# Weekly Letter Engine — Stage 2 (Telegram)

Цепочка: `generate-weekly-letter` → Telegram → редактор → `approve-weekly-letter` → publication.

## Deploy

```bash
supabase functions deploy generate-weekly-letter --no-verify-jwt
supabase functions deploy approve-weekly-letter --no-verify-jwt
supabase functions deploy backfill-round-winners --no-verify-jwt
```

## Secrets (Supabase Dashboard → Edge Functions → Secrets)

| Secret | Назначение |
|--------|------------|
| `OPENAI_API_KEY` | GPT для observation + letters |
| `OPENAI_MODEL` | `gpt-5.5` |
| `WEEKLY_LETTER_SECRET` | Auth для generate / backfill (header `x-cron-secret`) |
| `SNAPSHOT_CRON_SECRET` | Альтернатива: тот же header, если GitHub cron использует snapshot secret |
| `TELEGRAM_BOT_TOKEN` | Bot API |
| `TELEGRAM_EDITOR_CHAT_ID` | Личный chat_id редактора (получить через `/start` в боте или @userinfobot) |

`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` подставляются автоматически в Edge runtime.

## Telegram webhook

После деплоя `approve-weekly-letter`:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://uvrboxrddqlasgrnnnne.supabase.co/functions/v1/approve-weekly-letter"}'
```

Проверка:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## Backfill winners (без GPT, без писем)

```bash
curl -X POST "https://uvrboxrddqlasgrnnnne.supabase.co/functions/v1/backfill-round-winners" \
  -H "x-cron-secret: $WEEKLY_LETTER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Опционально: `{"through_round": 22}` — до указанного круга (по умолчанию `getCompletedRound()`).

## Ручной тест полного цикла

1. **Secrets:** задать `TELEGRAM_BOT_TOKEN`, `TELEGRAM_EDITOR_CHAT_ID`, `WEEKLY_LETTER_SECRET`, OpenAI.
2. **Webhook:** `setWebhook` на URL выше.
3. **Бот:** написать `/start` — бот ответит chat_id (если `TELEGRAM_EDITOR_CHAT_ID` ещё пуст).
4. **Winners:** запустить `backfill-round-winners` (шаг выше).
5. **Generate:** для нового круга без строки в `weekly_letters`:

```bash
curl -X POST "https://uvrboxrddqlasgrnnnne.supabase.co/functions/v1/generate-weekly-letter" \
  -H "x-cron-secret: $WEEKLY_LETTER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"round_number": 6}'
```

Ответ: `telegram_sent: true` — письмо ушло в Telegram с кнопками 1/2/3, ↻, ✏️, 📝.

6. **Approve:** в Telegram нажать `1`, `2` или `3` → в БД `selected_variant`, `is_published=true`, `published_at`.
7. **Regenerate / theme:** ↻ или ✏️ → новые варианты в Telegram; публикация сбрасывается до нового выбора.
8. **Note:** `/note 6 текст заметки` → `editor_notes` в `weekly_letters`.

Для повторного generate того же круга — удалить строку в `weekly_letters` (тест) или использовать другой `round_number`.

## Functions

| Function | Role |
|----------|------|
| `generate-weekly-letter` | Pattern → observation → theme → 3 variants → winner → Telegram |
| `approve-weekly-letter` | Telegram webhook: select / regenerate / theme / note |
| `backfill-round-winners` | Детерминированные победители для всех завершённых кругов |
| `backfill-weekly-letters` | Полный backfill писем (не запускать до prod-цикла) |

## Shared modules

| File | Role |
|------|------|
| `_shared/weekly-letter-telegram.ts` | Send message, keyboards, theme picker |
| `_shared/upsert-round-winner.ts` | Winner из stations |
| `generate-weekly-letter/process-round.ts` | Orchestrator |
