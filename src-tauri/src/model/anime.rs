use std::{collections::HashMap, path::PathBuf};

use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::{AssertSqlSafe, FromRow, QueryBuilder, Sqlite, SqlitePool};
use strum::{EnumIter, IntoEnumIterator};
use tauri::AppHandle;

use crate::{
    model::genre::Genre,
    store::settings::{get_anime_download_directory, get_settings_store},
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AnimeColumn {
    Judul,
    Japanese,
    Produser,
    TanggalRilis,
    Studio,
    ImageFile,
    FolderName,
}

impl AnimeColumn {
    fn as_str(&self) -> &'static str {
        match self {
            AnimeColumn::Judul => "judul",
            AnimeColumn::Japanese => "japanese",
            AnimeColumn::Produser => "produser",
            AnimeColumn::TanggalRilis => "tanggal_rilis",
            AnimeColumn::Studio => "studio",
            AnimeColumn::ImageFile => "image_file",
            AnimeColumn::FolderName => "folder_name",
        }
    }
}

#[derive(Debug, Default, Deserialize, Type)]
pub struct AnimePatch {
    pub judul: Option<String>,
    pub japanese: Option<String>,
    pub produser: Option<String>,
    pub tanggal_rilis: Option<String>,
    pub studio: Option<String>,
    pub image_file: Option<String>,
    pub folder_name: Option<String>,
    pub genre_ids: Option<Vec<i64>>,
}

#[derive(Debug, FromRow)]
struct AnimeRow {
    id: i64,
    judul: String,
    image_file: String,

    #[sqlx(default)]
    japanese: Option<String>,
    #[sqlx(default)]
    produser: Option<String>,
    #[sqlx(default)]
    tanggal_rilis: Option<String>,
    #[sqlx(default)]
    studio: Option<String>,
    #[sqlx(default)]
    folder_name: Option<String>,
}

#[derive(Clone, Debug, Serialize, FromRow, Type)]
pub struct DashboardStats {
    pub total_anime: i64,
    pub total_genre: i64,
}

#[derive(Clone, Debug, Serialize, FromRow, Type)]
pub struct GenreCount {
    pub name: String,
    pub total: i64,
}

#[derive(Debug, Serialize, Type)]
pub struct AnimePaginate {
    animes: Vec<Anime>,
    current_page: u32,
    last_page: u32,
    total: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize, Type)]
pub struct Anime {
    pub id: i64,
    pub judul: String,
    pub japanese: Option<String>,
    pub produser: Option<String>,
    pub tanggal_rilis: Option<String>,
    pub studio: Option<String>,
    pub image_file: String,
    pub folder_name: Option<String>,
    pub genres: Vec<Genre>,
}

#[derive(Debug, Deserialize)]
pub struct AnimeInput {
    pub judul: String,
    pub japanese: String,
    pub produser: String,
    pub tanggal_rilis: String,
    pub studio: String,
    pub image_file: String,
    pub folder_name: String,
    pub genre_ids: Vec<i64>, // id genre yang dipilih dari frontend
}

#[derive(FromRow)]
struct GenreRow {
    anime_id: i64,
    id: i64,
    name: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GenreMatch {
    Any,
    All,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Type, EnumIter)]
#[serde(rename_all = "snake_case")]
pub enum SortingMethod {
    ReleaseDateDesc,
    ReleaseDateAsc,
    TitleAsc,
    TitleDesc,
    RecentlyAdded,
    OldestAdded,
    RecentlyModified,
    OldestModified,
}

impl SortingMethod {
    fn as_sql(&self) -> &'static str {
        match self {
            SortingMethod::ReleaseDateDesc => "tanggal_rilis DESC",
            SortingMethod::ReleaseDateAsc => "tanggal_rilis ASC",
            SortingMethod::TitleAsc => "judul COLLATE NOCASE ASC",
            SortingMethod::TitleDesc => "judul COLLATE NOCASE DESC",
            SortingMethod::RecentlyAdded => "id DESC",
            SortingMethod::OldestAdded => "id ASC",
            SortingMethod::RecentlyModified => "folder_changed_at DESC",
            SortingMethod::OldestModified => "folder_changed_at ASC",
        }
    }
}

const COLUMNS: &str =
    "id, judul, japanese, produser, tanggal_rilis, studio, image_file, folder_name";
const COLUMNS_ALIASED: &str =
    "a.id, a.judul, a.japanese, a.produser, a.tanggal_rilis, a.studio, a.image_file, a.folder_name";

impl Anime {
    async fn hydrate(
        app: &AppHandle,
        pool: &SqlitePool,
        row: AnimeRow,
    ) -> Result<Anime, sqlx::Error> {
        let store = get_settings_store(&app).map_err(|e| sqlx::Error::Protocol(e.to_string()))?;
        let anime_directory = get_anime_download_directory(&store).ok_or(sqlx::Error::Protocol(
            "Anime download directory did not initialize yet".to_string(),
        ))?;

        let genres = Genre::for_anime(pool, row.id).await?;
        let folder_name = row.folder_name.unwrap_or_default();
        let image_file = PathBuf::from(&anime_directory)
            .join(&folder_name)
            .join(row.image_file)
            .to_string_lossy()
            .into_owned();

        Ok(Anime {
            id: row.id,
            judul: row.judul,
            japanese: row.japanese,
            produser: row.produser,
            tanggal_rilis: row.tanggal_rilis,
            studio: row.studio,
            image_file,
            folder_name: Some(folder_name),
            genres,
        })
    }

    async fn load_genres_for(
        pool: &SqlitePool,
        anime_ids: &[i64],
    ) -> Result<HashMap<i64, Vec<Genre>>, sqlx::Error> {
        if anime_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let placeholders = anime_ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
        let query = AssertSqlSafe(format!(
            "SELECT ag.anime_id, g.id, g.name \
            FROM anime_genres ag \
            INNER JOIN genres g ON g.id = ag.genre_id \
            WHERE ag.anime_id IN ({})",
            placeholders
        ));

        let mut q = sqlx::query_as::<_, GenreRow>(query);
        for id in anime_ids {
            q = q.bind(id);
        }
        let genre_rows = q.fetch_all(pool).await?;

        let mut map: HashMap<i64, Vec<Genre>> = HashMap::new();
        for gr in genre_rows {
            map.entry(gr.anime_id).or_default().push(Genre {
                id: gr.id,
                name: gr.name,
            });
        }

        Ok(map)
    }

    async fn hydrate_many(
        app: &AppHandle,
        pool: &SqlitePool,
        rows: Vec<AnimeRow>,
    ) -> Result<Vec<Anime>, sqlx::Error> {
        let store = get_settings_store(&app).map_err(|e| sqlx::Error::Protocol(e.to_string()))?;
        let anime_directory = get_anime_download_directory(&store).ok_or(sqlx::Error::Protocol(
            "Anime download directory did not initialize yet".to_string(),
        ))?;

        let anime_ids: Vec<i64> = rows.iter().map(|r| r.id).collect();
        let mut genres_by_anime = Self::load_genres_for(pool, &anime_ids).await?;

        Ok(rows
            .into_iter()
            .map(|row| {
                let folder_name = row.folder_name.unwrap_or_default();
                let image_file = PathBuf::from(&anime_directory)
                    .join(&folder_name)
                    .join(row.image_file)
                    .to_string_lossy()
                    .into_owned();

                Anime {
                    genres: genres_by_anime.remove(&row.id).unwrap_or_default(),
                    id: row.id,
                    judul: row.judul,
                    japanese: row.japanese,
                    produser: row.produser,
                    tanggal_rilis: row.tanggal_rilis,
                    studio: row.studio,
                    image_file,
                    folder_name: Some(folder_name),
                }
            })
            .collect())
    }

    pub async fn all(app: &AppHandle, pool: &SqlitePool) -> Result<Vec<Anime>, sqlx::Error> {
        let rows =
            sqlx::query_as::<_, AnimeRow>(AssertSqlSafe(format!("SELECT {COLUMNS} FROM animes")))
                .fetch_all(pool)
                .await?;

        Self::hydrate_many(app, pool, rows).await
    }

    pub async fn random_pick(
        app: &AppHandle,
        pool: &SqlitePool,
        limit: i64,
    ) -> Result<Vec<Anime>, sqlx::Error> {
        let rows = sqlx::query_as::<_, AnimeRow>(AssertSqlSafe(format!(
            "SELECT {COLUMNS} FROM animes ORDER BY RANDOM() LIMIT ?"
        )))
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Self::hydrate_many(app, pool, rows).await
    }

    pub async fn recently_change(
        app: &AppHandle,
        pool: &SqlitePool,
        limit: i64,
    ) -> Result<Vec<Anime>, sqlx::Error> {
        let rows = sqlx::query_as::<_, AnimeRow>(AssertSqlSafe(format!(
            "SELECT {COLUMNS} FROM animes ORDER BY folder_changed_at DESC LIMIT ?"
        )))
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Self::hydrate_many(app, pool, rows).await
    }

    pub async fn get_stats(pool: &SqlitePool) -> Result<DashboardStats, sqlx::Error> {
        sqlx::query_as::<_, DashboardStats>(
            "SELECT
            (SELECT COUNT(*) FROM animes) as total_anime,
            (SELECT COUNT(*) FROM genres) as total_genre",
        )
        .fetch_one(pool)
        .await
    }

    pub async fn genre_distribution(pool: &SqlitePool) -> Result<Vec<GenreCount>, sqlx::Error> {
        sqlx::query_as::<_, GenreCount>(
            "SELECT g.name, COUNT(ag.anime_id) as total
         FROM genres g
         LEFT JOIN anime_genres ag ON ag.genre_id = g.id
         GROUP BY g.id
         ORDER BY total DESC",
        )
        .fetch_all(pool)
        .await
    }

    pub async fn paginate(
        app: &AppHandle,
        pool: &SqlitePool,
        page: u32,
        per_page: u32,
        sort: SortingMethod,
        columns_needed: Option<&str>,
    ) -> Result<AnimePaginate, sqlx::Error> {
        let page = page.max(1);
        let per_page = per_page.max(1);
        let offset = (page - 1) * per_page;

        let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM animes")
            .fetch_one(pool)
            .await?;

        let order_by = sort.as_sql();

        let columns = columns_needed.unwrap_or(COLUMNS);

        let rows = sqlx::query_as::<_, AnimeRow>(AssertSqlSafe(format!(
            "SELECT {columns} FROM animes ORDER BY {order_by} LIMIT ? OFFSET ?"
        )))
        .bind(per_page)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        let animes = Self::hydrate_many(app, pool, rows).await?;

        let last_page = if total == 0 {
            1
        } else {
            ((total as f64) / (per_page as f64)).ceil() as u32
        };

        Ok(AnimePaginate {
            animes,
            current_page: page,
            last_page,
            total: total as u32,
        })
    }

    pub async fn find(
        app: &AppHandle,
        pool: &SqlitePool,
        id: i64,
    ) -> Result<Option<Anime>, sqlx::Error> {
        let row = sqlx::query_as::<_, AnimeRow>(AssertSqlSafe(format!(
            "SELECT {COLUMNS} FROM animes WHERE id = ?"
        )))
        .bind(id)
        .fetch_optional(pool)
        .await?;

        match row {
            Some(r) => Ok(Some(Self::hydrate(app, pool, r).await?)),
            None => Ok(None),
        }
    }

    pub async fn search(
        app: &AppHandle,
        pool: &SqlitePool,
        keyword: &str,
    ) -> Result<Vec<Anime>, sqlx::Error> {
        let pattern = format!("%{keyword}%");

        let rows = sqlx::query_as::<_, AnimeRow>(AssertSqlSafe(format!(
            "SELECT {COLUMNS} FROM animes WHERE judul LIKE ? ORDER BY tanggal_rilis DESC"
        )))
        .bind(pattern)
        .fetch_all(pool)
        .await?;

        Self::hydrate_many(app, pool, rows).await
    }

    pub async fn find_by_folder_name(
        app: &AppHandle,
        pool: &SqlitePool,
        folder_name: &str,
    ) -> Result<Option<Anime>, sqlx::Error> {
        let row = sqlx::query_as::<_, AnimeRow>(AssertSqlSafe(format!(
            "SELECT {COLUMNS} FROM animes WHERE folder_name = ?"
        )))
        .bind(folder_name)
        .fetch_optional(pool)
        .await?;

        match row {
            Some(r) => Ok(Some(Self::hydrate(app, pool, r).await?)),
            None => Ok(None),
        }
    }

    pub async fn exists_by_folder_name(
        pool: &SqlitePool,
        folder_name: &str,
    ) -> Result<bool, sqlx::Error> {
        let exists: bool =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM animes WHERE folder_name = ?)")
                .bind(folder_name)
                .fetch_one(pool)
                .await?;

        Ok(exists)
    }

    pub async fn by_genre(
        app: &AppHandle,
        pool: &SqlitePool,
        genre_id: i64,
        page: u32,
        per_page: u32,
        sort: SortingMethod,
        columns_needed: Option<&str>,
    ) -> Result<AnimePaginate, sqlx::Error> {
        Self::by_genres(
            app,
            pool,
            &[genre_id],
            GenreMatch::Any,
            page,
            per_page,
            sort,
            columns_needed,
        )
        .await
    }

    pub async fn by_genres(
        app: &AppHandle,
        pool: &SqlitePool,
        genre_ids: &[i64],
        match_mode: GenreMatch,
        page: u32,
        per_page: u32,
        sort: SortingMethod,
        columns_needed: Option<&str>,
    ) -> Result<AnimePaginate, sqlx::Error> {
        let page = page.max(1);
        let per_page = per_page.max(1);
        let offset = (page - 1) * per_page;

        if genre_ids.is_empty() {
            return Ok(AnimePaginate {
                animes: vec![],
                current_page: page,
                last_page: 1,
                total: 0,
            });
        }

        // Hitung total (untuk last_page)
        let total: i64 = if matches!(match_mode, GenreMatch::All) {
            let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new(
                "SELECT COUNT(*) FROM ( \
                    SELECT a.id \
                    FROM animes a \
                    INNER JOIN anime_genres ag ON ag.anime_id = a.id \
                    WHERE ag.genre_id IN (",
            );
            {
                let mut separated = qb.separated(", ");
                for id in genre_ids {
                    separated.push_bind(*id);
                }
            }
            qb.push(") GROUP BY a.id HAVING COUNT(DISTINCT ag.genre_id) = ");
            qb.push_bind(genre_ids.len() as i64);
            qb.push(")");

            qb.build_query_scalar().fetch_one(pool).await?
        } else {
            let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new(
                "SELECT COUNT(DISTINCT a.id) \
                 FROM animes a \
                 INNER JOIN anime_genres ag ON ag.anime_id = a.id \
                 WHERE ag.genre_id IN (",
            );
            {
                let mut separated = qb.separated(", ");
                for id in genre_ids {
                    separated.push_bind(*id);
                }
            }
            qb.push(")");

            qb.build_query_scalar().fetch_one(pool).await?
        };

        // Ambil data (paginated)
        let columns = columns_needed.unwrap_or(COLUMNS_ALIASED);

        let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new(format!(
            "SELECT DISTINCT {columns} \
             FROM animes a \
             INNER JOIN anime_genres ag ON ag.anime_id = a.id \
             WHERE ag.genre_id IN ("
        ));

        {
            let mut separated = qb.separated(", ");
            for id in genre_ids {
                separated.push_bind(*id);
            }
        }
        qb.push(")");

        if matches!(match_mode, GenreMatch::All) {
            qb.push(" GROUP BY a.id HAVING COUNT(DISTINCT ag.genre_id) = ");
            qb.push_bind(genre_ids.len() as i64);
        }

        qb.push(format!(" ORDER BY {}", sort.as_sql()));
        qb.push(" LIMIT ");
        qb.push_bind(per_page);
        qb.push(" OFFSET ");
        qb.push_bind(offset);

        let rows = qb.build_query_as::<AnimeRow>().fetch_all(pool).await?;
        let animes = Self::hydrate_many(app, pool, rows).await?;

        let last_page = if total == 0 {
            1
        } else {
            ((total as f64) / (per_page as f64)).ceil() as u32
        };

        Ok(AnimePaginate {
            animes,
            current_page: page,
            last_page,
            total: total as u32,
        })
    }

    pub async fn create(pool: &SqlitePool, input: &AnimeInput) -> Result<i64, sqlx::Error> {
        let mut tx = pool.begin().await?;

        let result = sqlx::query(
            r#"
            INSERT INTO animes (judul, japanese, produser, tanggal_rilis, studio, folder_name, image_file, folder_changed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(folder_name) DO NOTHING
            "#,
        )
        .bind(&input.judul)
        .bind(&input.japanese)
        .bind(&input.produser)
        .bind(&input.tanggal_rilis)
        .bind(&input.studio)
        .bind(&input.folder_name)
        .bind(&input.image_file)
        .execute(&mut *tx)
        .await?;

        let anime_id = result.last_insert_rowid();

        for genre_id in &input.genre_ids {
            sqlx::query("INSERT INTO anime_genres (anime_id, genre_id) VALUES (?, ?)")
                .bind(anime_id)
                .bind(genre_id)
                .execute(&mut *tx)
                .await?;
        }

        tx.commit().await?;

        Ok(anime_id)
    }

    pub async fn delete(pool: &SqlitePool, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM animes WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn delete_by_folder_name(
        pool: &SqlitePool,
        folder_name: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM animes WHERE folder_name = ?")
            .bind(folder_name)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn update_column<'q, T>(
        pool: &SqlitePool,
        id: i64,
        column: AnimeColumn,
        value: T,
    ) -> Result<(), sqlx::Error>
    where
        T: sqlx::Encode<'q, Sqlite> + sqlx::Type<Sqlite> + Send + 'q,
    {
        let sql = format!(
            "UPDATE animes SET {} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            column.as_str()
        );

        sqlx::query(AssertSqlSafe(sql))
            .bind(value)
            .bind(id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn update(pool: &SqlitePool, id: i64, patch: &AnimePatch) -> Result<(), sqlx::Error> {
        let mut has_column_changes = false;
        let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE animes SET ");
        let mut separated = qb.separated(", ");

        macro_rules! push_field {
            ($col:literal, $val:expr) => {
                if let Some(v) = $val {
                    separated.push(concat!($col, " = "));
                    separated.push_bind_unseparated(v.clone());
                    has_column_changes = true;
                }
            };
        }

        push_field!("judul", &patch.judul);
        push_field!("japanese", &patch.japanese);
        push_field!("produser", &patch.produser);
        push_field!("tanggal_rilis", &patch.tanggal_rilis);
        push_field!("studio", &patch.studio);
        push_field!("image_file", &patch.image_file);
        push_field!("folder_name", &patch.folder_name);

        if has_column_changes {
            separated.push("updated_at = CURRENT_TIMESTAMP");
            qb.push(" WHERE id = ");
            qb.push_bind(id);
            qb.build().execute(pool).await?;
        }

        if let Some(genre_ids) = &patch.genre_ids {
            let mut tx = pool.begin().await?;

            sqlx::query("DELETE FROM anime_genres WHERE anime_id = ?")
                .bind(id)
                .execute(&mut *tx)
                .await?;

            for genre_id in genre_ids {
                sqlx::query("INSERT INTO anime_genres (anime_id, genre_id) VALUES (?, ?)")
                    .bind(id)
                    .bind(genre_id)
                    .execute(&mut *tx)
                    .await?;
            }

            // genre_ids ganti = anime dianggap berubah juga
            sqlx::query("UPDATE animes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                .bind(id)
                .execute(&mut *tx)
                .await?;

            tx.commit().await?;
        }

        Ok(())
    }

    pub async fn touch_folder_changed_at(
        pool: &SqlitePool,
        folder_name: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE animes SET folder_changed_at = CURRENT_TIMESTAMP WHERE folder_name = ?",
        )
        .bind(folder_name)
        .execute(pool)
        .await?;

        Ok(())
    }
}
