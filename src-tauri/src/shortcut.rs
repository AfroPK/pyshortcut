//! Core shortcut logic for PyShortcut.
//!
//! Split into two layers:
//! - Pure, OS-agnostic helpers (destination resolution, filename/format logic,
//!   batch/VBS content) — these are unit-tested without touching the shell.
//! - A thin Windows-specific action (`create_shortcut`) that shells into COM
//!   (`IShellLink`) to write the actual `.lnk`, or writes `.bat`/`.vbs` files.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Where the shortcut should be placed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Destination {
    SameDir,
    Programs,
    Startup,
}

/// The shortcut file format.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Format {
    Lnk,
    Vbs,
    Bat,
}

impl Format {
    pub fn extension(self) -> &'static str {
        match self {
            Format::Lnk => ".lnk",
            Format::Vbs => ".vbs",
            Format::Bat => ".bat",
        }
    }
}

/// Compute the shortcut's base name: the target file name minus its extension.
///
/// e.g. `C:\Tools\MyApp.exe` -> `MyApp`
pub fn shortcut_stem(filepath: &str) -> String {
    let base = Path::new(filepath)
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();
    base
}

/// Start Menu Programs directory for the current user.
pub fn start_menu_programs_dir() -> PathBuf {
    home_dir()
        .join("AppData")
        .join("Roaming")
        .join("Microsoft")
        .join("Windows")
        .join("Start Menu")
        .join("Programs")
}

/// Start Menu Startup directory for the current user.
pub fn start_menu_startup_dir() -> PathBuf {
    start_menu_programs_dir().join("Startup")
}

/// Home dir via `USERPROFILE` (Windows), with a portable fallback.
fn home_dir() -> PathBuf {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

/// Resolve the destination directory for a chosen target + destination.
pub fn resolve_destination_dir(filepath: &str, destination: Destination) -> PathBuf {
    match destination {
        Destination::SameDir => Path::new(filepath)
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| PathBuf::from(".")),
        Destination::Programs => start_menu_programs_dir(),
        Destination::Startup => start_menu_startup_dir(),
    }
}

/// Full path where the shortcut file will be written.
pub fn shortcut_path(target_dir: &Path, filepath: &str, format: Format) -> PathBuf {
    target_dir.join(format!("{}{}", shortcut_stem(filepath), format.extension()))
}

/// Contents of the generated `.bat` launcher.
pub fn bat_file_contents(filepath: &str) -> String {
    let dir = Path::new(filepath)
        .parent()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_default();
    let name = Path::new(filepath)
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();
    format!("@echo off\r\nstart \"\" /d \"{}\" \"{}\"", dir, name)
}

/// Contents of the generated `.vbs` launcher.
pub fn vbs_file_contents(filepath: &str) -> String {
    let dir = Path::new(filepath)
        .parent()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_default();
    let name = Path::new(filepath)
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();
    format!(
        "Set WshShell = CreateObject(\"WScript.Shell\")\r\n\
         WshShell.CurrentDirectory = \"{}\"\r\n\
         WshShell.Run \"\"\"{}\"\"\", 1, False",
        dir.replace("\"", "\"\""),
        name.replace("\"", "\"\"")
    )
}

/// Result payload returned to the frontend.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateResult {
    pub path: String,
    pub format: String,
}

/// Create a shortcut at the chosen destination.
///
/// `.lnk` uses the Windows Shell COM interface; `.bat`/`.vbs` write launcher files.
pub fn create_shortcut(
    filepath: &str,
    destination: Destination,
    format: Format,
) -> Result<CreateResult, String> {
    let target = PathBuf::from(filepath);
    if !target.is_file() {
        return Err(format!("Target file not found: {}", filepath));
    }
    let target_dir = resolve_destination_dir(filepath, destination);
    std::fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Cannot create destination dir: {e}"))?;
    let out_path = shortcut_path(&target_dir, filepath, format);

    match format {
        Format::Lnk => write_link_file(&target, &out_path)?,
        Format::Bat => {
            std::fs::write(&out_path, bat_file_contents(filepath))
                .map_err(|e| format!("Failed to write .bat: {e}"))?
        }
        Format::Vbs => {
            std::fs::write(&out_path, vbs_file_contents(filepath))
                .map_err(|e| format!("Failed to write .vbs: {e}"))?
        }
    }

    Ok(CreateResult {
        path: out_path.to_string_lossy().into_owned(),
        format: format.extension().to_string(),
    })
}

/// Write a real Windows `.lnk` shortcut via the `IShellLink` COM interface.
#[cfg(windows)]
fn write_link_file(target: &Path, out_path: &Path) -> Result<(), String> {
    use windows::core::{Interface, HSTRING};
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
        IPersistFile,
    };
    use windows::Win32::UI::Shell::{IShellLinkW, ShellLink};

    unsafe {
        // Tauri's main thread already initializes COM as STA; match that apartment so
        // CoInitializeEx returns S_FALSE ("already initialized") rather than flipping
        // to MTA and failing with RPC_E_CHANGED_MODE (0x80010106).
        let hr = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        // OK(0) or S_FALSE(1) — anything else is a failure.
        if !(hr.is_ok() || hr.0 == 1) {
            return Err(format!("CoInitializeEx failed: {hr:?}"));
        }

        let link: IShellLinkW =
            match CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER) {
                Ok(l) => l,
                Err(e) => return Err(format!("CoCreateInstance(ShellLink) failed: {e}")),
            };

        link.SetPath(&HSTRING::from(target.to_string_lossy().as_ref()))
            .map_err(|e| format!("SetPath failed: {e}"))?;
        let workdir = target.parent().unwrap_or_else(|| Path::new("."));
        link.SetWorkingDirectory(&HSTRING::from(workdir.to_string_lossy().as_ref()))
            .map_err(|e| format!("SetWorkingDirectory failed: {e}"))?;

        let persist: IPersistFile =
            link.cast().map_err(|e| format!("QI IPersistFile failed: {e}"))?;
        persist
            .Save(&HSTRING::from(out_path.to_string_lossy().as_ref()), true)
            .map_err(|e| format!("IPersistFile.Save failed: {e}"))?;
    }
    Ok(())
}

/// Placeholder for non-Windows targets (unused; the app is Windows-only).
#[cfg(not(windows))]
fn write_link_file(_target: &Path, _out_path: &Path) -> Result<(), String> {
    Err("Creating .lnk links is only supported on Windows.".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stem_excludes_extension() {
        assert_eq!(shortcut_stem(r"C:\Tools\MyApp.exe"), "MyApp");
    }

    #[test]
    fn stem_handles_multiple_dots() {
        assert_eq!(shortcut_stem(r"C:\a\file.name.v1.py"), "file.name.v1");
    }

    #[test]
    fn stem_no_extension() {
        assert_eq!(shortcut_stem(r"C:\a\README"), "README");
    }

    #[test]
    fn same_dir_destination_is_parent() {
        let d = resolve_destination_dir(r"C:\Data\apps\Tool.exe", Destination::SameDir);
        assert_eq!(d, PathBuf::from(r"C:\Data\apps"));
    }

    #[test]
    fn shortcut_path_uses_stem_and_format() {
        let p = shortcut_path(Path::new(r"C:\out"), r"C:\x\MyApp.exe", Format::Lnk);
        assert_eq!(p, PathBuf::from(r"C:\out\MyApp.lnk"));
    }

    #[test]
    fn bat_content_quotes_dir_and_name() {
        let c = bat_file_contents(r"C:\Program Files\App\app.exe");
        assert!(c.starts_with("@echo off\r\n"));
        assert!(c.contains(r#"start "" /d "C:\Program Files\App" "app.exe""#));
    }

    #[test]
    fn vbs_content_launches_with_working_dir() {
        let c = vbs_file_contents(r"C:\tools\my cli.py");
        assert!(c.contains("WScript.Shell"));
        assert!(c.contains(r#"CurrentDirectory = "C:\tools""#));
    }

    #[test]
    fn create_returns_error_for_missing_target() {
        let err = create_shortcut(r"C:\does\not\exist.exe", Destination::SameDir, Format::Bat);
        assert!(err.is_err());
    }
}
