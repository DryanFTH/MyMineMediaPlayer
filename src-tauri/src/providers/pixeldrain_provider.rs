use async_trait::async_trait;
use tauri::AppHandle;

use crate::{
    download::state::DownloadState,
    providers::{DownloadProvider, Resolution},
    services::http_client::fetch_redirect_location,
    utils::file::download_file,
};

pub struct PixelDrain;

#[async_trait]
impl DownloadProvider for PixelDrain {
    async fn download(
        &self,
        app: &AppHandle,
        state: &DownloadState,
        download_link: String,
        anime: String,
        resolution: Resolution,
        target_file: String,
    ) -> Result<String, String> {
        let location = fetch_redirect_location(&download_link).await?;

        let download_platform_code = extract_platform_code(&location)?;

        let download_url = build_download_url(&download_platform_code);

        Ok(
            download_file(&download_url, app, state, &anime, resolution, &target_file)
                .await
                .map_err(|e| format!("Error Processing {}: {}", anime, e.to_string()))
                .expect("download error"),
        )
    }
}

fn build_download_url(code: &str) -> String {
    format!("https://pixeldrain.com/api/file/{}?download=", code)
}

fn extract_platform_code(location: &str) -> Result<String, String> {
    location
        .rsplit('/')
        .next()
        .map(String::from)
        .ok_or_else(|| "Failed to extract download platform code".to_string())
}
