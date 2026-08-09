use tauri::AppHandle;

use crate::{
    internal_scraper::otakudesu::{
        AnimeListPage, AnimeOngoingPage, Season, ongoing_anime_html, scrape_animes_list,
        scrape_ongoing_anime, season_animes_html,
    },
    store::settings::{
        SeasonalAnime, Weekday, add_anime_to_seasonal_anime,
        get_seasonal_anime as get_seasonal_anime_settings, get_settings_store,
        initialize_seasonal_anime, remove_anime_from_seasonal_anime,
    },
};

#[tauri::command]
#[specta::specta]
pub fn add_seasonal_anime_by_day(
    app: AppHandle,
    day: Weekday,
    anime: String,
) -> Result<(), String> {
    let settings = get_settings_store(&app)
        .map_err(|_e| "Tidak bisa mendapatkan file settings".to_string())?;

    add_anime_to_seasonal_anime(&settings, day, &anime).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn clear_seasonal_anime(app: AppHandle) -> Result<(), String> {
    let settings = get_settings_store(&app)
        .map_err(|_e| "Tidak bisa mendapatkan file settings".to_string())?;

    initialize_seasonal_anime(&settings).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn remove_seasonal_anime_by_day(
    app: AppHandle,
    day: Weekday,
    anime: String,
) -> Result<(), String> {
    let settings = get_settings_store(&app)
        .map_err(|_e| "Tidak bisa mendapatkan file settings".to_string())?;

    remove_anime_from_seasonal_anime(&settings, day, &anime).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_seasonal_anime(app: AppHandle) -> Result<SeasonalAnime, String> {
    let settings = get_settings_store(&app)
        .map_err(|_e| "Tidak bisa mendapatkan file settings".to_string())?;

    Ok(get_seasonal_anime_settings(&settings))
}

#[tauri::command]
#[specta::specta]
pub async fn get_season_animes(
    app: AppHandle,
    season: Season,
    year: u16,
    page: u32,
) -> Result<AnimeListPage, String> {
    let season_animes_html = season_animes_html(&app, season, year, page).await?;

    let season_animes = scrape_animes_list(&season_animes_html)?;

    Ok(season_animes)
}

#[tauri::command]
#[specta::specta]
pub async fn get_ongoing_anime(app: AppHandle, page: u32) -> Result<AnimeOngoingPage, String> {
    let ongoing_anime_html = ongoing_anime_html(&app, page).await?;

    let ongoing_anime = scrape_ongoing_anime(&ongoing_anime_html)?;

    Ok(ongoing_anime)
}
