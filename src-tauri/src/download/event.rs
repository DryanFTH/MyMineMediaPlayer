use serde::Serialize;
use specta::Type;
use tauri_specta::Event;

use crate::{internal_scraper::otakudesu::EpisodeInformation, providers::Resolution};

#[derive(Clone, Serialize, Type, Event)]
pub struct DownloadAnimeInfo {
    pub anime_id: String,
    pub episode: EpisodeInformation,
    pub completed: bool,
    pub resolution: Resolution,
}

#[derive(Clone, Serialize, Type, Event)]
pub struct DownloadInfo {
    pub id: String,
    pub resolution: Resolution,
    pub total_size: f64,
}

#[derive(Clone, Serialize, Type, Event)]
pub struct DownloadProgress {
    pub id: String,
    pub resolution: Resolution,
    pub downloaded: f64,
    pub total: f64,
}

#[derive(Clone, Serialize, Type, Event)]
pub struct DownloadDone {
    pub id: String,
    pub resolution: Resolution,
    pub path: String,
}

#[derive(Clone, Serialize, Type, Event)]
pub struct DownloadError {
    pub id: String,
    pub resolution: Resolution,
    pub message: String,
}

#[derive(Clone, Serialize, Type, Event)]
pub struct DownloadAnimeError {
    pub anime_id: String,
    pub episode: EpisodeInformation,
    pub resolution: Resolution,
    pub message: String,
}

#[derive(Clone, Serialize, Type, Event)]
pub struct DownloadCancelled {
    pub id: String,
    pub resolution: Resolution,
}
