use std::{collections::HashMap, error::Error, fs::File, path::Path};

use async_trait::async_trait;
use tauri::AppHandle;
use zip::ZipArchive;

use crate::{
    extractor::{ArchiveEntry, Extractor, RenameMapping},
    utils::sanitize_file_name,
};

pub struct Zip;

#[async_trait]
impl Extractor for Zip {
    async fn list_files(
        &self,
        _app: &AppHandle,
        path: &str,
    ) -> Result<Vec<ArchiveEntry>, Box<dyn Error>> {
        let file = File::open(path)?;
        let mut archive = ZipArchive::new(file)?;
        let mut result = Vec::new();

        for i in 0..archive.len() {
            let entry = archive.by_index(i)?;

            if entry.is_dir() {
                continue;
            }

            if entry.name().to_lowercase().ends_with(".mp4") {
                result.push(ArchiveEntry {
                    original_path: entry.name().to_string(),
                    size: entry.size(),
                });
            }
        }

        Ok(result)
    }

    async fn extract_files(
        &self,
        _app: &AppHandle,
        path: &str,
        output_directory: &str,
        mappings: &[RenameMapping],
    ) -> Result<Vec<String>, Box<dyn Error>> {
        let file = File::open(path)?;
        let mut archive = ZipArchive::new(file)?;

        std::fs::create_dir_all(output_directory)?;

        let mut rename_map: HashMap<&str, &str> = HashMap::new();
        for m in mappings {
            rename_map.insert(m.original_path.as_str(), m.new_name.as_str());
        }

        let mut extracted_paths = Vec::new();

        for i in 0..archive.len() {
            let mut entry = archive.by_index(i)?;

            if entry.is_dir() {
                continue;
            }

            let Some(new_name) = rename_map.get(entry.name()) else {
                continue;
            };

            let safe_name = sanitize_file_name(new_name)?;
            let destination = Path::new(output_directory).join(&safe_name);

            if let Some(parent) = destination.parent() {
                std::fs::create_dir_all(parent)?;
            }

            let mut destination_file = File::create(&destination)?;
            std::io::copy(&mut entry, &mut destination_file)?;

            extracted_paths.push(destination.to_string_lossy().to_string());
        }

        Ok(extracted_paths)
    }
}
