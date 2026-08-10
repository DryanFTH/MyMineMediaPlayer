use tauri_specta::collect_commands;

use crate::{
    internal_scraper::otakudesu::Season, model::anime::SortingMethod, providers::Platform,
};

use strum::IntoEnumIterator;

pub mod anime;
pub mod dashboard;
pub mod download;
pub mod seasonal;
pub mod settings;
pub mod video;

#[tauri::command]
#[specta::specta]
pub fn get_seasons() -> Vec<Season> {
    Season::iter().collect()
}

#[tauri::command]
#[specta::specta]
pub fn get_sorting_methods() -> Vec<SortingMethod> {
    SortingMethod::iter().collect()
}

#[tauri::command]
#[specta::specta]
pub fn get_platforms() -> Vec<Platform> {
    Platform::iter().collect()
}

pub fn get_handlers() -> tauri_specta::Commands<tauri::Wry> {
    collect_commands![
        // anime
        anime::get_anime_information,
        anime::save_anime_information,
        anime::search_anime,
        // Genre
        anime::get_genre_list,
        anime::get_genre_list_library,
        anime::get_animes_by_genre,
        anime::get_animes_by_genre_library,
        // Library
        anime::get_library_anime_information,
        anime::library_remove_anime,
        anime::library_remove_episode,
        anime::get_paginate_animes_library,
        // Seasonal
        seasonal::add_seasonal_anime_by_day,
        seasonal::clear_seasonal_anime,
        seasonal::remove_seasonal_anime_by_day,
        seasonal::get_seasonal_anime,
        seasonal::get_season_animes,
        seasonal::get_ongoing_anime,
        // Download
        download::download_episode,
        download::download_episodes,
        download::download_latest_episode,
        download::download_latest_episodes,
        // Status
        download::check_init_status,
        download::cancel_download,
        // Archive
        download::get_videos_in_archive,
        download::extract_videos_from_archive,
        // Streaming
        video::get_episode_streaming,
        video::get_mirror_link,
        // Video
        video::get_video_path,
        // Settings
        settings::get_settings,
        settings::save_settings,
        settings::pick_folder,
        settings::set_anime_download_directory,
        settings::set_youtube_download_directory,
        // Dashboard
        dashboard::get_dashboard_data,
        // Enums
        get_seasons,
        get_sorting_methods,
        get_platforms,
    ]
}
