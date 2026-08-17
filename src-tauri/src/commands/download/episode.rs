use tauri::{AppHandle, State};

use crate::{
    AppState,
    download::state::DownloadState,
    internal_scraper::otakudesu::EpisodeInformation,
    providers::{Platform, Resolution},
    services::anime_services::download_episode as download_episode_service,
    services::anime_services::download_episodes as download_episodes_service,
    services::anime_services::download_latest_episode as download_latest_episode_service,
    services::anime_services::download_latest_episodes as download_latest_episodes_service,
};

#[tauri::command]
#[specta::specta]
pub async fn download_episode(
    app: AppHandle,
    state: State<'_, DownloadState>,
    app_state: State<'_, AppState>,
    anime_folder: &str,
    episode: EpisodeInformation,
    resolution: Resolution,
    platform: Platform,
) -> Result<String, String> {
    let db = app_state.database.read().await;
    let pool = db
        .as_ref()
        .ok_or("Database belum diinisialisasi, set folder anime dulu".to_string())?;

    download_episode_service(
        &app,
        &state,
        pool,
        anime_folder,
        episode,
        resolution,
        platform,
    )
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn download_episodes(
    app: AppHandle,
    state: State<'_, DownloadState>,
    app_state: State<'_, AppState>,
    anime_folder: &str,
    episodes: Vec<EpisodeInformation>,
    resolution: Resolution,
    platform: Platform,
) -> Result<(), String> {
    let db = app_state.database.read().await;
    let pool = db
        .as_ref()
        .ok_or("Database belum diinisialisasi, set folder anime dulu".to_string())?;

    download_episodes_service(
        &app,
        &state,
        pool,
        anime_folder,
        episodes,
        resolution,
        platform,
    )
    .await
}

#[tauri::command]
#[specta::specta]
pub async fn download_latest_episode(
    app: AppHandle,
    state: State<'_, DownloadState>,
    app_state: State<'_, AppState>,
    anime: String,
    resolution: Resolution,
    platform: Platform,
) -> Result<String, String> {
    let db = app_state.database.read().await;
    let pool = db
        .as_ref()
        .ok_or("Database belum diinisialisasi, set folder anime dulu".to_string())?;

    download_latest_episode_service(&app, &state, pool, anime, &resolution, &platform).await
}

#[tauri::command]
#[specta::specta]
pub async fn download_latest_episodes(
    app: AppHandle,
    state: State<'_, DownloadState>,
    app_state: State<'_, AppState>,
    animes: Vec<String>,
    resolution: Resolution,
    platform: Platform,
) -> Result<(), String> {
    let db = app_state.database.read().await;
    let pool = db
        .as_ref()
        .ok_or("Database belum diinisialisasi, set folder anime dulu".to_string())?;

    download_latest_episodes_service(&app, &state, pool, animes, resolution, platform).await
}
