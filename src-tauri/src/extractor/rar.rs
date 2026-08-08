use std::{
    error::Error,
    io,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

use async_trait::async_trait;
use tauri::AppHandle;

use crate::{
    extractor::{ArchiveEntry, Extractor, RenameMapping},
    utils::sanitize_file_name,
};

use tauri_plugin_shell::{ShellExt, process::CommandEvent};

pub struct Rar;

#[async_trait]
impl Extractor for Rar {
    async fn list_files(
        &self,
        app: &AppHandle,
        path: &str,
    ) -> Result<Vec<ArchiveEntry>, Box<dyn Error>> {
        let command = app.shell().sidecar("unrar")?.args(["lt", path]);
        let output = command.output().await?;

        if !output.status.success() {
            let error_message = String::from_utf8_lossy(&output.stderr).to_string();

            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                format!("Listing rar gagal: {error_message}"),
            )
            .into());
        }

        let result = String::from_utf8_lossy(&output.stdout);

        let mut entries = Vec::new();

        let mut current_name: Option<String> = None;
        let mut current_is_file = false;
        let mut current_size: Option<u64> = None;

        for raw_line in result.lines() {
            let line = raw_line.trim_end_matches('\r').trim();

            if let Some(value) = line.strip_prefix("Name:") {
                if value.to_lowercase().ends_with(".mp4") {
                    current_name = Some(value.trim().to_string());
                    current_is_file = false;
                    current_size = None;
                }
            }

            if let Some(value) = line.strip_prefix("Type:") {
                if current_name.is_some() && !value.trim().eq_ignore_ascii_case("File") {
                    current_name = None;
                    current_is_file = false;
                    current_size = None;
                } else {
                    current_is_file = true;
                }
            }

            if let Some(value) = line.strip_prefix("Size:") {
                let parse = value.trim().parse::<u64>();

                if parse.is_ok() {
                    current_size = Some(parse.unwrap());
                }
            }

            if current_name.is_some() && current_is_file && current_size.is_some() {
                entries.push(ArchiveEntry {
                    original_path: current_name.unwrap().clone(),
                    size: current_size.unwrap(),
                });

                current_name = None;
                current_is_file = false;
                current_size = None;
            }
        }

        Ok(entries)
    }

    async fn extract_files(
        &self,
        app: &AppHandle,
        path: &str,
        output_directory: &str,
        mappings: &[RenameMapping],
    ) -> Result<Vec<String>, Box<dyn Error>> {
        std::fs::create_dir_all(output_directory)?;

        let temp_dir = std::env::temp_dir().join(format!(
            "rar_extract_{}_{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));

        std::fs::create_dir_all(&temp_dir)?;

        let mut extracted_paths = Vec::new();

        let temp_dir_arg = {
            let mut s = temp_dir.to_string_lossy().to_string();
            if !s.ends_with(std::path::MAIN_SEPARATOR) {
                s.push(std::path::MAIN_SEPARATOR);
            }
            s
        };

        for mapping in mappings {
            let command = app.shell().sidecar("unrar")?.args([
                "x",
                "-y",
                path,
                &mapping.original_path,
                &temp_dir_arg,
            ]);

            let (mut recevier, _child) = command.spawn()?;

            let mut success = false;
            while let Some(event) = recevier.recv().await {
                if let CommandEvent::Terminated(payload) = event {
                    success = payload.code == Some(0);
                }
            }

            if !success {
                std::fs::remove_dir_all(&temp_dir)?;

                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!("gagal ekstrak entry: {}", mapping.original_path),
                )
                .into());
            }

            let temp_file = temp_dir.join(&mapping.original_path);
            if !temp_file.exists() {
                continue;
            }

            let safe_name = sanitize_file_name(&mapping.new_name)?;
            let destination = Path::new(output_directory).join(&safe_name);

            // Just make sure the parent directory exixts
            if let Some(parent) = destination.parent() {
                std::fs::create_dir_all(parent)?;
            }

            std::fs::copy(&temp_file, &destination)?;

            extracted_paths.push(destination.to_string_lossy().to_string());
        }

        std::fs::remove_dir_all(&temp_dir)?;

        Ok(extracted_paths)
    }
}
