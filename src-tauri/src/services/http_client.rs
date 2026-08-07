use log::{error, info};
use reqwest::redirect::Policy;

pub async fn fetch_html(url: &str) -> Result<String, String> {
    info!("Fetching URL: {}", url);
    let response = reqwest::get(url).await.map_err(|e| {
        error!("Failed to fetch URL '{}': {}", url, e);
        e.to_string()
    })?;
    info!("Fetch successful - status: {}", response.status());

    response.text().await.map_err(|e| {
        error!("Failed to read response body: {}", e);
        e.to_string()
    })
}

pub async fn fetch_html_with_query(url: &str, query: &[(&str, &str)]) -> Result<String, String> {
    info!("Fetching URL: {}", url);
    let response = reqwest::Client::new()
        .get(url)
        .query(query)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to fetch URL '{}': {}", url, e);
            e.to_string()
        })?;
    info!("Fetch successful - status: {}", response.status());

    response.text().await.map_err(|e| {
        error!("Failed to read response body: {}", e);
        e.to_string()
    })
}

pub async fn fetch_redirect_location(url: &str) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .redirect(Policy::none())
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(url).send().await.map_err(|e| {
        error!("Failed to fetch URL '{}': {}", url, e);
        e.to_string()
    })?;

    response
        .headers()
        .get(reqwest::header::LOCATION)
        .and_then(|v| v.to_str().ok())
        .map(String::from)
        .ok_or_else(|| format!("No redirect location found for '{}'", url))
}
