use async_trait::async_trait;
use scraper::Html;
use tauri::AppHandle;

use crate::{
    download::state::DownloadState,
    providers::{DownloadProvider, Resolution},
    services::http_client::fetch_redirect_location,
    utils::{file::download_file, selector::selector_element},
};

pub struct FetchForm {
    pub url: String,
    pub method: String,
    pub query: Vec<(String, String)>,
}

pub struct DesuDrive;

#[async_trait]
impl DownloadProvider for DesuDrive {
    async fn download(
        &self,
        app: &AppHandle,
        state: &DownloadState,
        download_link: String,
        anime: String,
        resolution: Resolution,
        target_file: String,
    ) -> Result<String, String> {
        let mut location = fetch_redirect_location(&download_link).await?;

        let client = reqwest::Client::new();

        let drive_client = client
            .get(&location)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let content_type = drive_client
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .ok_or("Tidak dapat menemumkan tipe konten yang diberikan link download".to_string())?;

        if content_type.starts_with("text/html") {
            let html = drive_client
                .text()
                .await
                .map_err(|_e| "Tidak dapat mendapatkan text".to_string())?;

            let fetch_form = parse_drive_form(&html)?;

            location = match fetch_form.method.as_str() {
                "get" => client
                    .get(&fetch_form.url)
                    .query(&fetch_form.query)
                    .send()
                    .await
                    .map_err(|e| e.to_string())?
                    .url()
                    .to_string(),

                method => {
                    return Err(format!("HTTP method tidak didukung: {method}").into());
                }
            }
        }

        Ok(
            download_file(&location, app, state, &anime, resolution, &target_file)
                .await
                .map_err(|e| format!("Error Processing {}: {}", anime, e.to_string()))
                .expect("download error"),
        )
    }
}

fn parse_drive_form(html: &str) -> Result<FetchForm, String> {
    let document = Html::parse_document(&html);

    let fetch_form = document
        .select(&selector_element("#download-form"))
        .next()
        .map(|e| {
            let url = e.attr("action").unwrap_or_default().to_string();
            let method = e.attr("method").unwrap_or_default().to_string();

            let query = e
                .select(&&selector_element("input[type='hidden']"))
                .map(|e| {
                    let name = e.attr("name").unwrap_or_default();
                    let value = e.attr("value").unwrap_or_default();

                    (name.to_string(), value.to_string())
                })
                .filter(|query| !query.0.is_empty() && !query.1.is_empty())
                .collect::<Vec<_>>();

            FetchForm { url, method, query }
        })
        .ok_or("Form drive tidak ditemukan".to_string())?;

    if fetch_form.url.is_empty() || fetch_form.method.is_empty() {
        return Err("Tidak dapat menemukan Url download".to_string());
    }

    Ok(fetch_form)
}
