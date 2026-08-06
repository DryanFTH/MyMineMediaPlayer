ALTER TABLE animes ADD COLUMN folder_changed_at TEXT;

UPDATE animes
SET folder_changed_at = updated_at
WHERE folder_changed_at IS NULL;