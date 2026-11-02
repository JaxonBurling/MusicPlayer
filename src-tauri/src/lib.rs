// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Emitter;
use tauri_plugin_media::{MediaControlEventType, MediaExt};

/// 在媒体会话初始化成功后绑定系统媒体键。
/// 放在命令里延迟执行，避免在 WebView 创建前初始化 WinRT MediaPlayer 导致启动失败。
#[tauri::command]
fn bind_media_events(app: tauri::AppHandle) {
    let handle = app.clone();
    app.media().set_event_handler(move |event| {
        let name = match event.event_type {
            MediaControlEventType::Play | MediaControlEventType::PlayPause => "media-play",
            MediaControlEventType::Pause => "media-pause",
            MediaControlEventType::Stop => "media-stop",
            MediaControlEventType::Next => "media-next",
            MediaControlEventType::Previous => "media-prev",
            _ => return,
        };
        // Player.vue 监听这些事件，实现系统媒体键 / 耳机线控
        let _ = handle.emit(name, ());
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_media::init())
        .invoke_handler(tauri::generate_handler![bind_media_events])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
