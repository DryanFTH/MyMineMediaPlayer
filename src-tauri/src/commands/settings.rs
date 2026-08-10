use tauri::AppHandle;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

use crate::store::settings::{
    AppSettings, UpdateSettingsPayload, get_settings_store, read_settings,
    set_anime_download_directory as set_anime_download_directory_key,
    set_youtube_download_directory as set_youtube_download_directory_key, write_settings,
};

#[tauri::command]
#[specta::specta]
pub async fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    read_settings(&app)
}

#[tauri::command]
#[specta::specta]
pub async fn save_settings(app: AppHandle, settings: UpdateSettingsPayload) -> Result<(), String> {
    write_settings(&app, settings.clone())?;

    if let Some(anime_directory) = settings.anime_directory {
        app.asset_protocol_scope()
            .allow_directory(&anime_directory, true)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn pick_folder(app: AppHandle) -> Result<Option<String>, String> {
    let folder = app.dialog().file().blocking_pick_folder();

    Ok(folder.map(|f| f.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn set_anime_download_directory(app: AppHandle) -> Result<bool, String> {
    let folder = app.dialog().file().blocking_pick_folder();

    let Some(path) = folder else {
        return Err("Gagal memilih folder".to_owned());
    };

    let path_str = path.to_string();

    let settings = get_settings_store(&app).map_err(|e| e.to_string())?;

    set_anime_download_directory_key(&settings, &path_str);

    settings.save().map_err(|e| e.to_string())?;

    app.asset_protocol_scope()
        .allow_directory(&path_str, true)
        .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
#[specta::specta]
pub async fn set_youtube_download_directory(app: AppHandle) -> Result<bool, String> {
    let folder = app.dialog().file().blocking_pick_folder();

    let Some(path) = folder else {
        return Err("Failed to get your pick folder".to_owned());
    };

    let path_str = path.to_string();

    let settings = get_settings_store(&app).map_err(|e| e.to_string())?;

    set_youtube_download_directory_key(&settings, &path_str);

    settings.save().map_err(|e| e.to_string())?;

    Ok(true)
}
