export const EV_RACE_THEMES = [
  'расстояние',
  'имя',
  'время',
  'тишина',
  'ожидание',
  'возвращение',
  'привычка',
] as const;

export type EvRaceTheme = (typeof EV_RACE_THEMES)[number];

function botToken(): string {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  return token;
}

export function editorChatId(): string | null {
  const id = Deno.env.get('TELEGRAM_EDITOR_CHAT_ID');
  return id?.trim() || null;
}

async function telegramApi(method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<boolean> {
  const res = await fetch(`https://api.telegram.org/bot${botToken()}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text?.slice(0, 200),
      show_alert: Boolean(text && text.length > 60),
    }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.warn(`answerCallbackQuery skipped: ${JSON.stringify(data)}`);
    return false;
  }
  return true;
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: { inline_keyboard: unknown[][] },
): Promise<void> {
  await telegramApi('sendMessage', {
    chat_id: chatId,
    text: text.slice(0, 4096),
    reply_markup: replyMarkup,
  });
}

export interface WeeklyLetterTelegramPayload {
  roundNumber: number;
  patternSlug: string;
  patternConfidence: number;
  observation: string;
  theme: string;
  v1: string;
  v2: string;
  v3: string;
  winner: { operator: string; stations: number } | null;
}

function buildLetterMessage(p: WeeklyLetterTelegramPayload): string {
  const winnerLine = p.winner
    ? `\nПобедитель: ${p.winner.operator.toUpperCase()} · ${p.winner.stations} ст.`
    : '';

  return `━━━━━━━━━━━━━━━━━
EV RACE · КРУГ ${p.roundNumber}
━━━━━━━━━━━━━━━━━
Паттерн: ${p.patternSlug.toUpperCase()}
Уверенность: ${Math.round(p.patternConfidence * 100)}%${winnerLine}

Наблюдение:
${p.observation}

Тема: ${p.theme.toUpperCase()}
━━━━━━━━━━━━━━━━━
Вариант 1:
${p.v1}

Вариант 2:
${p.v2}

Вариант 3:
${p.v3}
━━━━━━━━━━━━━━━━━`;
}

export function letterApprovalKeyboard(roundNumber: number) {
  return {
    inline_keyboard: [
      [
        { text: '1', callback_data: `select:${roundNumber}:1` },
        { text: '2', callback_data: `select:${roundNumber}:2` },
        { text: '3', callback_data: `select:${roundNumber}:3` },
      ],
      [
        { text: '↻ Ещё', callback_data: `regenerate:${roundNumber}` },
        { text: '✏️ Тему', callback_data: `theme_menu:${roundNumber}` },
        { text: '📝 Заметка', callback_data: `note:${roundNumber}` },
      ],
    ],
  };
}

export function themePickerKeyboard(roundNumber: number) {
  return {
    inline_keyboard: [
      EV_RACE_THEMES.slice(0, 4).map((t) => ({
        text: t,
        callback_data: `theme:${roundNumber}:${t}`,
      })),
      EV_RACE_THEMES.slice(4).map((t) => ({
        text: t,
        callback_data: `theme:${roundNumber}:${t}`,
      })),
    ],
  };
}

/** Returns false if TELEGRAM_EDITOR_CHAT_ID is missing (generate still succeeds). */
export async function sendWeeklyLetterToEditor(
  payload: WeeklyLetterTelegramPayload,
): Promise<boolean> {
  const chatId = editorChatId();
  if (!chatId) return false;

  await sendMessage(chatId, buildLetterMessage(payload), letterApprovalKeyboard(payload.roundNumber));
  return true;
}

export async function sendThemeMenuToEditor(roundNumber: number): Promise<void> {
  const chatId = editorChatId();
  if (!chatId) throw new Error('TELEGRAM_EDITOR_CHAT_ID is not set');

  await sendMessage(
    chatId,
    `Выберите тему для круга ${roundNumber}:`,
    themePickerKeyboard(roundNumber),
  );
}
