mod shortcut;

use shortcut::{create_shortcut, CreateResult, Destination, Format};

/// Create a Windows shortcut from the frontend.
#[tauri::command]
fn create(
    filepath: String,
    destination: Destination,
    format: Format,
) -> Result<CreateResult, String> {
    create_shortcut(&filepath, destination, format)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![create])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
