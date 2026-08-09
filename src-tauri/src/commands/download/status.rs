use serde::{Deserialize, Serialize};
use specta::Type;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Manager, State};

use crate::{
    download::state::DownloadState,
    providers::Resolution,
    store::settings::{
        SETTINGS_FILE, get_settings_store, has_anime_download_directory,
        has_youtube_download_directory,
    },
};

#[derive(Serialize, Deserialize, Type)]
pub struct InitStatus {
    pub is_initialized: bool,
    pub has_store_anime_directory: bool,
    pub has_youtube_download_directory: bool,
}

#[tauri::command]
#[specta::specta]
pub fn check_init_status(app: AppHandle) -> Result<InitStatus, String> {
    let settings_path = app.path().app_data_dir().unwrap().join(SETTINGS_FILE);
    let is_initialized = settings_path.exists();

    if !is_initialized {
        return Ok(InitStatus {
            is_initialized,
            has_store_anime_directory: false,
            has_youtube_download_directory: false,
        });
    }

    let settings = get_settings_store(&app).map_err(|e| e.to_string())?;

    let has_store_anime_directory = has_anime_download_directory(&settings);

    let has_youtube_download_directory = has_youtube_download_directory(&settings);

    Ok(InitStatus {
        is_initialized,
        has_store_anime_directory,
        has_youtube_download_directory,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn cancel_download(
    state: State<'_, DownloadState>,
    id: String,
    resolution: Resolution,
) -> Result<(), String> {
    let flags = state.cancel_flags.lock().await;

    if let Some(resolutions) = flags.get(&id) {
        if let Some(flag) = resolutions.get(&resolution) {
            flag.store(true, Ordering::Relaxed);
        }
    }
    Ok(())
}
