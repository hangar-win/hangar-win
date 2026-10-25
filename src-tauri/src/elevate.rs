use crate::bindings::*;
use serde::Serialize;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

const SEE_MASK_NOCLOSEPROCESS: u32 = 0x40;
const SEE_MASK_NOASYNC: u32 = 0x100;
const SW_HIDE: i32 = 0;
const INFINITE: u32 = 0xFFFF_FFFF;
const ERROR_CANCELLED: i32 = 1223;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ElevatedRun {
    pub success: bool,
    pub cancelled: bool,
    pub exit_code: Option<u32>,
    pub output: String,
}

pub fn is_elevated() -> bool {
    unsafe { IsUserAnAdmin().as_bool() }
}

pub fn valid_package_id(id: &str) -> bool {
    let mut chars = id.chars();
    matches!(chars.next(), Some(c) if c.is_ascii_alphanumeric())
        && id.len() <= 128
        && chars.all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '+' | '-'))
}

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

fn choco_exe() -> PathBuf {
    std::env::var_os("ChocolateyInstall")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(r"C:\ProgramData\chocolatey"))
        .join("bin")
        .join("choco.exe")
}

pub fn run_choco(action: &str, ids: &[String]) -> Result<ElevatedRun, String> {
    if !matches!(action, "install" | "upgrade" | "uninstall") {
        return Err(format!("unsupported action: {action}"));
    }
    if ids.is_empty() || !ids.iter().all(|id| valid_package_id(id)) {
        return Err("invalid package id".into());
    }
    let exe = choco_exe();
    if !exe.is_file() {
        return Err(format!("choco not found at {}", exe.display()));
    }

    let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or_default();
    let log = std::env::temp_dir().join(format!("winget-ui-choco-{}-{stamp}.log", std::process::id()));
    let params = format!("{action} {} -y --no-progress --log-file=\"{}\"", ids.join(" "), log.display());

    let verb = wide("runas");
    let file = wide(&exe.to_string_lossy());
    let parameters = wide(&params);
    let mut info = SHELLEXECUTEINFOW {
        cbSize: std::mem::size_of::<SHELLEXECUTEINFOW>() as u32,
        fMask: SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NOASYNC,
        lpVerb: windows_core::PCWSTR(verb.as_ptr()),
        lpFile: windows_core::PCWSTR(file.as_ptr()),
        lpParameters: windows_core::PCWSTR(parameters.as_ptr()),
        nShow: SW_HIDE,
        ..Default::default()
    };

    if !unsafe { ShellExecuteExW(&mut info) }.as_bool() {
        let error = std::io::Error::last_os_error();
        let cancelled = error.raw_os_error() == Some(ERROR_CANCELLED);
        return Ok(ElevatedRun { success: false, cancelled, exit_code: None, output: if cancelled { String::new() } else { error.to_string() } });
    }

    let mut code = 0u32;
    unsafe {
        WaitForSingleObject(info.hProcess, INFINITE);
        let _ = GetExitCodeProcess(info.hProcess, &mut code);
        let _ = CloseHandle(info.hProcess);
    }

    let output = std::fs::read(&log).map(|b| String::from_utf8_lossy(&b).into_owned()).unwrap_or_default();
    let _ = std::fs::remove_file(&log);
    Ok(ElevatedRun { success: matches!(code, 0 | 1641 | 3010), cancelled: false, exit_code: Some(code), output })
}

#[cfg(test)]
mod tests {
    use super::valid_package_id;

    #[test]
    fn package_ids() {
        for ok in ["nodejs", "notepadplusplus", "Notepad++.Notepad++", "7zip.install", "python3"] {
            assert!(valid_package_id(ok), "{ok}");
        }
        for bad in ["", "-y", "--force", "a b", "a&calc", "a\"b", ".hidden", "a;b", "ç"] {
            assert!(!valid_package_id(bad), "{bad}");
        }
    }
}
