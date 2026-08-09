use tauri::{AppHandle, State};

use crate::{
    AppState,
    internal_scraper::otakudesu::{
        AnimeListPage, GenreInformation, animes_by_genre_html, scrape_animes_list,
        scrape_genre_list,
    },
    model::{
        anime::{Anime, AnimePaginate, GenreMatch, SortingMethod},
        genre::Genre,
    },
};

#[tauri::command]
#[specta::specta]
pub async fn get_genre_list() -> Vec<GenreInformation> {
    scrape_genre_list()
}

#[tauri::command]
#[specta::specta]
pub async fn get_genre_list_library(state: State<'_, AppState>) -> Result<Vec<Genre>, String> {
    Genre::all(&state.database).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_animes_by_genre(
    app: AppHandle,
    genre: String,
    page: u32,
) -> Result<AnimeListPage, String> {
    let animes_by_genre_html = animes_by_genre_html(&app, &genre, page).await?;

    let animes_by_genre = scrape_animes_list(&animes_by_genre_html)?;

    Ok(animes_by_genre)
}

#[tauri::command]
#[specta::specta]
pub async fn get_animes_by_genre_library(
    app: AppHandle,
    state: State<'_, AppState>,
    page: u32,
    per_page: u32,
    sort: SortingMethod,
    genres: Vec<i64>,
) -> Result<AnimePaginate, String> {
    let genre_match = if genres.len() > 1 {
        GenreMatch::All
    } else {
        GenreMatch::Any
    };

    Anime::by_genres(
        &app,
        &state.database,
        &genres,
        genre_match,
        page,
        per_page,
        sort,
        Some("id, judul, image_file, tanggal_rilis, studio, folder_name"),
    )
    .await
    .map_err(|e| e.to_string())
}
