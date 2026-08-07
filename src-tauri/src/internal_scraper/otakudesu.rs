use std::collections::HashMap;
use std::path::PathBuf;

use base64::Engine;
use base64::engine::general_purpose;
use regex::Regex;
// use chrono::Local;
use scraper::{ElementRef, Html};
use serde::{Deserialize, Serialize};
use serde_json::from_slice;
use specta::Type;
use strum::EnumIter;
use tauri::AppHandle;

use crate::providers::{Platform, Resolution};
use crate::services::http_client::{fetch_html, fetch_html_with_query};
use crate::store::settings::{get_otakudesu_url, get_settings_store};
use crate::utils::selector::{CommonSelectors, selector_element};
use crate::utils::strip_html;

pub const DEFAULT_BASE_URL: &str = "https://otakudesu.blog";
fn additional_genres() -> Vec<GenreInformation> {
    vec![
        GenreInformation {
            name: "action".to_string(),
            display: "Action".to_string(),
        },
        GenreInformation {
            name: "adult-cast".to_string(),
            display: "Adult Cast".to_string(),
        },
        GenreInformation {
            name: "adventure".to_string(),
            display: "Adventure".to_string(),
        },
        GenreInformation {
            name: "anthropomorphic".to_string(),
            display: "Anthropomorphic".to_string(),
        },
        GenreInformation {
            name: "cgdct".to_string(),
            display: "CGDCT (Cute Girls Doing Cute Things)".to_string(),
        },
        GenreInformation {
            name: "childcare".to_string(),
            display: "Childcare".to_string(),
        },
        GenreInformation {
            name: "comedy".to_string(),
            display: "Comedy".to_string(),
        },
        GenreInformation {
            name: "crossdressing".to_string(),
            display: "Crossdressing".to_string(),
        },
        GenreInformation {
            name: "delinquents".to_string(),
            display: "Delinquents".to_string(),
        },
        GenreInformation {
            name: "demons".to_string(),
            display: "Demons".to_string(),
        },
        GenreInformation {
            name: "detective".to_string(),
            display: "Detective".to_string(),
        },
        GenreInformation {
            name: "drama".to_string(),
            display: "Drama".to_string(),
        },
        GenreInformation {
            name: "ecchi".to_string(),
            display: "Ecchi".to_string(),
        },
        GenreInformation {
            name: "fantasy".to_string(),
            display: "Fantasy".to_string(),
        },
        GenreInformation {
            name: "gag-humor".to_string(),
            display: "Gag Humor".to_string(),
        },
        GenreInformation {
            name: "game".to_string(),
            display: "Game".to_string(),
        },
        GenreInformation {
            name: "girls-love".to_string(),
            display: "Girls Love".to_string(),
        },
        GenreInformation {
            name: "gore".to_string(),
            display: "Gore".to_string(),
        },
        GenreInformation {
            name: "gourmet".to_string(),
            display: "Gourmet".to_string(),
        },
        GenreInformation {
            name: "harem".to_string(),
            display: "Harem".to_string(),
        },
        GenreInformation {
            name: "historical".to_string(),
            display: "Historical".to_string(),
        },
        GenreInformation {
            name: "horror".to_string(),
            display: "Horror".to_string(),
        },
        GenreInformation {
            name: "isekai".to_string(),
            display: "Isekai".to_string(),
        },
        GenreInformation {
            name: "iyashikei".to_string(),
            display: "Iyashikei".to_string(),
        },
        GenreInformation {
            name: "josei".to_string(),
            display: "Josei".to_string(),
        },
        GenreInformation {
            name: "love-polygon".to_string(),
            display: "Love Polygon".to_string(),
        },
        GenreInformation {
            name: "mahou-shoujo".to_string(),
            display: "Mahou Shoujo".to_string(),
        },
        GenreInformation {
            name: "magic".to_string(),
            display: "Magic".to_string(),
        },
        GenreInformation {
            name: "martial-arts".to_string(),
            display: "Martial Arts".to_string(),
        },
        GenreInformation {
            name: "medical".to_string(),
            display: "Medical".to_string(),
        },
        GenreInformation {
            name: "mecha".to_string(),
            display: "Mecha".to_string(),
        },
        GenreInformation {
            name: "military".to_string(),
            display: "Military".to_string(),
        },
        GenreInformation {
            name: "music".to_string(),
            display: "Music".to_string(),
        },
        GenreInformation {
            name: "mystery".to_string(),
            display: "Mystery".to_string(),
        },
        GenreInformation {
            name: "mythology".to_string(),
            display: "Mythology".to_string(),
        },
        GenreInformation {
            name: "organized-crime".to_string(),
            display: "Organized Crime".to_string(),
        },
        GenreInformation {
            name: "otaku-culture".to_string(),
            display: "Otaku Culture".to_string(),
        },
        GenreInformation {
            name: "parody".to_string(),
            display: "Parody".to_string(),
        },
        GenreInformation {
            name: "performing-arts".to_string(),
            display: "Performing Arts".to_string(),
        },
        GenreInformation {
            name: "pets".to_string(),
            display: "Pets".to_string(),
        },
        GenreInformation {
            name: "police".to_string(),
            display: "Police".to_string(),
        },
        GenreInformation {
            name: "psychological".to_string(),
            display: "Psychological".to_string(),
        },
        GenreInformation {
            name: "racing".to_string(),
            display: "Racing".to_string(),
        },
        GenreInformation {
            name: "reincarnation".to_string(),
            display: "Reincarnation".to_string(),
        },
        GenreInformation {
            name: "romance".to_string(),
            display: "Romance".to_string(),
        },
        GenreInformation {
            name: "samurai".to_string(),
            display: "Samurai".to_string(),
        },
        GenreInformation {
            name: "school".to_string(),
            display: "School".to_string(),
        },
        GenreInformation {
            name: "sci-fi".to_string(),
            display: "Sci-Fi".to_string(),
        },
        GenreInformation {
            name: "seinen".to_string(),
            display: "Seinen".to_string(),
        },
        GenreInformation {
            name: "showbiz".to_string(),
            display: "Showbiz".to_string(),
        },
        GenreInformation {
            name: "shoujo".to_string(),
            display: "Shoujo".to_string(),
        },
        GenreInformation {
            name: "shoujo-ai".to_string(),
            display: "Shoujo Ai".to_string(),
        },
        GenreInformation {
            name: "shounen".to_string(),
            display: "Shounen".to_string(),
        },
        GenreInformation {
            name: "slice-of-life".to_string(),
            display: "Slice of Life".to_string(),
        },
        GenreInformation {
            name: "space".to_string(),
            display: "Space".to_string(),
        },
        GenreInformation {
            name: "sports".to_string(),
            display: "Sports".to_string(),
        },
        GenreInformation {
            name: "strategy-game".to_string(),
            display: "Strategy Game".to_string(),
        },
        GenreInformation {
            name: "super-power".to_string(),
            display: "Super Power".to_string(),
        },
        GenreInformation {
            name: "supernatural".to_string(),
            display: "Supernatural".to_string(),
        },
        GenreInformation {
            name: "suspense".to_string(),
            display: "Suspense".to_string(),
        },
        GenreInformation {
            name: "team-sports".to_string(),
            display: "Team Sports".to_string(),
        },
        GenreInformation {
            name: "thriller".to_string(),
            display: "Thriller".to_string(),
        },
        GenreInformation {
            name: "time-travel".to_string(),
            display: "Time Travel".to_string(),
        },
        GenreInformation {
            name: "urban-fantasy".to_string(),
            display: "Urban Fantasy".to_string(),
        },
        GenreInformation {
            name: "vampire".to_string(),
            display: "Vampire".to_string(),
        },
        GenreInformation {
            name: "video-game".to_string(),
            display: "Video Game".to_string(),
        },
        GenreInformation {
            name: "villainess".to_string(),
            display: "Villainess".to_string(),
        },
        GenreInformation {
            name: "visual-arts".to_string(),
            display: "Visual Arts".to_string(),
        },
        GenreInformation {
            name: "workplace".to_string(),
            display: "Workplace".to_string(),
        },
    ]
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct SearchAnime {
    judul: String,
    anime_name: String,
    image_url: String,
    genre: Vec<GenreInformation>,
    status: String,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct AnimeListPage {
    animes: Vec<AnimeListInfo>,
    current_page: u32,
    max_page: u32,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct AnimeOngoingPage {
    animes: Vec<AnimeOngoingInfo>,
    current_page: u32,
    max_page: u32,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct AnimeInformation {
    pub image_url: String,
    pub judul: String,
    pub japanese: String,
    pub score: String,
    pub produser: String,
    pub tipe: String,
    pub status: String,
    pub tanggal_rilis: String,
    pub studio: String,
    pub genres: Vec<GenreInformation>,
    pub sinopsis: Vec<String>,
    pub episodes: Vec<EpisodeWithStatus>,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct AnimeListInfo {
    pub image_url: String,
    pub judul: String,
    pub anime_name: String,
    pub studio: String,
    pub score: String,
    pub musim_rilis: String,
    pub genres: Vec<GenreInformation>,
    pub sinopsis: Vec<String>,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct AnimeOngoingInfo {
    pub image_url: String,
    pub judul: String,
    pub anime_name: String,
    pub day: String,
    pub date: String,
    pub latest_episode: String,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct EpisodeWithStatus {
    pub info: EpisodeInformation,
    pub downloaded_resolutions: Vec<Resolution>,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct EpisodeInformation {
    pub name: String,
    pub date: String,
    pub url: String,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct GenreInformation {
    pub name: String,
    pub display: String,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct MirrorData {
    pub id: u64,
    pub i: u32,
    pub q: String,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct Mirror {
    name: String,
    data: MirrorData,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct ResolutionMirror {
    resolution: String,
    mirrors: Vec<Mirror>,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug)]
pub struct EpisodeStreamingInformation {
    pub episode_information: EpisodeInformation,
    pub anime_name: String,
    pub anime_folder: String,
    pub episodes: Vec<EpisodeInformation>,
    pub default_mirror: String,
    pub mirrors: Vec<ResolutionMirror>,
}

#[derive(Clone, Deserialize, Serialize, Type, Debug, EnumIter)]
pub enum Season {
    Winter,
    Summer,
    Fall,
    Spring,
}

impl Season {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Winter => "winter",
            Self::Summer => "summer",
            Self::Spring => "spring",
            Self::Fall => "fall",
        }
    }
}

pub fn get_base_url(app: &AppHandle) -> Result<String, String> {
    let settings =
        get_settings_store(app).map_err(|_e| "Couldn't get settings store".to_owned())?;

    Ok(get_otakudesu_url(&settings))
}

pub fn get_anime_page_url(app: &AppHandle, anime: &str) -> Result<String, String> {
    let otakudesu_url = get_base_url(app)?;

    Ok(format!("{}/anime/{}", otakudesu_url, anime))
}

pub async fn search_anime_html(app: &AppHandle, search_query: &str) -> Result<String, String> {
    let otakudesu_url = get_base_url(app)?;

    let search_html = fetch_html_with_query(
        &otakudesu_url,
        &[("s", search_query), ("post_type", "anime")],
    )
    .await?;

    Ok(search_html)
}

pub async fn anime_information_html(app: &AppHandle, anime: &str) -> Result<String, String> {
    let anime_information = fetch_html(&get_anime_page_url(app, anime)?).await?;

    Ok(anime_information)
}

pub async fn episode_html(app: &AppHandle, episode_name: &str) -> Result<String, String> {
    let otakudesu_url = get_base_url(app)?;

    let episode_html = fetch_html(&format!("{}/episode/{}", otakudesu_url, episode_name)).await?;

    Ok(episode_html)
}

// This function will stay around just in case anything changes in the future.
pub async fn _genre_list_html(app: &AppHandle) -> Result<String, String> {
    let otakudesu_url = get_base_url(app)?;

    let episode_html = fetch_html(&format!("{}/genre-list", otakudesu_url)).await?;

    Ok(episode_html)
}

pub async fn animes_by_genre_html(
    app: &AppHandle,
    genre: &str,
    page: u32,
) -> Result<String, String> {
    let otakudesu_url = get_base_url(app)?;

    let genre_html =
        fetch_html(&format!("{}/genres/{}/page/{}", otakudesu_url, genre, page)).await?;

    Ok(genre_html)
}

pub async fn ongoing_anime_html(app: &AppHandle, page: u32) -> Result<String, String> {
    let otakudesu_url = get_base_url(app)?;

    let ongoing_anime_html =
        fetch_html(&format!("{}/ongoing-anime/page/{}", otakudesu_url, page)).await?;

    Ok(ongoing_anime_html)
}

pub async fn season_animes_html(
    app: &AppHandle,
    season: Season,
    year: u16,
    page: u32,
) -> Result<String, String> {
    let otakudesu_url = get_base_url(app)?;

    let season_combined = format!("{}-{}", season.as_str(), year);
    let season_animes_html = fetch_html(&format!(
        "{}/seasons/{}/page/{}",
        otakudesu_url, season_combined, page
    ))
    .await?;

    Ok(season_animes_html)
}

// =========================
// Scraper
// =========================

pub fn scrape_download_link(
    html: &str,
    _episode: &EpisodeInformation,
    resolution: &Resolution,
    platform: &Platform,
) -> Result<String, String> {
    // let _now = Local::now();
    let document = Html::parse_document(html);

    let selectors = CommonSelectors::new();
    // let kategoz_selector = selector_element(".kategoz");
    let download_section_selector = selector_element(".download");

    // let release_time_text = document
    //     .select(&kategoz_selector)
    //     .next()
    //     .and_then(|k| k.select(&selectors.span).nth(1))
    //     .map(|s| s.inner_html())
    //     .ok_or("Release time not found")?;

    // let release_time = parse_indonesia_date(&episode.date, &release_time_text)
    //     .map_err(|_| "Failed to parse release date".to_string())?;

    // if now.signed_duration_since(release_time) >= Duration::days(1) {
    //     return Err("Episode is too old for this week".to_string());
    // }

    if let Some(box_element) = document
        .select(&selector_element(".yondarkness-box"))
        .next()
    {
        for (index, element) in box_element
            .select(&selector_element(".yondarkness-title"))
            .enumerate()
        {
            let text = element.text().collect::<String>();

            if !text.contains(resolution.as_str()) {
                continue;
            }

            return box_element
                .select(&selector_element(".yondarkness-item"))
                .nth(index)
                .and_then(|e| e.select(&selector_element("div")).next())
                .and_then(|div| {
                    div.select(&selectors.a).find(|a| {
                        a.text()
                            .collect::<String>()
                            .trim()
                            .contains(platform.as_str())
                    })
                })
                .and_then(|a| a.attr("href"))
                .map(String::from)
                .ok_or_else(|| "Download link not found".to_string());
        }
    };

    document
        .select(&download_section_selector)
        .next()
        .and_then(|section| section.select(&selectors.ul).next())
        .and_then(|ul| {
            ul.select(&selectors.li).find(|li| {
                li.select(&selectors.strong)
                    .next()
                    .map(|s| {
                        s.text()
                            .collect::<String>()
                            .trim()
                            .contains(resolution.as_str())
                    })
                    .unwrap_or(false)
            })
        })
        .and_then(|li| {
            li.select(&selectors.a).find(|a| {
                a.text()
                    .collect::<String>()
                    .trim()
                    .contains(platform.as_str())
            })
        })
        .and_then(|a| a.attr("href"))
        .map(String::from)
        .ok_or_else(|| "Download link not found".to_string())
}

pub fn scrape_search_result(html: &str) -> Result<Vec<SearchAnime>, String> {
    let document = Html::parse_document(html);

    let selectors = CommonSelectors::new();
    let set_selector = selector_element(".set");

    let search_result_element = document
        .select(&selector_element(".chivsrc"))
        .next()
        .ok_or_else(|| "Result not found".to_string())?;

    let search_result = search_result_element
        .select(&selectors.li)
        .map(|li| {
            let (judul, anime_name) = li
                .select(&selector_element("h2 a"))
                .next()
                .map(|element| {
                    let judul = element.inner_html();

                    let anime_name = parse_anime_name(element);

                    (judul, anime_name)
                })
                .unwrap_or_else(|| ("unknown".to_owned(), "unknown".to_owned()));

            let image_url = li
                .select(&selector_element("img"))
                .next()
                .and_then(|img| img.attr("src"))
                .map(String::from)
                .unwrap_or("unknown".to_owned());

            let genre = li
                .select(&set_selector)
                .find(|set| {
                    set.select(&selectors.b)
                        .next()
                        .map(|b| b.text().collect::<String>().trim().contains("Genres"))
                        .unwrap_or(false)
                })
                .map(|genre_set| {
                    genre_set
                        .select(&selectors.a)
                        .map(parse_genre)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();

            let status = li
                .select(&set_selector)
                .find(|set| {
                    set.select(&selectors.b)
                        .next()
                        .map(|b| b.text().collect::<String>().trim().contains("Status"))
                        .unwrap_or(false)
                })
                .and_then(|status_set| {
                    status_set
                        .inner_html()
                        .split_once(": ")
                        .map(|(_, value)| value.to_owned())
                })
                .unwrap_or_else(|| "unknown".to_owned());

            SearchAnime {
                judul: judul,
                anime_name: anime_name,
                image_url,
                genre,
                status,
            }
        })
        .collect::<Vec<_>>();

    Ok(search_result)
}

pub fn scrape_anime_information(
    html: &str,
    anime_path: PathBuf,
) -> Result<AnimeInformation, String> {
    let document = Html::parse_document(html);

    let fotoanime = document
        .select(&selector_element(".fotoanime"))
        .next()
        .ok_or("Can't find anime information")?; // idk why they name it like this XD

    let image_url = fotoanime
        .select(&selector_element("img"))
        .next()
        .and_then(|img| img.attr("src"))
        .map(String::from)
        .unwrap_or("unknown".to_owned());

    let sinopsis = fotoanime
        .select(&selector_element(".sinopc"))
        .next()
        .map(|sinopc| {
            sinopc
                .select(&selector_element("p"))
                .map(|p| {
                    strip_html(&p.inner_html())
                        .replace("\u{a0}", " ")
                        .trim()
                        .to_owned()
                })
                .filter(|sinopsis| sinopsis.len() > 0)
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let selectors = CommonSelectors::new();

    let mut judul = String::new();
    let mut japanese = String::new();
    let mut score = String::new();
    let mut produser = String::new();
    let mut tipe = String::new();
    let mut tanggal_rilis = String::new();
    let mut studio = String::new();
    let mut genres = Vec::new();

    for element in fotoanime.select(&selectors.p) {
        let Some(key_element) = element.select(&selectors.b).next() else {
            continue;
        };

        let key = key_element.text().collect::<String>().trim().to_owned();

        match key.as_str() {
            "Judul" => {
                judul = parse_information(element).unwrap_or("unknown".to_owned());
            }

            "Japanese" => {
                japanese = parse_information(element).unwrap_or("unknown".to_owned());
            }

            "Skor" => {
                score = parse_information(element).unwrap_or("unknown".to_owned());
            }

            "Produser" => {
                produser = parse_information(element).unwrap_or("unknown".to_owned());
            }

            "Tipe" => {
                tipe = parse_information(element).unwrap_or("unknown".to_owned());
            }

            "Tanggal Rilis" => {
                tanggal_rilis = parse_information(element).unwrap_or("unknown".to_owned());
            }

            "Studio" => {
                studio = parse_information(element).unwrap_or("unknown".to_owned());
            }

            "Genre" => {
                genres = element
                    .select(&selectors.a)
                    .map(parse_genre)
                    .collect::<Vec<_>>()
            }

            _ => {}
        }
    }

    let mut status = "Ongoing";

    let episodes_infomation = document
        .select(&selector_element(".episodelist"))
        .nth(1)
        .and_then(|episode_list| episode_list.select(&selectors.ul).next())
        .map(|ul| {
            ul.select(&selectors.li)
                .map(|li| {
                    let (name, url) = li
                        .select(&selector_element("span a"))
                        .next()
                        .map(|a| {
                            let full_name = a.inner_html();
                            let name_regex = Regex::new(
                                r"(?i)\b(Episode|OVA|ONA|Special)\s+\d+(?:\.\d+)?\b|\bMovie\b",
                            )
                            .unwrap();

                            let name = name_regex
                                .find(&full_name)
                                .map(|m| m.as_str())
                                .map(String::from)
                                .unwrap_or(full_name.clone());

                            let url = a
                                .attr("href")
                                .and_then(|href| href.split("/episode/").nth(1))
                                .map(|name| name.trim_end_matches('/').to_owned())
                                .unwrap_or("unknown".to_owned());

                            if full_name.to_lowercase().contains("(end)") {
                                status = "Completed";
                            }

                            (name, url)
                        })
                        .unwrap_or_else(|| ("unknown".to_owned(), "unknown".to_owned()));

                    let date = li
                        .select(&selector_element(".zeebr"))
                        .next()
                        .map(|zeebr| zeebr.inner_html())
                        .unwrap_or("unknown".to_owned());

                    EpisodeInformation { name, date, url }
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let downloaded_episodes = std::fs::read_dir(anime_path)
        .map(|read_dir| read_dir.filter_map(Result::ok))
        .map(|iter| {
            iter.map(|entry| entry.path())
                .filter(|path| path.is_file() && path.extension().is_some_and(|ext| ext == "mp4"))
                .map(|path| {
                    let file_name = path
                        .file_stem()
                        .unwrap()
                        .to_owned()
                        .to_string_lossy()
                        .into_owned();

                    let (name, resolution) = file_name.rsplit_once("_").unwrap_or_default();

                    (name.replace("_", " "), Resolution::from_str(resolution))
                })
                .fold(
                    HashMap::new(),
                    |mut map: HashMap<String, Vec<Resolution>>, (key, value)| {
                        map.entry(key).or_default().push(value);

                        map
                    },
                )
        })
        .unwrap_or_default();

    let episodes = episodes_infomation
        .iter()
        .map(|episode| EpisodeWithStatus {
            info: episode.clone(),
            downloaded_resolutions: downloaded_episodes
                .get(&episode.name)
                .cloned()
                .unwrap_or_default(),
        })
        .collect::<Vec<_>>();

    Ok(AnimeInformation {
        image_url,
        judul,
        japanese,
        score,
        produser,
        tipe,
        status: status.to_owned(),
        tanggal_rilis,
        studio,
        genres,
        sinopsis,
        episodes,
    })
}

pub fn scrape_genre_list() -> Vec<GenreInformation> {
    // We don't need to fetch the genres from Otakudesu since we've already got a more complete list, isn't it?
    // This function will stay around just in case anything changes in the future.
    //
    // let document = Html::parse_document(html);

    // let genre_list_selector = selector_element(".genres li a");

    // let mut genre_list = document
    //     .select(&genre_list_selector)
    //     .into_iter()
    //     .map(|genre_anchor| parse_genre(genre_anchor))
    //     .collect::<Vec<_>>();

    // genre_list.extend(additional_genres());
    // genre_list.sort_by(|next, prev| next.display.cmp(&prev.display));

    // genre_list
    additional_genres()
}

pub fn scrape_animes_list(html: &str) -> Result<AnimeListPage, String> {
    let document = Html::parse_document(html);

    let pagination = document
        .select(&selector_element(".pagenavix"))
        .next()
        .ok_or("Halaman tidak ditemukan".to_string())?;

    let (current_page, max_page): (u32, u32) = pagination
        .select(&selector_element(".page-numbers"))
        .filter(|page_number| page_number.inner_html().parse::<u32>().is_ok())
        .fold((1, 1), |prev, page_number| {
            let page = page_number.inner_html().parse::<u32>().unwrap();

            if page_number
                .value()
                .has_class("current", scraper::CaseSensitivity::CaseSensitive)
            {
                if prev.1 < page {
                    return (page, page);
                }

                return (page, prev.1);
            }

            if prev.1 < page {
                return (prev.0, page);
            }

            prev
        });

    let animes = document
        .select(&selector_element(".col-anime"))
        .map(|col_anime| {
            let image_url = col_anime
                .select(&selector_element(".col-anime-cover img"))
                .next()
                .and_then(|image| image.attr("src"))
                .map(String::from)
                .unwrap_or_default();

            let (judul, anime_name) = col_anime
                .select(&selector_element(".col-anime-title a"))
                .next()
                .map(|title| {
                    let judul = title.inner_html();
                    let anime_name = parse_anime_name(title);

                    (judul, anime_name)
                })
                .unwrap_or_default();

            let studio = col_anime
                .select(&selector_element(".col-anime-studio"))
                .next()
                .map(|studio| studio.inner_html())
                .unwrap_or_default();

            let score = col_anime
                .select(&selector_element(".col-anime-rating"))
                .next()
                .map(|rating| rating.inner_html())
                .unwrap_or_default();

            let musim_rilis = col_anime
                .select(&selector_element(".col-anime-date"))
                .next()
                .map(|studio| studio.inner_html())
                .unwrap_or_default();

            let genres = col_anime
                .select(&selector_element(".col-anime-genre"))
                .next()
                .map(|genres| {
                    genres
                        .select(&selector_element("a"))
                        .map(parse_genre)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();

            let sinopsis = col_anime
                .select(&selector_element(".col-synopsis"))
                .next()
                .map(|sinopc| {
                    sinopc
                        .select(&selector_element("p"))
                        .map(|p| {
                            strip_html(&p.inner_html())
                                .replace("\u{a0}", " ")
                                .trim()
                                .to_owned()
                        })
                        .filter(|sinopsis| sinopsis.len() > 0)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_default();

            AnimeListInfo {
                image_url,
                judul,
                anime_name,
                studio,
                score,
                musim_rilis,
                genres,
                sinopsis,
            }
        })
        .collect::<Vec<_>>();

    Ok(AnimeListPage {
        current_page,
        max_page,
        animes,
    })
}

pub fn scrape_ongoing_anime(html: &str) -> Result<AnimeOngoingPage, String> {
    let document = Html::parse_document(html);

    let pagination = document
        .select(&selector_element(".pagenavix"))
        .next()
        .ok_or("Halaman tidak ditemukan".to_string())?;

    let (current_page, max_page): (u32, u32) = pagination
        .select(&selector_element(".page-numbers"))
        .filter(|page_number| page_number.inner_html().parse::<u32>().is_ok())
        .fold((1, 1), |prev, page_number| {
            let page = page_number.inner_html().parse::<u32>().unwrap();

            if page_number
                .value()
                .has_class("current", scraper::CaseSensitivity::CaseSensitive)
            {
                if prev.1 < page {
                    return (page, page);
                }

                return (page, prev.1);
            }

            if prev.1 < page {
                return (prev.0, page);
            }

            prev
        });

    let animes = document
        .select(&selector_element(".venz ul"))
        .next()
        .map(|anime_list| {
            anime_list
                .select(&selector_element("li .detpost"))
                .map(|anime| {
                    let image_url = anime
                        .select(&selector_element(".thumbz img"))
                        .next()
                        .and_then(|image| image.attr("src"))
                        .map(String::from)
                        .unwrap_or_default();

                    let judul = anime
                        .select(&selector_element(".thumbz h2"))
                        .next()
                        .map(|judul| judul.inner_html())
                        .unwrap_or_default();

                    let anime_name = anime
                        .select(&selector_element(".thumb a"))
                        .next()
                        .map(parse_anime_name)
                        .unwrap_or_default();

                    let day = anime
                        .select(&selector_element(".epztipe"))
                        .next()
                        .map(|day| strip_html(&day.inner_html()))
                        .unwrap_or_default();

                    let date = anime
                        .select(&selector_element(".newnime"))
                        .next()
                        .map(|date| date.inner_html())
                        .unwrap_or_default();

                    let latest_episode = anime
                        .select(&selector_element(".epz"))
                        .next()
                        .map(|latest_episode| strip_html(&latest_episode.inner_html()))
                        .unwrap_or_default();

                    AnimeOngoingInfo {
                        image_url,
                        judul,
                        anime_name,
                        day,
                        date,
                        latest_episode,
                    }
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    Ok(AnimeOngoingPage {
        animes,
        current_page,
        max_page,
    })

    // anime list -> .venz ul
    //               anime -> li .detpost
    //                        image_url      -> .thumbz img attr(src)
    //                        judul          -> .thumbz h2 inner_html()
    //                        anime_name     -> .thumb a attr(href) splited
    //                        day            -> .epztipe inner_html() parse_fragment()
    //                        date           -> .newnime inner_html()
    //                        latest_episode -> .epz inner_html() parse_fragment()
}

pub fn scrape_latest_episode(html: &str) -> Result<(bool, EpisodeInformation), String> {
    let document = Html::parse_document(html);
    let mut completed = false;

    let episode_infomation = document
        .select(&selector_element(".episodelist"))
        .nth(1)
        .and_then(|episode_list| episode_list.select(&selector_element("ul")).next())
        .and_then(|ul| ul.select(&selector_element("li")).next())
        .map(|li| {
            let (name, url) = li
                .select(&selector_element("span a"))
                .next()
                .map(|a| {
                    let full_name = a.inner_html();
                    let name_regex =
                        Regex::new(r"(?i)\b(Episode|OVA|ONA|Special)\s+\d+(?:\.\d+)?\b|\bMovie\b")
                            .unwrap();

                    let name = name_regex
                        .find(&full_name)
                        .map(|m| m.as_str())
                        .map(String::from)
                        .unwrap_or(full_name.clone());

                    let url = a
                        .attr("href")
                        .and_then(|href| href.split("/episode/").nth(1))
                        .map(|name| name.trim_end_matches('/').to_owned())
                        .unwrap_or("unknown".to_owned());

                    if full_name.to_lowercase().contains("(end)") {
                        completed = true;
                    }

                    (name, url)
                })
                .unwrap_or_else(|| ("unknown".to_owned(), "unknown".to_owned()));

            let date = li
                .select(&selector_element(".zeebr"))
                .next()
                .map(|zeebr| zeebr.inner_html())
                .unwrap_or("unknown".to_owned());

            EpisodeInformation { name, date, url }
        })
        .ok_or("Episode tidak dapat ditemukan")?;

    Ok((completed, episode_infomation))
}

pub fn scrape_episode_streaming(
    html: &str,
    episode_url: &str,
) -> Result<EpisodeStreamingInformation, String> {
    let document = Html::parse_document(html);

    let full_name = document
        .select(&selector_element(".posttl"))
        .next()
        .map(|e| e.text().collect::<String>())
        .ok_or("Tidak dapat menemukan nama episode")?;

    let (anime_name, anime_folder) = document
        .select(&selector_element(".alert li a"))
        .last()
        .and_then(|e| {
            let name = e
                .select(&selector_element("b"))
                .next()?
                .text()
                .collect::<String>();

            let folder = e
                .attr("href")?
                .split("/anime/")
                .nth(1)?
                .trim_end_matches('/')
                .to_owned();

            (!name.is_empty() && !folder.is_empty()).then_some((name, folder))
        })
        .ok_or("Tidak dapat menemukan infomrasi anime".to_string())?;

    let name_regex =
        Regex::new(r"(?i)\b(Episode|OVA|ONA|Special)\s+\d+(?:\.\d+)?\b|\bMovie\b").unwrap();

    let episode_name = name_regex
        .find(&full_name)
        .map(|m| m.as_str())
        .map(String::from)
        .unwrap_or(full_name.clone());

    let episode_information = EpisodeInformation {
        name: episode_name,
        url: episode_url.to_owned(),
        date: "".to_string(),
    };

    let episodes = document
        .select(&selector_element(".prevnext .fleft select option"))
        .filter_map(|e| {
            let value = e.attr("value")?;

            if !value.starts_with("https") {
                return None;
            }

            let name = e.text().collect::<String>();

            let url = value
                .split("/episode/")
                .nth(1)?
                .trim_end_matches('/')
                .to_owned();

            Some(EpisodeInformation {
                name,
                url,
                date: "".to_string(),
            })
        })
        .collect::<Vec<_>>();

    let default_mirror = document
        .select(&selector_element(
            "#lightsVideo #embed_holder #pembed iframe",
        ))
        .next()
        .and_then(|iframe| iframe.attr("src").map(String::from))
        .ok_or("Tidak dapat mendapatkan default mirror".to_string())?;

    let mirrors = document
        .select(&selector_element(".mirrorstream ul"))
        .map(|e| {
            let resolution = e.attr("class").unwrap_or_default().replace("m", "");
            let mirrors = e
                .select(&selector_element("li a"))
                .filter_map(|a| {
                    let data_content = a.attr("data-content")?;

                    let decoded = general_purpose::STANDARD.decode(data_content).ok()?;

                    let data = from_slice::<MirrorData>(&decoded).ok()?;

                    let name = a.text().collect::<String>();

                    Some(Mirror { name, data })
                })
                .collect::<Vec<_>>();

            ResolutionMirror {
                resolution,
                mirrors,
            }
        })
        .collect::<Vec<_>>();

    Ok(EpisodeStreamingInformation {
        episode_information,
        anime_name,
        anime_folder,
        episodes,
        default_mirror,
        mirrors,
    })
}

// =========================
// Parser
// =========================

fn parse_genre(a: ElementRef<'_>) -> GenreInformation {
    let display = a.inner_html();

    let name = a
        .attr("href")
        .and_then(|href| href.split("/genres/").nth(1))
        .map(|name| name.trim_end_matches('/').to_owned())
        .unwrap_or_else(|| display.to_lowercase().replace(' ', "-"));

    GenreInformation { name, display }
}

fn parse_anime_name(a: ElementRef<'_>) -> String {
    a.attr("href")
        .and_then(|href| href.split("/anime/").nth(1))
        .map(|name| name.trim_end_matches('/').to_owned())
        .unwrap_or_else(|| "unknown".to_owned())
}

fn parse_information(element: ElementRef<'_>) -> Option<String> {
    element
        .select(&selector_element("span"))
        .next()
        .and_then(|span| {
            span.inner_html()
                .split_once(": ")
                .map(|(_, value)| value.to_owned())
        })
}

mod tests {

    #[tokio::test]
    async fn scrape_anime_information_successfully() {
        let base_url = crate::internal_scraper::otakudesu::DEFAULT_BASE_URL;

        let anime_fetch = crate::services::http_client::fetch_html(&format!(
            "{base_url}/anime/super-yani-suu-futari-sub-indo"
        ))
        .await;

        assert!(anime_fetch.is_ok());

        let anime_information = crate::internal_scraper::otakudesu::scrape_anime_information(
            &anime_fetch.unwrap(),
            std::path::Path::new("/super-yani-suu-futari-sub-indo").to_path_buf(),
        );

        assert!(anime_information.is_ok());

        println!("Anime Information: {:#?}", anime_information.unwrap());
    }

    #[tokio::test]
    async fn scrape_search_anime_succesesfully() {
        let base_url = crate::internal_scraper::otakudesu::DEFAULT_BASE_URL;

        let search_html = crate::services::http_client::fetch_html_with_query(
            base_url,
            &[("s", "ao"), ("post_type", "anime")],
        )
        .await;

        assert!(search_html.is_ok());

        let search_result =
            crate::internal_scraper::otakudesu::scrape_search_result(&search_html.unwrap());

        assert!(search_result.is_ok());

        println!("Search Result: {:#?}", search_result.unwrap());
    }

    #[tokio::test]
    async fn scrape_animes_list_succesesfully() {
        let base_url = crate::internal_scraper::otakudesu::DEFAULT_BASE_URL;

        let animes_by_genre_html =
            crate::services::http_client::fetch_html(&format!("{base_url}/genres/action")).await;

        assert!(animes_by_genre_html.is_ok());

        let animes_by_genre_result =
            crate::internal_scraper::otakudesu::scrape_animes_list(&animes_by_genre_html.unwrap());

        assert!(animes_by_genre_result.is_ok());

        println!(
            "Animes By Genre Result: {:#?}",
            animes_by_genre_result.unwrap()
        );
    }

    #[tokio::test]
    async fn scrape_ongoing_anime_succesesfully() {
        let base_url = crate::internal_scraper::otakudesu::DEFAULT_BASE_URL;

        let ongoing_anime_html =
            crate::services::http_client::fetch_html(&format!("{base_url}/ongoing-anime")).await;

        assert!(ongoing_anime_html.is_ok());

        let ongoing_anime_result =
            crate::internal_scraper::otakudesu::scrape_ongoing_anime(&ongoing_anime_html.unwrap());

        assert!(ongoing_anime_result.is_ok());

        println!("Ongoing Anime Result: {:#?}", ongoing_anime_result.unwrap());
    }

    #[tokio::test]
    async fn scrape_latest_episode_succesesfully() {
        let base_url = crate::internal_scraper::otakudesu::DEFAULT_BASE_URL;

        let latest_episode_html = crate::services::http_client::fetch_html(&format!(
            "{base_url}/anime/super-yani-suu-futari-sub-indo"
        ))
        .await;

        assert!(latest_episode_html.is_ok());

        let latest_episode_result = crate::internal_scraper::otakudesu::scrape_latest_episode(
            &latest_episode_html.unwrap(),
        );

        assert!(latest_episode_result.is_ok());

        println!(
            "Latest Episode Result: {:#?}",
            latest_episode_result.unwrap()
        );
    }

    #[tokio::test]
    async fn scrape_episode_streaming_succesesfully() {
        let base_url = crate::internal_scraper::otakudesu::DEFAULT_BASE_URL;

        let episode_streaming_html = crate::services::http_client::fetch_html(&format!(
            "{base_url}/episode/mskmctn-episode-7-sub-indo",
        ))
        .await;

        assert!(episode_streaming_html.is_ok());

        let scrape_episode_streaming = crate::internal_scraper::otakudesu::scrape_episode_streaming(
            &episode_streaming_html.unwrap(),
            &"episode_streaming_html",
        );

        println!("{:?}", scrape_episode_streaming);

        assert!(scrape_episode_streaming.is_ok());

        println!(
            "Episode Streaming Result: {:#?}",
            scrape_episode_streaming.unwrap()
        );
    }
}
