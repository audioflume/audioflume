use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Mutex, OnceLock},
};
use tauri::{AppHandle, Emitter};

static WATCHERS: OnceLock<Mutex<HashMap<String, RecommendedWatcher>>> = OnceLock::new();

fn watchers() -> &'static Mutex<HashMap<String, RecommendedWatcher>> {
    WATCHERS.get_or_init(|| Mutex::new(HashMap::new()))
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;

        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;

        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;

        return Ok(());
    }
}

#[tauri::command]
fn watch_sync_folder(app: AppHandle, path: String) -> Result<(), String> {
    let watch_path = PathBuf::from(path.clone());

    if !watch_path.exists() {
        return Err(format!("Sync folder does not exist: {}", path));
    }

    stop_sync_folder_watch(path.clone())?;

    let emit_path = path.clone();
    let mut watcher = RecommendedWatcher::new(
        move |result: Result<Event, notify::Error>| match result {
            Ok(event) => {
                let paths: Vec<String> = event
                    .paths
                    .iter()
                    .map(|path| path.to_string_lossy().to_string())
                    .collect();

                if paths.iter().any(|path| path.contains("/_filmwave/")) {
                    return;
                }

                let _ = app.emit(
                    "filmwave://local-folder-change",
                    serde_json::json!({
                        "syncFolder": emit_path,
                        "kind": format!("{:?}", event.kind),
                        "paths": paths,
                    }),
                );
            }
            Err(error) => {
                let _ = app.emit(
                    "filmwave://local-folder-watch-error",
                    serde_json::json!({
                        "syncFolder": emit_path,
                        "error": error.to_string(),
                    }),
                );
            }
        },
        Config::default(),
    )
    .map_err(|error| error.to_string())?;

    watcher
        .watch(&watch_path, RecursiveMode::Recursive)
        .map_err(|error| error.to_string())?;

    watchers()
        .lock()
        .map_err(|error| error.to_string())?
        .insert(path, watcher);

    Ok(())
}

#[tauri::command]
fn stop_sync_folder_watch(path: String) -> Result<(), String> {
    let mut active_watchers = watchers().lock().map_err(|error| error.to_string())?;

    active_watchers.remove(&path);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_drag::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            open_path,
            watch_sync_folder,
            stop_sync_folder_watch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
