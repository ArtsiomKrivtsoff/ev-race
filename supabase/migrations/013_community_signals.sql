-- Migration 013: Community Signals v1 (standalone from reviews)
-- Cumulative counts; one submission per voter_key per location

CREATE TABLE community_signals (
  id smallserial PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  label_ru text NOT NULL,
  sentiment text NOT NULL CHECK (sentiment IN ('positive', 'negative', 'warning')),
  sort_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO community_signals (slug, label_ru, sentiment, sort_order) VALUES
  ('power_match', 'Мощность соответствовала', 'positive', 1),
  ('access_good', 'Удобный подъезд и парковка', 'positive', 2),
  ('lighting_good', 'Хорошее освещение', 'positive', 3),
  ('shelter', 'Есть навес или укрытие', 'positive', 4),
  ('amenities', 'Есть кафе/магазин/туалет рядом', 'positive', 5),
  ('power_disappointed', 'Мощность разочаровала', 'negative', 6),
  ('charge_failed', 'Не удалось зарядиться', 'negative', 7),
  ('ice_at_charger', 'ДВС у зарядки', 'negative', 8),
  ('access_bad', 'Неудобный подъезд и парковка', 'negative', 9),
  ('queue', 'Очередь', 'warning', 10);

CREATE TABLE community_signal_submissions (
  id bigserial PRIMARY KEY,
  location_id bigint NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  voter_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_signal_submissions_loc_voter_unique
    UNIQUE (location_id, voter_key)
);

CREATE INDEX idx_community_signal_submissions_location
  ON community_signal_submissions (location_id, created_at DESC);

CREATE TABLE community_signal_submission_items (
  submission_id bigint NOT NULL
    REFERENCES community_signal_submissions(id) ON DELETE CASCADE,
  signal_id smallint NOT NULL REFERENCES community_signals(id),
  PRIMARY KEY (submission_id, signal_id)
);

CREATE TABLE location_signal_counts (
  location_id bigint NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  signal_id smallint NOT NULL REFERENCES community_signals(id),
  count int NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (location_id, signal_id)
);

ALTER TABLE community_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_signal_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_signal_submission_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_signal_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY community_signals_public_read ON community_signals
  FOR SELECT USING (is_active = true);

CREATE POLICY location_signal_counts_public_read ON location_signal_counts
  FOR SELECT USING (true);
