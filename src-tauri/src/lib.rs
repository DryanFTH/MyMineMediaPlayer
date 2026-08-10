mod commands;
mod database;
mod download;
mod extractor;
mod internal_scraper;
mod model;
mod protocols;
mod providers;
mod services;
mod store;
mod utils;

use std::{collections::HashMap, path::PathBuf, sync::Mutex};

use specta_typescript::Typescript;
use sqlx::SqlitePool;
use tauri::Manager;
use tauri_specta::{Builder, collect_events};

use crate::{
    commands::get_handlers,
    database::initialize_anime_database,
    download::{
        event::{
            DownloadAnimeError, DownloadAnimeInfo, DownloadCancelled, DownloadDone, DownloadError,
            DownloadInfo, DownloadProgress,
        },
        state::DownloadState,
    },
    internal_scraper::otakudesu::DEFAULT_BASE_URL,
    protocols::stream::{StreamRoots, spawn},
    store::settings::{
        get_anime_download_directory, get_settings_store, has_anime_download_directory,
        has_otakudesu_url, has_seasonal_anime, initialize_seasonal_anime, set_otakudesu_url,
    },
};

pub struct AppState {
    pub database: SqlitePool,
    pub stream_port: u16,
    pub stream_roots: StreamRoots,
    pub batch_file_path: Mutex<Option<PathBuf>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = Builder::new()
        .commands(get_handlers())
        .events(collect_events![
            DownloadInfo,
            DownloadAnimeInfo,
            DownloadProgress,
            DownloadDone,
            DownloadError,
            DownloadAnimeError,
            DownloadCancelled
        ])
        .dangerously_cast_bigints_to_number();

    #[cfg(debug_assertions)]
    builder
        .export(Typescript::default(), "../src/types/bindings.ts")
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .manage(DownloadState::new())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle();

            let settings = get_settings_store(&handle)?;

            if has_anime_download_directory(&settings) {
                let anime_directory =
                    get_anime_download_directory(&settings).ok_or(std::io::Error::new(
                        std::io::ErrorKind::NotFound,
                        "Can't get anime download directory",
                    ))?;

                app.asset_protocol_scope()
                    .allow_directory(&anime_directory, true)?;
            }

            if !has_seasonal_anime(&settings) {
                initialize_seasonal_anime(&settings)?;
            }

            if !has_otakudesu_url(&settings) {
                set_otakudesu_url(&settings, DEFAULT_BASE_URL);
            }

            let mut initial_roots: HashMap<String, PathBuf> = HashMap::new();

            if has_anime_download_directory(&settings) {
                let anime_directory = get_anime_download_directory(&settings)
                    .ok_or("Failed to get anime directory".to_owned())?;
                initial_roots.insert(
                    "anime".to_string(),
                    std::path::PathBuf::from(&anime_directory),
                );

                tauri::async_runtime::block_on(async move {
                    let pool = initialize_anime_database(anime_directory).await;
                    let (stream_port, stream_roots) = spawn(initial_roots).await;

                    app.manage(AppState {
                        database: pool,
                        stream_port,
                        stream_roots,
                        batch_file_path: Mutex::new(None),
                    });
                })
            }

            Ok(())
        })
        .invoke_handler(builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
