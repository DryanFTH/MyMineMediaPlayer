use std::sync::{
    Arc,
    atomic::{AtomicU64, Ordering},
};

use tauri::{AppHandle, Emitter};

use crate::{download::event::DownloadProgress, providers::Resolution};

#[derive(Clone)]
pub struct ProgressTracker {
    id: String,
    resolution: Resolution,
    downloaded: Arc<AtomicU64>,
    total: u64,
    app: AppHandle,
    last_emitted_pct: Arc<std::sync::Mutex<u64>>,
}

impl ProgressTracker {
    pub fn new(app: AppHandle, id: String, resolution: Resolution, total: u64) -> Self {
        Self {
            id: id,
            resolution,
            downloaded: Arc::new(AtomicU64::new(0)),
            total,
            app,
            last_emitted_pct: Arc::new(std::sync::Mutex::new(0)),
        }
    }

    pub fn update(&self, bytes: u64) {
        let downloaded = self.downloaded.fetch_add(bytes, Ordering::SeqCst) + bytes;

        let percentage = if self.total > 0 {
            (downloaded as f64 / self.total as f64) * 100.0
        } else {
            0.0
        };

        let percentage_floor = percentage.floor() as u64;

        let mut last = self.last_emitted_pct.lock().unwrap();

        if percentage_floor != *last {
            *last = percentage_floor;

            let _ = self.app.emit(
                "download-progress",
                DownloadProgress {
                    id: self.id.to_owned(),
                    resolution: self.resolution.to_owned(),
                    downloaded: downloaded as f64,
                    total: self.total as f64,
                },
            );
        }
    }
}
