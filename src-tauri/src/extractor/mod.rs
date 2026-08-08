use std::error::Error;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::AppHandle;

use crate::extractor::{rar::Rar, zip::Zip};

pub mod rar;
pub mod zip;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ArchiveEntry {
    pub original_path: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RenameMapping {
    pub original_path: String,
    pub new_name: String,
}

#[async_trait]
pub trait Extractor {
    async fn list_files(
        &self,
        app: &AppHandle,
        path: &str,
    ) -> Result<Vec<ArchiveEntry>, Box<dyn Error>>;

    async fn extract_files(
        &self,
        app: &AppHandle,
        path: &str,
        output_directory: &str,
        mappings: &[RenameMapping],
    ) -> Result<Vec<String>, Box<dyn Error>>;
}

pub fn find_extractor(extension: &str) -> Option<Box<dyn Extractor + Send + Sync>> {
    match extension {
        "zip" => Some(Box::new(Zip)),
        "rar" => Some(Box::new(Rar)),
        _ => None,
    }
}
