export const MAX_FILES_PER_SUBMISSION = 4;
/** Reserved for a future Telegram-linked tier — not wired in UX v1.1. */
export const MAX_FILES_TELEGRAM_LINKED = 10;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_PENDING_PER_FINGERPRINT = 5;
export const COOLDOWN_SECONDS = 15 * 60;
export const INCOMING_BUCKET = Deno.env.get("PHOTOS_INCOMING_BUCKET") || "photos-incoming";

export const DUPLICATE_MESSAGE =
  "Похоже, такое фото этой локации уже есть в EVrace. Попробуйте выбрать другой ракурс или более актуальный снимок.";

export const ACTIVE_DEDUPE_STATUSES = [
  "uploaded",
  "processing",
  "pending_moderation",
  "approved",
] as const;

export const PENDING_ANTISPAM_STATUSES = ["uploaded", "processing"] as const;
