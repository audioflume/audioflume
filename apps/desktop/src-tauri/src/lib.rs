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

static DRAG_SOURCE_CLASS: OnceLock<usize> = OnceLock::new();

#[cfg(target_os = "macos")]
fn get_drag_source_class() -> *const objc::runtime::Class {
    use objc::{
        declare::ClassDecl,
        runtime::{Class, Object, Sel},
        sel, sel_impl,
    };
    use cocoa::base::id;

    let addr = DRAG_SOURCE_CLASS.get_or_init(|| {
        let superclass = Class::get("NSObject").expect("NSObject must exist");
        let mut decl =
            ClassDecl::new("FWFileDragSource", superclass).expect("class name must be unique");

        extern "C" fn source_operation_mask(
            _this: &Object,
            _sel: Sel,
            _session: id,
            _context: u64,
        ) -> u64 {
            u64::MAX // NSDragOperationEvery
        }

        unsafe {
            decl.add_method(
                sel!(draggingSession:sourceOperationMaskForDraggingContext:),
                source_operation_mask as extern "C" fn(&Object, Sel, id, u64) -> u64,
            );
        }

        decl.register() as *const _ as usize
    });

    *addr as *const objc::runtime::Class
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
        use cocoa::base::{id, nil};
        use cocoa::foundation::{NSAutoreleasePool, NSArray, NSPoint, NSRect, NSSize, NSString};
        use objc::{class, msg_send, sel, sel_impl};
        use std::path::Path;

        if !Path::new(&path).exists() {
            return Err(format!("Drag path does not exist: {}", path));
        }

        let window_clone = window.clone();
        let appkit_x = x;
        let appkit_y = window_height - y;

        let _ = window.run_on_main_thread(move || {
            let ns_window = match window_clone.ns_window() {
                Ok(w) => w as id,
                Err(e) => {
                    eprintln!("[fw-drag] ns_window error: {}", e);
                    return;
                }
            };

            unsafe {
                let _pool = NSAutoreleasePool::new(nil);
                let content_view: id = ns_window.contentView();
                if content_view == nil {
                    eprintln!("[fw-drag] no content view");
                    return;
                }

                // Use real system uptime as the event timestamp — a synthetic
                // event with timestamp 0.0 may be rejected by AppKit as stale.
                let process_info: id = msg_send![class!(NSProcessInfo), processInfo];
                let timestamp: f64 = msg_send![process_info, systemUptime];

                let mouse_point = NSPoint::new(appkit_x, appkit_y);
                let window_number: i64 = msg_send![ns_window, windowNumber];
                let synthetic_event: id = msg_send![
                    class!(NSEvent),
                    mouseEventWithType: 1_u64   // NSLeftMouseDown = 1
                    location: mouse_point
                    modifierFlags: 0_u64
                    timestamp: timestamp
                    windowNumber: window_number
                    context: nil
                    eventNumber: 0_i64
                    clickCount: 1_i64
                    pressure: 1.0_f32
                ];

                if synthetic_event == nil {
                    eprintln!("[fw-drag] could not create synthetic event");
                    return;
                }
                eprintln!("[fw-drag] synthetic event created at ({:.1}, {:.1}) ts={:.3}", appkit_x, appkit_y, timestamp);

                // NSURL provides public.file-url pasteboard type for Finder.
                let path_ns: id = NSString::alloc(nil).init_str(&path);
                let file_url: id = msg_send![class!(NSURL), fileURLWithPath: path_ns];
                if file_url == nil {
                    eprintln!("[fw-drag] could not create file URL");
                    return;
                }

                let dragging_item: id = msg_send![class!(NSDraggingItem), alloc];
                let dragging_item: id =
                    msg_send![dragging_item, initWithPasteboardWriter: file_url];

                // File's actual Finder icon as drag preview.
                let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
                let icon: id = msg_send![workspace, iconForFile: path_ns];
                let icon_size = 64.0_f64;
                let drag_frame = NSRect::new(
                    NSPoint::new(appkit_x - icon_size / 2.0, appkit_y - icon_size / 2.0),
                    NSSize::new(icon_size, icon_size),
                );
                let _: () = msg_send![dragging_item,
                    setDraggingFrame: drag_frame
                    contents: icon
                ];

                let items: id = NSArray::arrayWithObject(nil, dragging_item);

                // FWFileDragSource returns NSDragOperationEvery so external
                // drop targets (Finder, Desktop) accept the drag.
                let drag_source_cls = get_drag_source_class();
                let drag_source: id = msg_send![drag_source_cls, new];

                // Try initiating from a plain NSView added to the window.
                // WKWebView may intercept beginDraggingSessionWithItems when
                // called on its own content view — a separate plain NSView
                // bypasses that.
                let overlay: id = msg_send![class!(NSView), alloc];
                let overlay_frame = NSRect::new(
                    NSPoint::new(appkit_x - 1.0, appkit_y - 1.0),
                    NSSize::new(2.0, 2.0),
                );
                let overlay: id = msg_send![overlay, initWithFrame: overlay_frame];
                let _: () = msg_send![content_view, addSubview: overlay];

                let session: id = msg_send![overlay,
                    beginDraggingSessionWithItems: items
                    event: synthetic_event
                    source: drag_source
                ];

                if session == nil {
                    eprintln!("[fw-drag] beginDraggingSessionWithItems returned nil — drag failed to start");
                } else {
                    eprintln!("[fw-drag] drag session started OK");
                }

                // Remove the overlay; the drag session continues independently.
                let _: () = msg_send![overlay, removeFromSuperview];
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
