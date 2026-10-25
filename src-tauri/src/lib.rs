#[allow(non_snake_case, non_camel_case_types, non_upper_case_globals, dead_code, clippy::all)]
mod bindings;
mod elevate;
mod scoop;
mod winget;

use tauri::ipc::Channel;
use winget::{OperationOutcome, PackageDto};

async fn com<T: Send + 'static>(task: impl FnOnce() -> windows_core::Result<T> + Send + 'static) -> Result<T, String> {
  tauri::async_runtime::spawn_blocking(move || {
    winget::init_thread();
    task().map_err(|e| e.message())
  })
  .await
  .map_err(|e| e.to_string())?
}

fn reporter(channel: Channel<f64>) -> impl Fn(f64) + Send + 'static {
  move |percent| {
    let _ = channel.send(percent.round());
  }
}

#[tauri::command]
async fn winget_list() -> Result<Vec<PackageDto>, String> {
  com(winget::list).await
}

#[tauri::command]
async fn winget_search(query: String) -> Result<Vec<PackageDto>, String> {
  com(move || winget::search(&query)).await
}

#[tauri::command]
async fn winget_show(id: String) -> Result<(PackageDto, Vec<String>), String> {
  com(move || winget::show(&id)).await
}

#[tauri::command]
async fn winget_install(id: String, version: Option<String>, interactive: bool, on_progress: Channel<f64>) -> Result<OperationOutcome, String> {
  com(move || winget::install(&id, version.as_deref(), interactive, reporter(on_progress))).await
}

#[tauri::command]
async fn winget_upgrade(id: String, interactive: bool, on_progress: Channel<f64>) -> Result<OperationOutcome, String> {
  com(move || winget::upgrade(&id, interactive, reporter(on_progress))).await
}

#[tauri::command]
async fn winget_uninstall(id: String, on_progress: Channel<f64>) -> Result<OperationOutcome, String> {
  com(move || winget::uninstall(&id, reporter(on_progress))).await
}

#[tauri::command]
fn is_elevated() -> bool {
  elevate::is_elevated()
}

#[tauri::command]
async fn choco_elevated(action: String, ids: Vec<String>) -> Result<elevate::ElevatedRun, String> {
  tauri::async_runtime::spawn_blocking(move || elevate::run_choco(&action, &ids))
    .await
    .map_err(|e| e.to_string())?
}

async fn blocking<T: Send + 'static>(task: impl FnOnce() -> Result<T, String> + Send + 'static) -> Result<T, String> {
  tauri::async_runtime::spawn_blocking(task).await.map_err(|e| e.to_string())?
}

#[tauri::command]
fn scoop_available() -> bool {
  scoop::available()
}

#[tauri::command]
async fn scoop_list(outdated: bool) -> Result<Vec<scoop::ScoopApp>, String> {
  blocking(move || if outdated { scoop::outdated() } else { scoop::list() }).await
}

#[tauri::command]
async fn scoop_search(query: String) -> Result<Vec<scoop::ScoopApp>, String> {
  blocking(move || scoop::search(&query)).await
}

#[tauri::command]
async fn scoop_run(action: String, id: String) -> Result<scoop::ScoopRun, String> {
  blocking(move || scoop::run(&action, &id)).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![winget_list, winget_search, winget_show, winget_install, winget_upgrade, winget_uninstall, is_elevated, choco_elevated, scoop_available, scoop_list, scoop_search, scoop_run])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
