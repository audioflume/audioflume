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

// Tracks whether we have already patched WKWebView's drag source operation mask.
static DRAG_MASK_PATCHED: OnceLock<()> = OnceLock::new();

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

/// Patch WKWebView's NSDraggingSource operation mask to allow external drops.
///
/// WKWebView's content view implements `draggingSession:sourceOperationMaskForDraggingContext:`
/// and returns `NSDragOperationNone` for `NSDraggingContextOutsideApplication`.
/// This causes the macOS Desktop (an external/Finder drop target) to show a
/// "no drop" cursor and reject drops from our app.
///
/// We replace that method's implementation on WKWebView's actual runtime class
/// with one that returns `NSDragOperationEvery`, making all external targets —
/// including the Desktop — accept drops from our drag sessions.
///
/// This is a one-time patch applied to the class (not the instance), so it
/// affects all future drag sessions from this WKWebView. The patch is done
/// lazily on the first drag and is idempotent.
#[cfg(target_os = "macos")]
unsafe fn patch_wkwebview_drag_mask(content_view: cocoa::base::id) {
    use cocoa::base::id;
    use objc::{
        runtime::{Class, Method, Object, Sel},
        sel, sel_impl,
    };
    use std::ffi::CStr;

    // External C functions from the ObjC runtime not exposed by the objc crate.
    extern "C" {
        fn object_getClass(obj: id) -> *const Class;
        fn class_getInstanceMethod(cls: *const Class, sel: Sel) -> *mut Method;
        fn method_setImplementation(
            method: *mut Method,
            imp: extern "C" fn(*mut Object, Sel, id, u64) -> u64,
        ) -> extern "C" fn(*mut Object, Sel, id, u64) -> u64;
        fn class_addMethod(
            cls: *const Class,
            name: Sel,
            imp: extern "C" fn(*mut Object, Sel, id, u64) -> u64,
            types: *const i8,
        ) -> bool;
    }

    // The replacement: return NSDragOperationEvery for every dragging context,
    // including NSDraggingContextOutsideApplication (Desktop / other apps).
    extern "C" fn drag_mask_every(
        _this: *mut Object,
        _sel: Sel,
        _session: id,
        _context: u64,
    ) -> u64 {
        u64::MAX // NSDragOperationEvery
    }

    let cls = object_getClass(content_view);
    if cls.is_null() {
        return;
    }

    let target_sel = sel!(draggingSession:sourceOperationMaskForDraggingContext:);

    // Try replacing an existing implementation first.
    let method = class_getInstanceMethod(cls, target_sel);
    if !method.is_null() {
        method_setImplementation(method, drag_mask_every);
        eprintln!("[fw-drag] patched existing draggingSession:sourceOperationMaskForDraggingContext: on WKWebView class");
    } else {
        // The method doesn't exist — add it.
        // Type encoding: Q (NSUInteger return) @ (self) : (SEL) @ (session) q (NSInteger context)
        let types = b"Q@:@q\0";
        let added = class_addMethod(cls, target_sel, drag_mask_every, types.as_ptr() as *const i8);
        eprintln!(
            "[fw-drag] added draggingSession:sourceOperationMaskForDraggingContext: to WKWebView class: {}",
            added
        );
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
        use cocoa::base::{id, nil, NO};
        use cocoa::foundation::{NSAutoreleasePool, NSPoint, NSRect, NSSize, NSString};
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

                // Patch WKWebView's drag source operation mask once per session.
                // This makes external drop targets (Finder, Desktop) accept drops.
                DRAG_MASK_PATCHED.get_or_init(|| {
                    patch_wkwebview_drag_mask(content_view);
                });

                // Synthetic NSLeftMouseDown at the coordinates captured in JS.
                // Avoids the every-other-drag failure caused by NSApp.currentEvent
                // being stale (mouseUp) by the time async IPC delivers to Rust.
                let process_info: id = msg_send![class!(NSProcessInfo), processInfo];
                let timestamp: f64 = msg_send![process_info, systemUptime];
                let mouse_point = NSPoint::new(appkit_x, appkit_y);
                let window_number: i64 = msg_send![ns_window, windowNumber];
                let synthetic_event: id = msg_send![
                    class!(NSEvent),
                    mouseEventWithType: 1_u64
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

                let path_ns: id = NSString::alloc(nil).init_str(&path);

                // dragFile:fromRect:slideBack:event: is the reliable API for
                // dragging a local file path. It puts NSFilenamesPboardType on
                // the pasteboard and drives its own event-tracking loop.
                // slideBack:NO prevents the fly-back animation on cancel.
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
                    eprintln!("[fw-drag] dragFile:fromRect:slideBack:event: returned NO");
                } else {
                    eprintln!("[fw-drag] drag started OK");
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
