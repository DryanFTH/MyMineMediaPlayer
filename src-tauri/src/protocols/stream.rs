use std::{
    collections::HashMap,
    net::SocketAddr,
    path::{Path, PathBuf},
    sync::Arc,
};

use axum::{
    Router,
    body::Body,
    extract::{Path as AxumPath, State},
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
    routing::get,
};
use tokio::{
    fs::File,
    io::{AsyncReadExt, AsyncSeekExt, BufReader},
    sync::RwLock,
};
use tokio_util::io::ReaderStream;

const READ_BUFFER_SIZE: usize = 128 * 1024; // 128 KB

pub type StreamRoots = Arc<RwLock<HashMap<String, PathBuf>>>;

#[derive(Clone)]
struct ServerState {
    roots: StreamRoots,
}

fn is_path_allowed(path: &Path, allowed_root: &Path) -> bool {
    let Ok(canonical_path) = path.canonicalize() else {
        return false;
    };
    let Ok(canonical_root) = allowed_root.canonicalize() else {
        return false;
    };
    canonical_path.starts_with(canonical_root)
}

fn parse_range(range: &str, file_size: u64) -> Option<(u64, u64)> {
    let range = range.strip_prefix("bytes=")?;
    let mut parts = range.splitn(2, '-');
    let start_str = parts.next()?;
    let end_str = parts.next().unwrap_or("");

    let (start, end) = if start_str.is_empty() {
        let suffix_len: u64 = end_str.parse().ok()?;
        (file_size.saturating_sub(suffix_len), file_size - 1)
    } else {
        let start: u64 = start_str.parse().ok()?;
        let end: u64 = if end_str.is_empty() {
            file_size - 1
        } else {
            end_str.parse().ok()?
        };
        (start, end)
    };

    if start > end || start >= file_size {
        return None;
    }

    Some((start, end.min(file_size - 1)))
}

async fn resolve_path(
    state: &ServerState,
    root_key: &str,
    encoded_rel_path: &str,
) -> Result<PathBuf, StatusCode> {
    let allowed_root = {
        let roots = state.roots.read().await;
        roots.get(root_key).cloned().ok_or(StatusCode::NOT_FOUND)?
    };

    let decoded = percent_encoding::percent_decode_str(encoded_rel_path)
        .decode_utf8()
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    let full_path = allowed_root.join(decoded.as_ref());

    if !is_path_allowed(&full_path, &allowed_root) {
        return Err(StatusCode::FORBIDDEN);
    }

    Ok(full_path)
}

async fn stream_handler(
    State(state): State<ServerState>,
    AxumPath((root_key, rel_path)): AxumPath<(String, String)>,
    headers: HeaderMap,
) -> Response {
    let path = match resolve_path(&state, &root_key, &rel_path).await {
        Ok(p) => p,
        Err(status) => return status.into_response(),
    };

    let mut file = match File::open(&path).await {
        Ok(f) => f,
        Err(_) => return StatusCode::NOT_FOUND.into_response(),
    };

    let file_size = match file.metadata().await {
        Ok(m) => m.len(),
        Err(_) => return StatusCode::INTERNAL_SERVER_ERROR.into_response(),
    };

    let mime_type = mime_guess::from_path(&path)
        .first()
        .unwrap_or(mime_guess::mime::APPLICATION_OCTET_STREAM)
        .to_string();

    let range_header = headers.get(header::RANGE).and_then(|v| v.to_str().ok());

    let (start, end, is_partial) = match range_header.and_then(|r| parse_range(r, file_size)) {
        Some((s, e)) => (s, e, true),
        None => (0, file_size.saturating_sub(1), false),
    };

    let length = end - start + 1;

    if file.seek(std::io::SeekFrom::Start(start)).await.is_err() {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    }

    let buffered = BufReader::with_capacity(READ_BUFFER_SIZE, file);
    let limited_reader = buffered.take(length);
    let stream = ReaderStream::with_capacity(limited_reader, READ_BUFFER_SIZE);
    let body = Body::from_stream(stream);

    let status = if is_partial || length < file_size {
        StatusCode::PARTIAL_CONTENT
    } else {
        StatusCode::OK
    };

    let mut response = Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, mime_type)
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CONTENT_LENGTH, length.to_string())
        .header(header::CACHE_CONTROL, "no-cache")
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*");

    if status == StatusCode::PARTIAL_CONTENT {
        response = response.header(
            header::CONTENT_RANGE,
            format!("bytes {start}-{end}/{file_size}"),
        );
    }

    response.body(body).unwrap().into_response()
}

async fn head_handler(
    State(state): State<ServerState>,
    AxumPath((root_key, rel_path)): AxumPath<(String, String)>,
) -> Response {
    let path = match resolve_path(&state, &root_key, &rel_path).await {
        Ok(p) => p,
        Err(status) => return status.into_response(),
    };

    let metadata = match tokio::fs::metadata(&path).await {
        Ok(m) => m,
        Err(_) => return StatusCode::NOT_FOUND.into_response(),
    };

    let mime_type = mime_guess::from_path(&path)
        .first()
        .unwrap_or(mime_guess::mime::APPLICATION_OCTET_STREAM)
        .to_string();

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime_type)
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CONTENT_LENGTH, metadata.len().to_string())
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(Body::empty())
        .unwrap()
        .into_response()
}

pub async fn spawn(initial_roots: HashMap<String, PathBuf>) -> (u16, StreamRoots) {
    let roots: StreamRoots = Arc::new(RwLock::new(initial_roots));
    let state = ServerState {
        roots: roots.clone(),
    };

    let app = Router::new()
        .route(
            "/stream/{root}/{*path}",
            get(stream_handler).head(head_handler),
        )
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("failed to bind local stream server");

    let addr: SocketAddr = listener.local_addr().unwrap();

    tauri::async_runtime::spawn(async move {
        if let Err(err) = axum::serve(listener, app).await {
            log::error!("stream server stopped: {err}");
        }
    });

    (addr.port(), roots)
}
