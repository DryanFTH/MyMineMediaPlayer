use std::collections::HashMap;
use std::sync::Arc;
use std::sync::atomic::AtomicBool;
use tokio::sync::Mutex;

use crate::providers::Resolution;

pub struct DownloadState {
    pub cancel_flags: Mutex<HashMap<String, HashMap<Resolution, Arc<AtomicBool>>>>,
}

impl DownloadState {
    pub fn new() -> Self {
        Self {
            cancel_flags: Mutex::new(HashMap::new()),
        }
    }
}
