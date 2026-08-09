use tauri::{AppHandle, State};

use crate::{
    AppState,
    model::anime::{Anime, AnimePaginate, SortingMethod},
    providers::Resolution,
    services::anime_services::{
        LibraryAnimeInformation, get_library_anime_info, remove_anime, remove_episode,
    },
};

#[tauri::command]
#[specta::specta]
pub async fn get_library_anime_information(
    app: AppHandle,
    state: State<'_, AppState>,
    folder_name: String,
) -> Result<LibraryAnimeInformation, String> {
    get_library_anime_info(&app, &state, folder_name).await
}

#[tauri::command]
#[specta::specta]
pub async fn library_remove_anime(
    app: AppHandle,
    state: State<'_, AppState>,
    folder_name: String,
) -> Result<(), String> {
    remove_anime(&app, &state, folder_name).await
}

#[tauri::command]
#[specta::specta]
pub async fn library_remove_episode(
    app: AppHandle,
    state: State<'_, AppState>,
    folder_name: String,
    episode_name: String,
    resolution: Resolution,
) -> Result<(), String> {
    remove_episode(&app, &state, folder_name, episode_name, resolution).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_paginate_animes_library(
    app: AppHandle,
    state: State<'_, AppState>,
    page: u32,
    per_page: u32,
    sort: SortingMethod,
) -> Result<AnimePaginate, String> {
    Anime::paginate(
        &app,
        &state.database,
        page,
        per_page,
        sort,
        Some("id, judul, image_file, tanggal_rilis, studio, folder_name"),
    )
    .await
    .map_err(|e| e.to_string())
}
