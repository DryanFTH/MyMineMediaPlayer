use std::{
    path::Path,
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
    },
};

use async_trait::async_trait;
use tauri::{AppHandle, Emitter};

use crate::{
    download::{
        event::{DownloadCancelled, DownloadDone, DownloadInfo, DownloadProgress},
        progress::ProgressTracker,
        state::DownloadState,
        writer::ProgressWriter,
    },
    providers::{DownloadProvider, Resolution},
    services::http_client::fetch_redirect_location,
};
use tokio_util::compat::TokioAsyncWriteCompatExt;

pub struct Mega;

#[async_trait]
impl DownloadProvider for Mega {
    async fn download(
        &self,
        app: &AppHandle,
        state: &DownloadState,
        download_link: String,
        anime: String,
        resolution: Resolution,
        target_file: String,
    ) -> Result<String, String> {
        let location = normalize_mega_url(&fetch_redirect_location(&download_link).await?)
            .ok_or("Gagal menormalisasikan url mega")?;

        let cancel_flag = Arc::new(AtomicBool::new(false));
        {
            let mut flags = state.cancel_flags.lock().await;
            flags
                .entry(anime.clone())
                .or_default()
                .insert(resolution.clone(), cancel_flag.clone());
        }

        let http_client = reqwest::Client::new();
        let client = mega::Client::builder()
            .build(http_client)
            .map_err(|e| e.to_string())?;

        let nodes = client
            .fetch_public_nodes(&location)
            .await
            .map_err(|e| e.to_string())?;
        let node = nodes.roots().next().ok_or("Node not found")?;

        let total_size: u64 = node.size();
        let full_path = Path::new(&target_file);

        app.emit(
            "download-info",
            DownloadInfo {
                id: anime.clone(),
                resolution: resolution.clone(),
                total_size: total_size as f64,
            },
        )
        .map_err(|_e| "Tidak bisa memberikan event info")?;

        let file = tokio::fs::File::create(&full_path)
            .await
            .map_err(|e| e.to_string())?
            .compat_write();

        let progress_writer = ProgressWriter {
            inner: file,
            progress: ProgressTracker::new(
                app.clone(),
                anime.clone(),
                resolution.clone(),
                total_size,
            ),
            cancelled: cancel_flag.clone(),
        };

        let result = client.download_node(node, progress_writer).await;

        {
            let mut flags = state.cancel_flags.lock().await;

            if let Some(resolutions) = flags.get_mut(&anime) {
                resolutions.remove(&resolution.clone());

                if resolutions.is_empty() {
                    flags.remove(&anime);
                }
            }
        }

        match result {
            Ok(_) => {
                app.emit(
                    "download-progress",
                    DownloadProgress {
                        id: anime.clone(),
                        resolution: resolution.clone(),
                        downloaded: total_size as f64,
                        total: total_size as f64,
                    },
                )
                .map_err(|_e| "Tidak bisa memberikan event progress")?;

                app.emit(
                    "download-done",
                    DownloadDone {
                        id: anime.clone(),
                        resolution: resolution.clone(),
                        path: full_path.to_string_lossy().to_string(),
                    },
                )
                .map_err(|_e| "Tidak bisa memberikan event done")?;

                Ok(full_path.to_string_lossy().into_owned())
            }
            Err(e) => {
                if cancel_flag.load(Ordering::Relaxed) {
                    tokio::fs::remove_file(&full_path).await.ok();
                    app.emit(
                        "download-cancelled",
                        DownloadCancelled {
                            id: anime.clone(),
                            resolution: resolution.clone(),
                        },
                    )
                    .map_err(|_e| "Tidak bisa memberikan event cancelled")?;

                    Ok(full_path.to_string_lossy().into_owned())
                } else {
                    Err(e.to_string())
                }
            }
        }
    }
}

pub fn normalize_mega_url(url: &str) -> Option<String> {
    let url = url.trim();

    if let Some(fragment) = url.strip_prefix("https://mega.nz/#!") {
        let (file_id, key) = fragment.split_once('!')?;

        return Some(format!("https://mega.nz/file/{file_id}#{key}"));
    }

    Some(url.to_string())
}
