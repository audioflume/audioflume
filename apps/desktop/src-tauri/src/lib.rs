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

#[cfg(target_os = "macos")]
fn start_native_file_drag_macos(window: WebviewWindow, path: String) -> Result<(), String> {
    use cocoa::appkit::{NSApp, NSEventType, NSWindow};
    use cocoa::base::{id, nil};
    use cocoa::foundation::{NSAutoreleasePool, NSArray, NSPoint, NSRect, NSSize, NSString};
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

        // Use NSApp currentEvent so we always get the most recent mouse event,
        // not whatever stale event the window last processed. Also verify it is
        // actually a mouse-down/mouse-dragged before proceeding — this is what
        // caused every-other-drag to fail (window.currentEvent was a mouseUp).
        let ns_app: id = NSApp();
        let event: id = msg_send![ns_app, currentEvent];

        if event == nil {
            return Err("No current event available.".to_string());
        }

        let event_type: NSEventType = msg_send![event, type];
        let is_mouse_event = matches!(
            event_type,
            NSEventType::NSLeftMouseDown
                | NSEventType::NSLeftMouseDragged
                | NSEventType::NSRightMouseDown
                | NSEventType::NSRightMouseDragged
                | NSEventType::NSOtherMouseDown
                | NSEventType::NSOtherMouseDragged
        );

        if !is_mouse_event {
            return Err(format!(
                "Current event is not a mouse event (type {:?}); drag cancelled.",
                event_type
            ));
        }

        let window_point: NSPoint = msg_send![event, locationInWindow];
        let view_point: NSPoint =
            msg_send![content_view, convertPoint: window_point fromView: nil];

        // Build a file URL string for the pasteboard writer.
        let file_url_string = format!("file://{}", path);
        let url_ns_string: id = NSString::alloc(nil).init_str(&file_url_string);
        let file_url: id = msg_send![class!(NSURL), URLWithString: url_ns_string];

        // Create a NSDraggingItem backed by the file URL. Using this API lets
        // us supply a transparent 1×1 drag image so macOS does not render its
        // own file-icon ghost — our JS DragGhostOverlay is the only visual.
        let dragging_item: id = msg_send![class!(NSDraggingItem), alloc];
        let dragging_item: id = msg_send![dragging_item, initWithPasteboardWriter: file_url];

        let drag_image: id = msg_send![class!(NSImage), alloc];
        let drag_image: id = msg_send![drag_image, initWithSize: NSSize::new(1.0, 1.0)];
        let drag_frame = NSRect::new(
            NSPoint::new(view_point.x, view_point.y),
            NSSize::new(1.0, 1.0),
        );
        let _: () = msg_send![dragging_item,
            setDraggingFrame: drag_frame
            contents: drag_image
        ];

        let items_array: id = NSArray::arrayWithObject(nil, dragging_item);

        // beginDraggingSessionWithItems does not block — hands off to macOS.
        let _session: id = msg_send![content_view,
            beginDraggingSessionWithItems: items_array
            event: event
            source: content_view
        ];
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
