use std::path::{Path, PathBuf};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::{
    AppState,
    extractor::{ArchiveEntry, RenameMapping, find_extractor},
    store::settings::{get_anime_download_directory, get_settings_store},
};

#[tauri::command]
#[specta::specta]
pub async fn get_videos_in_archive(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<ArchiveEntry>, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("Archive", &["zip", "rar"])
        .blocking_pick_file();

    let Some(file_path) = file else {
        return Err("Gagal memilih file".to_string());
    };

    let path = file_path.into_path().map_err(|e| e.to_string())?;
    let str_path = path.to_str().ok_or("File tidak dapat ditemukan")?;

    let extension = path
        .extension()
        .and_then(|os_str| os_str.to_str())
        .ok_or("File tidak memiliki ekstensi".to_string())?;

    let extractor = find_extractor(extension).ok_or("File tidak didukung".to_string())?;
    let entries = extractor
        .list_files(&app, str_path)
        .await
        .map_err(|e| e.to_string())?;

    let mut guard = state.batch_file_path.lock().unwrap();
    *guard = Some(path);

    Ok(entries)
}

#[tauri::command]
#[specta::specta]
pub async fn extract_videos_from_archive(
    app: AppHandle,
    state: State<'_, AppState>,
    output_directory: String,
    mappings: Vec<RenameMapping>,
) -> Result<Vec<String>, String> {
    if mappings.is_empty() {
        return Err("Mappings tidak boleh kosong".to_string());
    }

    let store = get_settings_store(&app).map_err(|e| e.to_string())?;
    let anime_directory = get_anime_download_directory(&store)
        .ok_or("Anime download directory did not initialize yet")?;

    let output_directory = Path::new(&anime_directory)
        .join(output_directory)
        .to_string_lossy()
        .to_string();

    let archive_path: PathBuf = state
        .batch_file_path
        .lock()
        .unwrap()
        .clone()
        .ok_or("Belum ada arsip yang gunakan sebelumnya".to_string())?;
    let archive_path_str = archive_path.to_string_lossy().to_string();

    let extension = archive_path
        .extension()
        .and_then(|os_str| os_str.to_str())
        .ok_or("File tidak memiliki ekstensi".to_string())?;

    let extractor = find_extractor(extension).ok_or("File tidak didukung".to_string())?;
    let result = extractor
        .extract_files(&app, &archive_path_str, &output_directory, &mappings)
        .await
        .map_err(|e| e.to_string())?;

    let mut guard = state.batch_file_path.lock().unwrap();
    *guard = None;

    Ok(result)
}
