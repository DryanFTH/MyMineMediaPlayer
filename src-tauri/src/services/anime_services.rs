use std::{collections::HashMap, path::Path};

use base64::{Engine, engine::general_purpose};
use scraper::Html;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::{AppHandle, Emitter};

use crate::{
    AppState,
    download::{
        event::{DownloadAnimeError, DownloadAnimeInfo, DownloadError},
        state::DownloadState,
    },
    internal_scraper::otakudesu::{
        AnimeInformation, EpisodeInformation, MirrorData, anime_information_html, episode_html,
        get_base_url, scrape_download_link, scrape_latest_episode,
    },
    model::{
        anime::{Anime, AnimeInput},
        genre::Genre,
    },
    providers::{Platform, Resolution},
    store::settings::{get_anime_download_directory, get_settings_store},
    utils::{file::download_image, selector::selector_element, title_case},
};

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct LibraryAnimeInformation {
    anime: Anime,
    episodes: Vec<LibraryEpisodeInformation>,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct LibraryEpisodeInformation {
    name: String,
    resolutions: Vec<Resolution>,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct MirrorLink {
    url: String,
    nonce: String,
}

#[derive(Serialize, Debug)]
pub struct FormMirrorLink {
    id: u64,
    i: u32,
    q: String,
    nonce: String,
    action: String,
}

pub async fn save_anime_information(
    app: &AppHandle,
    state: &AppState,
    anime_folder: String,
    anime_information: AnimeInformation,
) -> Result<i64, String> {
    if Anime::exists_by_folder_name(&state.database, &anime_folder)
        .await
        .map_err(|e| e.to_string())?
    {
        return Err("Anime sudah ada di database".to_string());
    }

    let store = get_settings_store(app).map_err(|e| e.to_string())?;
    let anime_directory = get_anime_download_directory(&store)
        .ok_or("Anime download directory did not initialize yet")?;

    let exact_anime_folder = Path::new(&anime_directory)
        .join(&anime_folder)
        .to_string_lossy()
        .into_owned();

    let image_file =
        download_image(exact_anime_folder.clone(), anime_information.image_url).await?;

    let genre_ids = Genre::create_many(
        &state.database,
        &anime_information
            .genres
            .into_iter()
            .map(|genre| {
                if genre.display.trim().len() > 0 {
                    genre.display
                } else {
                    title_case(&genre.name.replace("-", " "))
                }
            })
            .collect::<Vec<_>>(),
    )
    .await
    .map(|genres| genres.into_iter().map(|genre| genre.id).collect::<Vec<_>>())
    .map_err(|e| e.to_string())?;

    Anime::create(
        &state.database,
        &AnimeInput {
            judul: anime_information.judul,
            japanese: anime_information.japanese,
            produser: anime_information.produser,
            tanggal_rilis: anime_information.tanggal_rilis,
            studio: anime_information.studio,
            image_file,
            folder_name: anime_folder,
            genre_ids,
        },
    )
    .await
    .map_err(|e| e.to_string())
}

pub async fn download_episodes(
    app: &AppHandle,
    state: &DownloadState,
    app_state: &AppState,
    anime_folder: &str,
    episodes: Vec<EpisodeInformation>,
    resolution: Resolution,
    platform: Platform,
) -> Result<(), String> {
    for episode in episodes {
        if let Err(e) = download_episode(
            app,
            state,
            app_state,
            anime_folder,
            episode.clone(),
            resolution.clone(),
            platform.clone(),
        )
        .await
        {
            app.emit(
                "download-error",
                DownloadError {
                    id: episode.name.clone(),
                    resolution: resolution.clone(),
                    message: e.to_string(),
                },
            )
            .map_err(|_e| "Tidak bisa memberikan event error")?;
        }
    }

    Ok(())
}

pub async fn download_episode(
    app: &AppHandle,
    state: &DownloadState,
    app_state: &AppState,
    anime_folder: &str,
    episode: EpisodeInformation,
    resolution: Resolution,
    platform: Platform,
) -> Result<String, String> {
    let episode_html = episode_html(&app, &episode.url).await?;

    let download_link = scrape_download_link(&episode_html, &episode, &resolution, &platform)?;

    let store = get_settings_store(&app).map_err(|e| e.to_string())?;
    let anime_directory = get_anime_download_directory(&store)
        .ok_or("Anime download directory did not initialize yet")?;

    let anime_download_folder = Path::new(&anime_directory).join(anime_folder);

    std::fs::create_dir_all(&anime_download_folder).map_err(|e| e.to_string())?;

    let anime_file = anime_download_folder.join(format!(
        "{}_{}.mp4",
        episode.name.replace(" ", "_"),
        resolution.as_str()
    ));

    if anime_file.exists() {
        return Err("File sudah pernah di download".to_owned());
    }

    let full_path = platform
        .as_provider()
        .download(
            app,
            state,
            download_link,
            episode.name.clone(),
            resolution,
            anime_file.to_string_lossy().to_string(),
        )
        .await?;

    Anime::touch_folder_changed_at(&app_state.database, anime_folder)
        .await
        .map_err(|e| e.to_string())?;

    Ok(full_path)
}

pub async fn download_latest_episodes(
    app: &AppHandle,
    state: &DownloadState,
    app_state: &AppState,
    animes: Vec<String>,
    resolution: Resolution,
    platform: Platform,
) -> Result<(), String> {
    for anime in animes {
        download_latest_episode(app, state, app_state, anime.clone(), &resolution, &platform)
            .await?;
    }

    Ok(())
}

pub async fn download_latest_episode(
    app: &AppHandle,
    state: &DownloadState,
    app_state: &AppState,
    anime: String,
    resolution: &Resolution,
    platform: &Platform,
) -> Result<String, String> {
    let anime_information_html = anime_information_html(app, &anime).await?;

    let (completed, latest_episode) = scrape_latest_episode(&anime_information_html)?;

    app.emit(
        "download-anime-info",
        DownloadAnimeInfo {
            anime_id: anime.clone(),
            resolution: resolution.clone(),
            completed,
            episode: latest_episode.clone(),
        },
    )
    .map_err(|_e| "Tidak bisa memberikan event info")?;

    match download_episode(
        app,
        state,
        app_state,
        &anime,
        latest_episode.clone(),
        resolution.clone(),
        platform.clone(),
    )
    .await
    {
        Ok(value) => Ok(value),

        Err(e) => {
            app.emit(
                "download-anime-error",
                DownloadAnimeError {
                    anime_id: anime.clone(),
                    episode: latest_episode.clone(),
                    resolution: resolution.clone(),
                    message: e.clone(),
                },
            )
            .map_err(|_| "Tidak bisa memberikan event error".to_string())?;

            Ok("".to_string())
        }
    }
}

pub async fn get_library_anime_info(
    app: &AppHandle,
    state: &AppState,
    folder_name: String,
) -> Result<LibraryAnimeInformation, String> {
    let anime_information = Anime::find_by_folder_name(app, &state.database, &folder_name)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Anime tidak ditemukan")?;

    let store = get_settings_store(&app).map_err(|e| e.to_string())?;
    let anime_directory = get_anime_download_directory(&store)
        .ok_or("Anime download directory did not initialize yet")?;

    let folder_name = Path::new(&anime_directory)
        .join(anime_information.folder_name.clone().unwrap_or(folder_name));
    let mut episodes: HashMap<String, Vec<Resolution>> = HashMap::new();

    for entry in std::fs::read_dir(folder_name).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.extension().and_then(|ext| ext.to_str()) != Some("mp4") {
            continue;
        }

        let Some(stem) = path.file_stem().and_then(|stem| stem.to_str()) else {
            continue;
        };

        let Some((episode_name, resolution)) = stem.rsplit_once("_") else {
            continue;
        };

        episodes
            .entry(episode_name.to_string())
            .or_default()
            .push(Resolution::from_str(resolution));
    }

    let mut episodes = episodes
        .into_iter()
        .map(|(episode_name, resolutions)| LibraryEpisodeInformation {
            name: episode_name,
            resolutions,
        })
        .collect::<Vec<_>>();

    episodes.sort_by(|a, b| {
        let a_key = a.name.split_once('_');
        let b_key = b.name.split_once('_');

        match (a_key, b_key) {
            (Some(("Episode", a_num)), Some(("Episode", b_num))) => a_num
                .parse::<u32>()
                .unwrap()
                .cmp(&b_num.parse::<u32>().unwrap()),

            (Some(("OVA", a_num)), Some(("OVA", b_num))) => a_num
                .parse::<u32>()
                .unwrap()
                .cmp(&b_num.parse::<u32>().unwrap()),

            (Some(("ONA", a_num)), Some(("ONA", b_num))) => a_num
                .parse::<u32>()
                .unwrap()
                .cmp(&b_num.parse::<u32>().unwrap()),

            (Some(("Episode", _)), _) => std::cmp::Ordering::Less,
            (_, Some(("Episode", _))) => std::cmp::Ordering::Greater,

            (Some(("OVA", _)), _) => std::cmp::Ordering::Less,
            (_, Some(("OVA", _))) => std::cmp::Ordering::Greater,

            (Some(("ONA", _)), _) => std::cmp::Ordering::Less,
            (_, Some(("ONA", _))) => std::cmp::Ordering::Greater,

            _ => a.name.cmp(&b.name),
        }
    });

    Ok(LibraryAnimeInformation {
        anime: anime_information,
        episodes,
    })
}

pub async fn remove_episode(
    app: &AppHandle,
    state: &AppState,
    folder_name: String,
    episode_name: String,
    resolution: Resolution,
) -> Result<(), String> {
    let store = get_settings_store(&app).map_err(|e| e.to_string())?;
    let anime_directory = get_anime_download_directory(&store)
        .ok_or("Anime download directory did not initialize yet")?;

    let anime_information = Anime::find_by_folder_name(app, &state.database, &folder_name)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Anime tidak ditemukan")?;

    let file_name = format!("{}_{}.mp4", episode_name, Resolution::as_str(&resolution));
    let folder_name = anime_information.folder_name.clone().unwrap_or(folder_name);
    let episode_path = Path::new(&anime_directory)
        .join(&folder_name)
        .join(&file_name);

    if !episode_path.exists() {
        return Err("Episode tidak ditemukan".to_string());
    }

    std::fs::remove_file(episode_path).map_err(|e| e.to_string())?;

    Anime::touch_folder_changed_at(&state.database, &folder_name)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn remove_anime(
    app: &AppHandle,
    state: &AppState,
    folder_name: String,
) -> Result<(), String> {
    let store = get_settings_store(&app).map_err(|e| e.to_string())?;
    let anime_directory = get_anime_download_directory(&store)
        .ok_or("Anime download directory did not initialize yet")?;

    Anime::delete_by_folder_name(&state.database, &folder_name)
        .await
        .map_err(|e| e.to_string())?;

    let folder_path = Path::new(&anime_directory).join(&folder_name);

    std::fs::remove_dir_all(folder_path).map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn get_mirror_link(
    app: &AppHandle,
    mirror_info: MirrorData,
    nonce: Option<String>,
) -> Result<MirrorLink, String> {
    let otakudesu_url = get_base_url(app)?;

    let client = reqwest::Client::new();

    let mut nonce = nonce;

    if nonce.is_none() {
        let fetch_nonce = client
            .post(format!("{otakudesu_url}/wp-admin/admin-ajax.php"))
            .form(&[("action", "aa1208d27f29ca340c92c66d1926f13f")])
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json::<serde_json::Value>()
            .await
            .map_err(|e| e.to_string())?;

        let raw_nonce = fetch_nonce["data"]
            .as_str()
            .ok_or("Tidak dapat mengambil nonce".to_string())?;

        nonce = Some(raw_nonce.to_string());
    }

    let nonce = nonce.unwrap();

    let fetch_mirror_link = client
        .post(format!("{otakudesu_url}/wp-admin/admin-ajax.php"))
        .form(&FormMirrorLink {
            id: mirror_info.id,
            i: mirror_info.i,
            q: mirror_info.q,
            nonce: nonce.clone(),
            action: "2a3505c93b0035d3f455df82bf976b84".to_string(),
        })
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| e.to_string())?;

    let raw_mirror_link = fetch_mirror_link["data"]
        .as_str()
        .ok_or("Tidak dapat mengambil mirror link".to_string())?;

    let mirror_link = raw_mirror_link.to_string();

    let decoded = general_purpose::STANDARD
        .decode(&mirror_link)
        .map_err(|e| e.to_string())?;
    let embed_string = String::from_utf8(decoded).map_err(|e| e.to_string())?;
    let embed_html = Html::parse_document(&embed_string);

    let mirror_url = embed_html
        .select(&selector_element("iframe"))
        .next()
        .and_then(|iframe| iframe.attr("src").map(String::from))
        .ok_or("Tidak dapat mendapatkan default mirror".to_string())?;

    Ok(MirrorLink {
        url: mirror_url,
        nonce: nonce,
    })
}

// get nonce: POST https://otakudesu.blog/wp-admin/admin-ajax.php
//            { action: "aa1208d27f29ca340c92c66d1926f13f" }

// get mirror link: POST https://otakudesu.blog/wp-admin/admin-ajax.php
//                  { id: 201409, i: 1, q: "480p", nonce: "fe174e0b4c", action: "2a3505c93b0035d3f455df82bf976b84" }
