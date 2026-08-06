use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::{AssertSqlSafe, FromRow, SqlitePool};

#[derive(Debug, Clone, Serialize, Deserialize, Type, FromRow)]
pub struct Genre {
    pub id: i64,
    pub name: String,
}

impl Genre {
    pub async fn all(pool: &SqlitePool) -> Result<Vec<Genre>, sqlx::Error> {
        sqlx::query_as::<_, Genre>("SELECT id, name FROM genres ORDER BY name")
            .fetch_all(pool)
            .await
    }

    /// Cari 1 genre berdasarkan id
    pub async fn find(pool: &SqlitePool, id: i64) -> Result<Option<Genre>, sqlx::Error> {
        sqlx::query_as::<_, Genre>("SELECT id, name FROM genres WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await
    }

    /// Cari 1 genre berdasarkan nama
    pub async fn find_by_name(pool: &SqlitePool, name: &str) -> Result<Option<Genre>, sqlx::Error> {
        sqlx::query_as::<_, Genre>("SELECT id, name FROM genres WHERE name = ?")
            .bind(name)
            .fetch_optional(pool)
            .await
    }

    /// Buat genre baru, return id-nya
    pub async fn create(pool: &SqlitePool, name: &str) -> Result<i64, sqlx::Error> {
        let result =
            sqlx::query("INSERT INTO genres (name) VALUES (?) ON CONFLICT(name) DO NOTHING")
                .bind(name)
                .execute(pool)
                .await?;

        Ok(result.last_insert_rowid())
    }

    pub async fn create_many(
        pool: &SqlitePool,
        names: &[String],
    ) -> Result<Vec<Genre>, sqlx::Error> {
        if names.is_empty() {
            return Ok(Vec::new());
        }

        let mut tx = pool.begin().await?;

        // 1. Cek genre yang sudah ada, sekali select
        let placeholders = names.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
        let select_query = AssertSqlSafe(format!(
            "SELECT id, name FROM genres WHERE name IN ({})",
            placeholders
        ));

        let mut q = sqlx::query_as::<_, Genre>(select_query);
        for name in names {
            q = q.bind(name);
        }
        let existing: Vec<Genre> = q.fetch_all(&mut *tx).await?;

        let existing_names: HashSet<&str> = existing.iter().map(|g| g.name.as_str()).collect();

        // 2. Filter nama yang belum ada (sekalian dedup kalau parameter ada duplikat)
        let mut seen = HashSet::new();
        let missing: Vec<&String> = names
            .iter()
            .filter(|n| !existing_names.contains(n.as_str()) && seen.insert(n.as_str()))
            .collect();

        let mut result = existing;

        if !missing.is_empty() {
            // 3. Insert semua yang missing dalam SATU statement, langsung RETURNING id+name
            let values = missing.iter().map(|_| "(?)").collect::<Vec<_>>().join(", ");
            let insert_query = AssertSqlSafe(format!(
                "INSERT INTO genres (name) VALUES {} RETURNING id, name",
                values
            ));

            let mut q = sqlx::query_as::<_, Genre>(insert_query);
            for name in &missing {
                q = q.bind(name.as_str());
            }
            let inserted: Vec<Genre> = q.fetch_all(&mut *tx).await?;
            result.extend(inserted);
        }

        tx.commit().await?;

        result.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(result)
    }

    /// Hapus genre berdasarkan id
    /// (relasi di anime_genres otomatis ikut terhapus karena ON DELETE CASCADE)
    pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM genres WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    /// Ambil semua genre milik satu anime tertentu.
    /// Dipakai oleh model Anime saat "hydrate" data lengkap.
    pub async fn for_anime(pool: &SqlitePool, anime_id: i64) -> Result<Vec<Genre>, sqlx::Error> {
        sqlx::query_as::<_, Genre>(
            r#"
            SELECT g.id, g.name
            FROM genres g
            INNER JOIN anime_genres ag ON ag.genre_id = g.id
            WHERE ag.anime_id = ?
            ORDER BY g.name
            "#,
        )
        .bind(anime_id)
        .fetch_all(pool)
        .await
    }
}
