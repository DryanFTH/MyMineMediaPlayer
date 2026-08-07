use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use specta::Type;
use strum::EnumIter;
use tauri::AppHandle;

use crate::{
    download::state::DownloadState,
    providers::{
        desudrive_provider::DesuDrive, mega_provider::Mega, pixeldrain_provider::PixelDrain,
    },
};

pub mod desudrive_provider;
pub mod mega_provider;
pub mod pixeldrain_provider;

#[derive(Clone, Serialize, Deserialize, Type, EnumIter)]
pub enum Platform {
    Pdrain,
    Mega,
    DesuDrive,
}

impl Platform {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Pdrain => "Pdrain",
            Self::Mega => "Mega",
            Self::DesuDrive => "DesuDrive",
        }
    }

    pub fn as_provider(&self) -> Box<dyn DownloadProvider + Send + Sync> {
        match self {
            Self::Pdrain => Box::new(PixelDrain),
            Self::Mega => Box::new(Mega),
            Self::DesuDrive => Box::new(DesuDrive),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, PartialEq, Eq, Hash)]
pub enum Resolution {
    P360,
    P480,
    P720,
}

impl Resolution {
    pub fn as_str(&self) -> &str {
        match self {
            Self::P360 => "360p",
            Self::P480 => "480p",
            Self::P720 => "720p",
        }
    }

    pub fn from_str(resolution: &str) -> Resolution {
        match resolution {
            "360p" => Self::P360,
            "480p" => Self::P480,
            "720p" => Self::P720,
            _ => Self::P360,
        }
    }
}

#[async_trait]
pub trait DownloadProvider {
    async fn download(
        &self,
        app: &AppHandle,
        state: &DownloadState,
        download_link: String,
        anime: String,
        resolution: Resolution,
        target_file: String,
    ) -> Result<String, String>;
}
