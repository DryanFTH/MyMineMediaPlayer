use futures_util::StreamExt;
use std::{
    path::Path,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
};
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncWriteExt;

use crate::{
    download::{
        event::{DownloadCancelled, DownloadDone, DownloadInfo, DownloadProgress},
        progress::ProgressTracker,
        state::DownloadState,
    },
    providers::Resolution,
};

pub async fn download_file(
    url: &str,
    app: &AppHandle,
    state: &DownloadState,
    anime: &str,
    resolution: Resolution,
    target_file: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let cancel_flag = Arc::new(AtomicBool::new(false));
    {
        let mut flags = state.cancel_flags.lock().await;
        flags
            .entry(anime.to_string())
            .or_default()
            .insert(resolution.clone(), cancel_flag.clone());
    }

    let response = reqwest::get(url).await?;

    let full_path = Path::new(target_file);

    let mut file = tokio::fs::File::create(&full_path).await?;
    let total_size = response.content_length().unwrap_or(0);

    app.emit(
        "download-info",
        DownloadInfo {
            id: anime.to_string(),
            resolution: resolution.clone(),
            total_size: total_size as f64,
        },
    )
    .map_err(|_e| "Tidak bisa memberikan event info")?;

    let progress = ProgressTracker::new(
        app.clone(),
        anime.to_owned(),
        resolution.clone(),
        total_size,
    );

    let mut stream = response.bytes_stream();

    let mut was_cancelled = false;

    while let Some(chunk) = stream.next().await {
        if cancel_flag.load(Ordering::Relaxed) {
            was_cancelled = true;
            break;
        }

        let chunk = chunk?;

        file.write_all(&chunk).await?;

        progress.update(chunk.len() as u64);
    }

    {
        let mut flags = state.cancel_flags.lock().await;

        if let Some(resolutions) = flags.get_mut(&anime.to_string()) {
            resolutions.remove(&resolution.clone());

            if resolutions.is_empty() {
                flags.remove(&anime.to_string());
            }
        }
    }

    if was_cancelled {
        drop(file);
        tokio::fs::remove_file(&full_path).await.ok();
        app.emit(
            "download-cancelled",
            DownloadCancelled {
                id: anime.to_string(),
                resolution: resolution.clone(),
            },
        )
        .map_err(|_e| "Tidak bisa memberikan event cancelled")?;

        return Ok(full_path.to_string_lossy().to_string());
    }

    file.flush().await?;

    app.emit(
        "download-progress",
        DownloadProgress {
            id: anime.to_string(),
            resolution: resolution.clone(),
            downloaded: total_size as f64,
            total: total_size as f64,
        },
    )
    .map_err(|_e| "Tidak bisa memberikan event progress")?;

    app.emit(
        "download-done",
        DownloadDone {
            id: anime.to_string(),
            resolution: resolution.clone(),
            path: target_file.to_string(),
        },
    )
    .map_err(|_e| "Tidak bisa memberikan event done")?;

    Ok(full_path.to_string_lossy().to_string())
}

pub async fn download_image(anime_folder: String, image_url: String) -> Result<String, String> {
    let response = reqwest::get(image_url).await.map_err(|e| e.to_string())?;

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    let extension = content_type_to_extension(content_type)
        .ok_or("Tidak bisa menentukan extension dari Content-Type")?;

    let image_file = format!("image.{}", extension);
    let file_path = Path::new(&anime_folder).join(&image_file);

    let bytes = response.bytes().await.map_err(|e| e.to_string())?;

    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|_e| "Tidak bisa membuat folder yang dibutuhkan".to_string())?;
    }

    let mut file = tokio::fs::File::create(&file_path)
        .await
        .map_err(|e| e.to_string())?;

    file.write_all(&bytes).await.map_err(|e| e.to_string())?;

    Ok(image_file)
}

fn content_type_to_extension(content_type: &str) -> Option<&'static str> {
    let mime = content_type.split(';').next()?.trim().to_lowercase();

    match mime.as_str() {
        "image/jpeg" | "image/jpg" => Some("jpg"),
        "image/png" => Some("png"),
        "image/webp" => Some("webp"),
        "image/gif" => Some("gif"),
        "image/bmp" => Some("bmp"),
        "image/svg+xml" => Some("svg"),
        "image/avif" => Some("avif"),
        _ => None,
    }
}
