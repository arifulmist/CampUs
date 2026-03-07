-- Add a column to store the SHA-256 hash of uploaded note files for duplicate detection.
-- A unique index ensures no two notes share the same file content.

ALTER TABLE public.notes
  ADD COLUMN file_hash text NULL;

-- Unique index so the DB itself rejects duplicate hashes
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_file_hash
  ON public.notes (file_hash)
  WHERE file_hash IS NOT NULL;
