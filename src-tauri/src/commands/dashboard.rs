use serde::Serialize;
use specta::Type;
use tauri::{AppHandle, State};

use crate::{
    AppState,
    model::anime::{Anime, DashboardStats, GenreCount},
};

#[derive(Serialize, Type)]
pub struct DashboardData {
    dashboard_stats: DashboardStats,
    recently_change: Vec<Anime>,
    random_pick: Vec<Anime>,
    genre_distribution: Vec<GenreCount>,
}

#[tauri::command]
#[specta::specta]
pub async fn get_dashboard_data(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<DashboardData, String> {
    let dashboard_stats = Anime::get_stats(&state.database)
        .await
        .map_err(|e| e.to_string())?;

    let recently_change = Anime::recently_change(&app, &state.database, 8)
        .await
        .map_err(|e| e.to_string())?;

    let random_pick = Anime::random_pick(&app, &state.database, 8)
        .await
        .map_err(|e| e.to_string())?;

    let genre_distribution = Anime::genre_distribution(&state.database)
        .await
        .map_err(|e| e.to_string())?;

    Ok(DashboardData {
        dashboard_stats,
        recently_change,
        random_pick,
        genre_distribution,
    })
}
