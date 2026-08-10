use std::path::Path;

use tauri::{AppHandle, State};

use crate::{
    AppState,
    providers::Resolution,
    store::settings::{get_anime_download_directory, get_settings_store},
};

#[tauri::command]
#[specta::specta]
pub async fn get_video_path(
    app: AppHandle,
    state: State<'_, AppState>,
    anime_folder_name: String,
    episode_name: String,
    resolution: Resolution,
) -> Result<String, String> {
    let store = get_settings_store(&app).map_err(|e| e.to_string())?;
    let anime_directory = get_anime_download_directory(&store)
        .ok_or("Anime download directory did not initialize yet")?;

    let file_name = format!("{}_{}.mp4", episode_name, Resolution::as_str(&resolution));
    let video_path = Path::new(&anime_directory)
        .join(&anime_folder_name)
        .join(&file_name);

    if !video_path.exists() {
        return Err("Video tidak ditemukan".to_string());
    }

    Ok(format!(
        "http://127.0.0.1:{}/stream/anime/{}",
        state.stream_port,
        Path::new(&anime_folder_name)
            .join(file_name)
            .to_string_lossy()
            .to_string()
    ))
}
