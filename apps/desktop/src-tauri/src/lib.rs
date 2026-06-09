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

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
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

#[cfg(target_os = "macos")]
fn start_native_file_drag_macos(window: WebviewWindow, path: String) -> Result<(), String> {
    use cocoa::appkit::NSWindow;
    use cocoa::base::{id, nil, YES};
    use cocoa::foundation::{NSArray, NSAutoreleasePool, NSPoint, NSRect, NSSize, NSString, NSURL};
    use objc::{class, msg_send, sel, sel_impl};
    use std::path::Path;

    if !Path::new(&path).exists() {
        return Err(format!("Drag path does not exist: {}", path));
    }

    let ns_window = window
        .ns_window()
        .map_err(|error| format!("Could not access native window: {}", error))? as id;

    unsafe {
        let _pool = NSAutoreleasePool::new(nil);
        let content_view: id = ns_window.contentView();

        if content_view == nil {
            return Err("Could not access native window content view.".to_string());
        }

        let path_string = NSString::alloc(nil).init_str(&path);
        let file_url: id = NSURL::fileURLWithPath_(nil, path_string);
        let absolute_string: id = msg_send![file_url, absoluteString];
        let file_url_type = NSString::alloc(nil).init_str("public.file-url");

        let pasteboard_item_class = class!(NSPasteboardItem);
        let pasteboard_item: id = msg_send![pasteboard_item_class, alloc];
        let pasteboard_item: id = msg_send![pasteboard_item, init];
        let wrote: bool = msg_send![pasteboard_item, setString: absolute_string forType: file_url_type];

        if !wrote {
            return Err("Could not prepare drag pasteboard item.".to_string());
        }

        let dragging_item_class = class!(NSDraggingItem);
        let dragging_item: id = msg_send![dragging_item_class, alloc];
        let dragging_item: id = msg_send![dragging_item, initWithPasteboardWriter: pasteboard_item];

        let workspace_class = class!(NSWorkspace);
        let workspace: id = msg_send![workspace_class, sharedWorkspace];
        let drag_image: id = msg_send![workspace, iconForFile: path_string];
        let _: () = msg_send![drag_image, setSize: NSSize::new(64.0, 64.0)];

        let current_event: id = msg_send![ns_window, currentEvent];

        if current_event == nil {
            return Err("Could not access current drag event.".to_string());
        }

        let window_point: NSPoint = msg_send![current_event, locationInWindow];
        let view_point: NSPoint = msg_send![content_view, convertPoint: window_point fromView: nil];
        let drag_frame = NSRect::new(
            NSPoint::new(view_point.x - 32.0, view_point.y - 32.0),
            NSSize::new(64.0, 64.0),
        );
        let _: () = msg_send![dragging_item, setDraggingFrame: drag_frame contents: drag_image];

        let modifier_flags: u64 = msg_send![current_event, modifierFlags];
        let timestamp: f64 = msg_send![current_event, timestamp];
        let event_number: i64 = msg_send![current_event, eventNumber];
        let window_number: i64 = msg_send![ns_window, windowNumber];
        let event_class = class!(NSEvent);
        let drag_event: id = msg_send![event_class,
            mouseEventWithType: 6u64
            location: window_point
            modifierFlags: modifier_flags
            timestamp: timestamp
            windowNumber: window_number
            context: nil
            eventNumber: event_number
            clickCount: 1i64
            pressure: 1.0f64
        ];

        if drag_event == nil {
            return Err("Could not create native drag event.".to_string());
        }

        let dragging_items: id = NSArray::arrayWithObject(nil, dragging_item);
        let session: id = msg_send![content_view, beginDraggingSessionWithItems: dragging_items event: drag_event source: content_view];
        let _: () = msg_send![session, setAnimatesToStartingPositionsOnCancelOrFail: YES];
    }

    Ok(())
}

#[tauri::command]
fn start_native_file_drag(window: WebviewWindow, path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        return start_native_file_drag_macos(window, path);
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
