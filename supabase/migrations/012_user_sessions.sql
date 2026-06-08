-- Migration 012: user_sessions (Phase 3.1 — session model C-2)
-- Opaque server-side tokens; client stores raw token in sessionStorage only.

CREATE TABLE user_sessions (
  id bigserial PRIMARY KEY,
  token_hash text UNIQUE NOT NULL,
  user_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_sessions_user_hash ON user_sessions (user_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions (expires_at);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
-- service_role only via Edge Functions
