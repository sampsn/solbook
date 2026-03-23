ALTER TABLE profiles
  ADD COLUMN theme TEXT NOT NULL DEFAULT 'system'
  CHECK (theme IN ('system', 'dark', 'light'));
