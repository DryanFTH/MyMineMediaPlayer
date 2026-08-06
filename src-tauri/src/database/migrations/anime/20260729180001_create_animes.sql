CREATE TABLE IF NOT EXISTS animes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    judul          TEXT NOT NULL,
    image_file     TEXT NOT NULL,
    folder_name    TEXT NOT NULL UNIQUE,
    japanese       TEXT,
    produser       TEXT,
    tanggal_rilis  DATE,
    studio         TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS genres (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS anime_genres (
    anime_id  INTEGER NOT NULL,
    genre_id  INTEGER NOT NULL,
    PRIMARY KEY (anime_id, genre_id),
    FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);

-- Pencarian judul anime
CREATE INDEX IF NOT EXISTS idx_animes_judul ON animes(judul);

-- "cari anime berdasarkan folder_name" (misal saat sync/scan folder)
CREATE INDEX IF NOT EXISTS idx_animes_folder_name ON animes(folder_name);

-- Filter/sort berdasarkan tanggal rilis
CREATE INDEX IF NOT EXISTS idx_animes_tanggal_rilis ON animes(tanggal_rilis);

-- Filter berdasarkan studio
CREATE INDEX IF NOT EXISTS idx_animes_studio ON animes(studio);

-- Genre name sudah UNIQUE (otomatis dapat index dari SQLite),
-- tapi eksplisit dibuat agar jelas & konsisten
CREATE UNIQUE INDEX IF NOT EXISTS idx_genres_name ON genres(name);

-- Index untuk pivot table: mempercepat query
-- "cari semua genre dari 1 anime" dan
-- "cari semua anime dari 1 genre"
CREATE INDEX IF NOT EXISTS idx_anime_genres_anime_id ON anime_genres(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_genres_genre_id ON anime_genres(genre_id);