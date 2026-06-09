use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Mutex, OnceLock},
};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

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
        use cocoa::appkit::{NSApp, NSWindow};
        use cocoa::base::{id, nil};
        use cocoa::foundation::{NSAutoreleasePool, NSArray, NSPoint, NSRect, NSSize, NSString};
        use objc::{class, msg_send, sel, sel_impl};
        use std::path::Path;

        if !Path::new(&path).exists() {
            return Err(format!("Drag path does not exist: {}", path));
        }

        // beginDraggingSessionWithItems must be called synchronously on the
        // main thread during a live mouse event. Tauri invoke handlers run on
        // a background thread, so we dispatch back to main via run_on_main_thread.
        window
            .run_on_main_thread(move || {
                let ns_window = match window.ns_window() {
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

                    let ns_app: id = NSApp();
                    let event: id = msg_send![ns_app, currentEvent];

                    if event == nil {
                        eprintln!("No current event available.");
                        return;
                    }

                    let window_point: NSPoint = msg_send![event, locationInWindow];
                    let view_point: NSPoint =
                        msg_send![content_view, convertPoint: window_point fromView: nil];

                    let file_url_string = format!("file://{}", path);
                    let url_ns_string: id = NSString::alloc(nil).init_str(&file_url_string);
                    let file_url: id =
                        msg_send![class!(NSURL), URLWithString: url_ns_string];

                    // 1×1 transparent drag image suppresses the macOS system ghost.
                    let dragging_item: id = msg_send![class!(NSDraggingItem), alloc];
                    let dragging_item: id =
                        msg_send![dragging_item, initWithPasteboardWriter: file_url];

                    let drag_image: id = msg_send![class!(NSImage), alloc];
                    let drag_image: id =
                        msg_send![drag_image, initWithSize: NSSize::new(1.0, 1.0)];
                    let drag_frame = NSRect::new(
                        NSPoint::new(view_point.x, view_point.y),
                        NSSize::new(1.0, 1.0),
                    );
                    let _: () = msg_send![dragging_item,
                        setDraggingFrame: drag_frame
                        contents: drag_image
                    ];

                    let items_array: id = NSArray::arrayWithObject(nil, dragging_item);

                    let _session: id = msg_send![content_view,
                        beginDraggingSessionWithItems: items_array
                        event: event
                        source: content_view
                    ];
                }
            })
            .map_err(|e| format!("run_on_main_thread failed: {}", e))?;

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
