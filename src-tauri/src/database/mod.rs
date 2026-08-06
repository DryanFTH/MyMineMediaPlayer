use std::path::Path;

use sqlx::{Sqlite, SqlitePool, migrate::MigrateDatabase, sqlite::SqlitePoolOptions};

pub async fn initialize_anime_database(anime_directory: String) -> SqlitePool {
    let database_path = Path::new(&anime_directory).join("anime_database.db");
    let database_url = format!("sqlite://{}", database_path.display());

    if !Sqlite::database_exists(&database_url)
        .await
        .unwrap_or(false)
    {
        Sqlite::create_database(&database_url)
            .await
            .expect("Failed to create database");
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to the database");

    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await
        .expect("Failed to set PRAGMA foreign_keys");

    sqlx::migrate!("./src/database/migrations/anime")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    pool
}
