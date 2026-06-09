use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Mutex, OnceLock},
};
use tauri::{AppHandle, Emitter, WebviewWindow};

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
fn start_native_file_drag(window: WebviewWindow, path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::NSWindow;
        use cocoa::base::{id, nil, NO};
        use cocoa::foundation::{NSAutoreleasePool, NSPoint, NSRect, NSSize, NSString};
        use objc::{msg_send, sel, sel_impl};
        use std::path::Path;

        if !Path::new(&path).exists() {
            return Err(format!("Drag path does not exist: {}", path));
        }

        let window_clone = window.clone();

        // dragFile:fromRect:slideBack:event: blocks the main thread for the
        // entire drag session. We dispatch it to main via run_on_main_thread
        // so it runs during the live mouse event, but we do NOT await the
        // result — the command returns immediately to JS so the next drag
        // attempt is never blocked by the previous one completing.
        let _ = window.run_on_main_thread(move || {
            let ns_window = match window_clone.ns_window() {
                Ok(w) => w as id,
                Err(e) => {
                    eprintln!("Could not access native window: {}", e);
                    return;
                }
            };

            unsafe {
                let _pool = NSAutoreleasePool::new(nil);
                let content_view: id = ns_window.contentView();

                if content_view == nil {
                    eprintln!("Could not access native window content view.");
                    return;
                }

                let event: id = msg_send![ns_window, currentEvent];

                if event == nil {
                    eprintln!("No current event on window.");
                    return;
                }

                let path_ns_string: id = NSString::alloc(nil).init_str(&path);

                // Use the cursor position for the drag rect so the system
                // ghost appears at the cursor. slideBack: NO prevents the
                // fly-back animation when the drag is cancelled.
                let window_point: NSPoint = msg_send![event, locationInWindow];
                let drag_rect = NSRect::new(
                    NSPoint::new(window_point.x - 16.0, window_point.y - 16.0),
                    NSSize::new(32.0, 32.0),
                );

                let _started: bool = msg_send![content_view,
                    dragFile: path_ns_string
                    fromRect: drag_rect
                    slideBack: NO
                    event: event
                ];
            }
        });

        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window;
        let _ = path;
        Err("Native drag-out is currently implemented for macOS only.".to_string())
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
        .invoke_handler(tauri::generate_handler![
            greet,
            open_path,
            start_native_file_drag,
            watch_sync_folder,
            stop_sync_folder_watch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
