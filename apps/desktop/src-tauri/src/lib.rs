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

/// Start a native macOS file drag-out from JS.
///
/// `x` and `y` are the cursor position in CSS logical pixels (clientX/clientY)
/// at the moment onDragStart fired. `window_height` is window.innerHeight.
///
/// We create a synthetic NSLeftMouseDown event at these coordinates rather than
/// reading NSApp.currentEvent — by the time the async Tauri IPC bridge delivers
/// this call, currentEvent may already be mouseUp, which caused dragFile to
/// silently fail on every second drag attempt.
#[tauri::command]
fn start_native_file_drag(
    window: WebviewWindow,
    path: String,
    x: f64,
    y: f64,
    window_height: f64,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::NSWindow;
        use cocoa::base::{id, nil, NO};
        use cocoa::foundation::{NSAutoreleasePool, NSPoint, NSRect, NSSize, NSString};
        use objc::{class, msg_send, sel, sel_impl};
        use std::path::Path;

        if !Path::new(&path).exists() {
            return Err(format!("Drag path does not exist: {}", path));
        }

        let window_clone = window.clone();

        // Flip Y: JS uses top-left origin; AppKit uses bottom-left origin.
        let appkit_x = x;
        let appkit_y = window_height - y;

        // Fire-and-forget — dragFile blocks the main thread for the whole drag
        // session, so we must not await it or the next invoke will queue behind
        // it and fire with a stale event.
        let _ = window.run_on_main_thread(move || {
            let ns_window = match window_clone.ns_window() {
                Ok(w) => w as id,
                Err(e) => {
                    eprintln!("start_native_file_drag: ns_window error: {}", e);
                    return;
                }
            };

            unsafe {
                let _pool = NSAutoreleasePool::new(nil);
                let content_view: id = ns_window.contentView();

                if content_view == nil {
                    eprintln!("start_native_file_drag: no content view");
                    return;
                }

                let mouse_point = NSPoint::new(appkit_x, appkit_y);

                // Synthetic NSLeftMouseDown at the captured cursor position.
                // NSLeftMouseDown = 1; windowNumber is NSInteger (i64 on 64-bit).
                let window_number: i64 = msg_send![ns_window, windowNumber];
                let synthetic_event: id = msg_send![
                    class!(NSEvent),
                    mouseEventWithType: 1_u64   // NSLeftMouseDown
                    location: mouse_point
                    modifierFlags: 0_u64
                    timestamp: 0.0_f64
                    windowNumber: window_number
                    context: nil
                    eventNumber: 0_i64
                    clickCount: 1_i64
                    pressure: 1.0_f32
                ];

                if synthetic_event == nil {
                    eprintln!("start_native_file_drag: could not create synthetic event");
                    return;
                }

                let path_ns = NSString::alloc(nil).init_str(&path);

                // Centre the drag rect on the cursor.
                // slideBack: NO prevents the fly-back animation on drop failure.
                let drag_rect = NSRect::new(
                    NSPoint::new(appkit_x - 16.0, appkit_y - 16.0),
                    NSSize::new(32.0, 32.0),
                );

                let started: bool = msg_send![content_view,
                    dragFile: path_ns
                    fromRect: drag_rect
                    slideBack: NO
                    event: synthetic_event
                ];

                if !started {
                    eprintln!("start_native_file_drag: dragFile:fromRect:slideBack:event: returned NO");
                }
            }
        });

        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, path, x, y, window_height);
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
