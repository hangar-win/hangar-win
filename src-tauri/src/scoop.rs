use crate::elevate::valid_package_id;
use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use std::time::{Duration, Instant};

const CREATE_NO_WINDOW: u32 = 0x0800_0000;
const BUCKET_REFRESH: Duration = Duration::from_secs(3600);
const FIELDS: &str = "@{n='name';e={\"$($_.Name)\"}}, @{n='version';e={\"$($_.Version)\"}}, @{n='source';e={\"$($_.Source)\"}}";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoopApp {
    pub name: String,
    pub version: String,
    #[serde(default)]
    pub latest: String,
    #[serde(default)]
    pub source: String,
}

#[derive(Serialize)]
pub struct ScoopRun {
    pub success: bool,
    pub output: String,
}

fn powershell(script: &str) -> Result<std::process::Output, String> {
    Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command"])
        .arg(format!("[Console]::OutputEncoding = [Text.Encoding]::UTF8; {script}"))
        .env_remove("PSModulePath")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())
}

fn query(script: &str) -> Result<Vec<ScoopApp>, String> {
    let output = powershell(&format!("ConvertTo-Json -Compress -InputObject @({script})"))?;
    let text = String::from_utf8_lossy(&output.stdout);
    let text = text.trim();
    if text.is_empty() {
        return Ok(Vec::new());
    }
    serde_json::from_str(text).map_err(|e| format!("{e}: {text}"))
}

fn valid_query(query: &str) -> bool {
    let mut chars = query.chars();
    matches!(chars.next(), Some(c) if c.is_alphanumeric())
        && query.chars().count() <= 100
        && chars.all(|c| c.is_alphanumeric() || matches!(c, ' ' | '.' | '_' | '+' | '-'))
}

pub fn available() -> bool {
    std::env::var_os("SCOOP")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("USERPROFILE").map(|home| PathBuf::from(home).join("scoop")))
        .is_some_and(|root| root.join("shims").join("scoop.ps1").exists())
}

pub fn list() -> Result<Vec<ScoopApp>, String> {
    query(&format!("scoop list 6>$null | Select-Object {FIELDS}"))
}

pub fn outdated() -> Result<Vec<ScoopApp>, String> {
    let apps = query("scoop status 6>$null | Where-Object { $_.'Latest Version' } | Select-Object @{n='name';e={\"$($_.Name)\"}}, @{n='version';e={\"$($_.'Installed Version')\"}}, @{n='latest';e={\"$($_.'Latest Version')\"}}");
    refresh_buckets();
    apps
}

fn refresh_buckets() {
    static LAST: Mutex<Option<Instant>> = Mutex::new(None);
    let mut last = LAST.lock().unwrap_or_else(|e| e.into_inner());
    if last.is_some_and(|t| t.elapsed() < BUCKET_REFRESH) {
        return;
    }
    *last = Some(Instant::now());
    std::thread::spawn(|| powershell("scoop update *>$null"));
}

pub fn search(term: &str) -> Result<Vec<ScoopApp>, String> {
    if !valid_query(term) {
        return Err("invalid query".into());
    }
    query(&format!("scoop search '{term}' 6>$null | Select-Object {FIELDS}"))
}

pub fn run(action: &str, id: &str) -> Result<ScoopRun, String> {
    if !matches!(action, "install" | "update" | "uninstall") || !valid_package_id(id) {
        return Err("invalid request".into());
    }
    let output = powershell(&format!("scoop {action} {id} *>&1 | Out-String -Width 200; exit $LASTEXITCODE"))?;
    Ok(ScoopRun {
        success: output.status.success(),
        output: String::from_utf8_lossy(&output.stdout).trim().to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn queries() {
        assert!(valid_query("ripgrep"));
        assert!(valid_query("vs code"));
        assert!(!valid_query("x'; Remove-Item"));
        assert!(!valid_query("a$b"));
        assert!(run("install", "foo; rm").is_err());
        assert!(run("reset", "git").is_err());
    }

    #[test]
    fn ignores_inherited_pwsh_module_path() {
        let Ok(pwsh) = Command::new("pwsh").args(["-NoProfile", "-Command", "$PSHOME"]).output() else { return };
        let home = String::from_utf8_lossy(&pwsh.stdout).trim().to_string();
        if home.is_empty() {
            return;
        }
        std::env::set_var("PSModulePath", PathBuf::from(home).join("Modules"));
        let output = powershell("[bool](Get-Command Get-FileHash -ErrorAction SilentlyContinue)").unwrap();
        assert_eq!(String::from_utf8_lossy(&output.stdout).trim(), "True");
    }

    #[test]
    #[ignore]
    fn reads_live_scoop() {
        assert!(available());
        let apps = list().unwrap();
        println!("installed: {:?}", apps.iter().map(|a| format!("{} {} ({})", a.name, a.version, a.source)).collect::<Vec<_>>());
        assert!(!apps.is_empty());
        let found = search("ripgrep").unwrap();
        assert!(found.iter().any(|a| a.name == "ripgrep" && !a.version.is_empty()));
        let failed = run("install", "nonexistentpkg123").unwrap();
        assert!(!failed.success);
        println!("failure output: {}", failed.output);
    }
}
