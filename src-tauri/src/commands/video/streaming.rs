use tauri::AppHandle;

use crate::{
    internal_scraper::otakudesu::{
        EpisodeStreamingInformation, MirrorData, episode_html, scrape_episode_streaming,
    },
    services::anime_services::{MirrorLink, get_mirror_link as get_mirror_link_service},
};

#[tauri::command]
#[specta::specta]
pub async fn get_episode_streaming(
    app: AppHandle,
    episode_url: String,
) -> Result<EpisodeStreamingInformation, String> {
    let episode_html = episode_html(&app, &episode_url).await?;

    let episode_streaming = scrape_episode_streaming(&episode_html, &episode_url)?;

    Ok(episode_streaming)
}

#[tauri::command]
#[specta::specta]
pub async fn get_mirror_link(
    app: AppHandle,
    mirror_info: MirrorData,
    nonce: Option<String>,
) -> Result<MirrorLink, String> {
    get_mirror_link_service(&app, mirror_info, nonce).await
}
