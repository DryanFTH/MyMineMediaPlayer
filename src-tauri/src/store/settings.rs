use std::sync::Arc;

use serde::{Deserialize, Serialize};
use serde_json::json;

use specta::Type;
use tauri::{AppHandle, Runtime};
use tauri_plugin_store::{Error, Store, StoreExt};

use crate::internal_scraper::otakudesu::DEFAULT_BASE_URL;

pub const SETTINGS_FILE: &'static str = "settings.json";
pub const ANIME_DIRECTORY_KEY: &'static str = "anime_directory";
pub const SEASONAL_ANIME_KEY: &'static str = "seasonal_anime";
pub const YOUTUBE_DOWNLOAD_DIRECTORY_KEY: &'static str = "youtube_download_directory";
pub const OTAKUDESU_URL_KEY: &'static str = "otakudesu_url";

pub fn get_settings_store<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<Arc<Store<R>>, tauri_plugin_store::Error> {
    app.store(SETTINGS_FILE)
}

// ========================
// Anime Download Directory
// ========================

pub fn has_anime_download_directory<R: Runtime>(store: &Arc<Store<R>>) -> bool {
    store.has(ANIME_DIRECTORY_KEY)
}

pub fn get_anime_download_directory<R: Runtime>(store: &Arc<Store<R>>) -> Option<String> {
    store
        .get(ANIME_DIRECTORY_KEY)
        .and_then(|value| value.as_str().map(String::from))
}

pub fn set_anime_download_directory<R: Runtime>(store: &Arc<Store<R>>, value: &str) {
    store.set(ANIME_DIRECTORY_KEY, value);
}

// ========================
// Seasonal Anime
// ========================

pub fn has_seasonal_anime<R: Runtime>(store: &Arc<Store<R>>) -> bool {
    store.has(SEASONAL_ANIME_KEY)
}

pub fn get_seasonal_anime<R: Runtime>(store: &Arc<Store<R>>) -> SeasonalAnime {
    store
        .get(SEASONAL_ANIME_KEY)
        .and_then(|value| serde_json::from_value::<SeasonalAnime>(value).ok())
        .unwrap_or_default()
}

pub fn add_anime_to_seasonal_anime<R: Runtime>(
    store: &Arc<Store<R>>,
    day: Weekday,
    anime: &str,
) -> Result<(), Error> {
    let mut seasonal = get_seasonal_anime(store);

    seasonal.get_mut(day).push(anime.to_owned());

    store.set(SEASONAL_ANIME_KEY, serde_json::to_value(seasonal)?);

    store.save()?;

    Ok(())
}

pub fn remove_anime_from_seasonal_anime<R: Runtime>(
    store: &Arc<Store<R>>,
    day: Weekday,
    anime: &str,
) -> Result<(), Error> {
    let mut seasonal = get_seasonal_anime(store);

    seasonal.get_mut(day).retain(|item| item != anime);

    store.set(SEASONAL_ANIME_KEY, serde_json::to_value(seasonal)?);

    store.save()?;

    Ok(())
}

pub fn initialize_seasonal_anime<R: Runtime>(store: &Arc<Store<R>>) -> Result<(), Error> {
    store.set(SEASONAL_ANIME_KEY, json!(SeasonalAnime::default()));

    store.save()
}

// ===========================
// Youtube Download Directory
// ===========================

pub fn has_youtube_download_directory<R: Runtime>(store: &Arc<Store<R>>) -> bool {
    store.has(YOUTUBE_DOWNLOAD_DIRECTORY_KEY)
}

pub fn get_youtube_download_directory<R: Runtime>(store: &Arc<Store<R>>) -> Option<String> {
    store
        .get(YOUTUBE_DOWNLOAD_DIRECTORY_KEY)
        .and_then(|value| value.as_str().map(String::from))
}

pub fn set_youtube_download_directory<R: Runtime>(store: &Arc<Store<R>>, value: &str) {
    store.set(YOUTUBE_DOWNLOAD_DIRECTORY_KEY, value);
}

// ===========================
// Otakudesu Url
// ===========================

pub fn has_otakudesu_url<R: Runtime>(store: &Arc<Store<R>>) -> bool {
    store.has(OTAKUDESU_URL_KEY)
}

pub fn get_otakudesu_url<R: Runtime>(store: &Arc<Store<R>>) -> String {
    store
        .get(OTAKUDESU_URL_KEY)
        .and_then(|value| value.as_str().map(String::from))
        .unwrap_or(DEFAULT_BASE_URL.to_owned())
}

pub fn set_otakudesu_url<R: Runtime>(store: &Arc<Store<R>>, value: &str) {
    store.set(OTAKUDESU_URL_KEY, value);
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
pub struct SeasonalAnime {
    #[serde(default)]
    pub monday: Vec<String>,
    #[serde(default)]
    pub tuesday: Vec<String>,
    #[serde(default)]
    pub wednesday: Vec<String>,
    #[serde(default)]
    pub thursday: Vec<String>,
    #[serde(default)]
    pub friday: Vec<String>,
    #[serde(default)]
    pub saturday: Vec<String>,
    #[serde(default)]
    pub sunday: Vec<String>,
}

impl SeasonalAnime {
    fn get_mut(&mut self, day: Weekday) -> &mut Vec<String> {
        match day {
            Weekday::Monday => &mut self.monday,
            Weekday::Tuesday => &mut self.tuesday,
            Weekday::Wednesday => &mut self.wednesday,
            Weekday::Thursday => &mut self.thursday,
            Weekday::Friday => &mut self.friday,
            Weekday::Saturday => &mut self.saturday,
            Weekday::Sunday => &mut self.sunday,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum Weekday {
    Monday,
    Tuesday,
    Wednesday,
    Thursday,
    Friday,
    Saturday,
    Sunday,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AppSettings {
    #[serde(default)]
    pub otakudesu_url: String,
    #[serde(default)]
    pub anime_directory: String,
    #[serde(default)]
    pub youtube_download_directory: String,
    #[serde(default)]
    pub seasonal_anime: SeasonalAnime,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            otakudesu_url: String::new(),
            anime_directory: String::new(),
            youtube_download_directory: String::new(),
            seasonal_anime: SeasonalAnime::default(),
        }
    }
}

#[derive(Clone, Debug, Deserialize, Type)]
pub struct UpdateSettingsPayload {
    pub otakudesu_url: Option<String>,
    pub anime_directory: Option<String>,
    pub youtube_download_directory: Option<String>,
    pub seasonal_anime: Option<SeasonalAnime>,
}

pub fn read_settings(app: &AppHandle) -> Result<AppSettings, String> {
    let store = get_settings_store(app).map_err(|e| e.to_string())?;

    let otakudesu_url = get_otakudesu_url(&store);
    let anime_directory =
        get_anime_download_directory(&store).ok_or("Anime Download Directory not found")?;
    let youtube_download_directory =
        get_youtube_download_directory(&store).ok_or("Youtube Download Directory not found")?;
    let seasonal_anime = get_seasonal_anime(&store);

    Ok(AppSettings {
        otakudesu_url,
        anime_directory,
        youtube_download_directory,
        seasonal_anime,
    })
}

pub fn write_settings(app: &AppHandle, settings: UpdateSettingsPayload) -> Result<(), String> {
    let store = get_settings_store(app).map_err(|e| e.to_string())?;

    if let Some(url) = settings.otakudesu_url {
        store.set(OTAKUDESU_URL_KEY, serde_json::json!(url));
    }
    if let Some(dir) = settings.anime_directory {
        store.set(ANIME_DIRECTORY_KEY, serde_json::json!(dir));
    }
    if let Some(dir) = settings.youtube_download_directory {
        store.set(YOUTUBE_DOWNLOAD_DIRECTORY_KEY, serde_json::json!(dir));
    }
    if let Some(seasonal) = settings.seasonal_anime {
        store.set(SEASONAL_ANIME_KEY, serde_json::json!(seasonal));
    }

    store.save().map_err(|e| e.to_string())?;
    Ok(())
}
