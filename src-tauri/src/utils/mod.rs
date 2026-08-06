use std::{error::Error, io, path::Path};

use scraper::Html;

pub mod file;
pub mod selector;
pub mod time;

pub fn _word_after_substring<'a>(text: &'a str, target: &str) -> Option<&'a str> {
    let pos = text.find(target)?;
    let after = &text[pos + target.len()..];
    after.trim_start().split_whitespace().next()
}

pub fn strip_html(html: &str) -> String {
    Html::parse_fragment(html)
        .root_element()
        .text()
        .collect::<String>()
}

pub fn title_case(s: &str) -> String {
    s.split_whitespace()
        .map(|word| {
            let mut chars = word.chars();

            match chars.next() {
                Some(first) => first.to_uppercase().chain(chars).collect(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn sanitize_file_name(new_name: &str) -> Result<String, Box<dyn Error>> {
    let trimmed = new_name.trim();

    if trimmed.is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidFilename,
            "nama file tidak boleh kosong",
        )
        .into());
    }

    // Tolak kalau mengandung separator path sama sekali
    if trimmed.contains('/') || trimmed.contains('\\') {
        return Err(io::Error::new(
            io::ErrorKind::InvalidFilename,
            format!("nama file tidak boleh mengandung path separator: {trimmed}"),
        )
        .into());
    }

    // Tolak karakter ilegal umum di Windows & Unix filesystem.
    const ILLEGAL_CHARS: &[char] = &[':', '*', '?', '"', '<', '>', '|', '\0'];
    if trimmed.chars().any(|c| ILLEGAL_CHARS.contains(&c)) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidFilename,
            format!("nama file mengandung karakter ilegal: {trimmed}"),
        )
        .into());
    }

    // Tolak "." dan ".." jadi nama utuh.
    if trimmed == "." || trimmed == ".." {
        return Err(io::Error::new(
            io::ErrorKind::InvalidFilename,
            format!("nama file tidak valid: {trimmed}"),
        )
        .into());
    }

    // Pastikan ekstensi .mp4 selalu ada, apapun input user.
    let has_mp4_ext = Path::new(trimmed)
        .extension()
        .map(|ext| ext.eq_ignore_ascii_case("mp4"))
        .unwrap_or(false);

    let final_name = if has_mp4_ext {
        trimmed.to_string()
    } else {
        format!("{trimmed}.mp4")
    };

    Ok(final_name)
}
