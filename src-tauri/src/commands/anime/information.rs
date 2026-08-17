use chrono::NaiveDate;
use std::path::Path;

use tauri::{AppHandle, State};

use crate::{
    AppState,
    internal_scraper::otakudesu::{
        AnimeInformation, SearchAnime, anime_information_html, scrape_anime_information,
        scrape_search_result, search_anime_html,
    },
    services::anime_services::save_anime_information as save_anime_information_service,
    store::settings::{get_anime_download_directory, get_settings_store},
};

#[tauri::command]
#[specta::specta]
pub async fn get_anime_information(
    app: AppHandle,
    anime: String,
) -> Result<AnimeInformation, String> {
    let anime_information_html = anime_information_html(&app, &anime).await?;

    let store = get_settings_store(&app).map_err(|e| e.to_string())?;
    let anime_directory = get_anime_download_directory(&store)
        .ok_or("Anime download directory did not initialize yet")?;

    let anime_path = Path::new(&anime_directory).join(anime);

    let anime_information = scrape_anime_information(&anime_information_html, anime_path)?;

    Ok(anime_information)
}

#[tauri::command]
#[specta::specta]
pub async fn save_anime_information(
    app: AppHandle,
    state: State<'_, AppState>,
    anime_folder: String,
    anime_information: AnimeInformation,
) -> Result<i64, String> {
    let db = state.database.read().await;
    let pool = db
        .as_ref()
        .ok_or("Database belum diinisialisasi, set folder anime dulu".to_string())?;

    let mut anime_information = anime_information;

    anime_information.tanggal_rilis =
        NaiveDate::parse_from_str(&anime_information.tanggal_rilis, "%b %d, %Y")
            .map(|m| m.to_string())
            .map_err(|e| format!("Error pengolah Tanggal: {}", e.to_string()))?;

    save_anime_information_service(&app, pool, anime_folder, anime_information).await
}

#[tauri::command]
#[specta::specta]
pub async fn search_anime(
    app: AppHandle,
    search_query: String,
) -> Result<Vec<SearchAnime>, String> {
    let search_html = search_anime_html(&app, &search_query).await?;

    let search_result = scrape_search_result(&search_html)?;

    Ok(search_result)
}
