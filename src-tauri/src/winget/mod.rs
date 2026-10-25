use crate::bindings::*;
use serde::Serialize;
use windows_core::{Interface, Result, GUID, HRESULT, HSTRING};
use windows_future::AsyncOperationProgressHandler;

const CLSCTX_LOCAL_SERVER: u32 = 0x4;
const CLSCTX_ALLOW_LOWER_TRUST_REGISTRATION: u32 = 0x400_0000;
const COINIT_MULTITHREADED: u32 = 0x0;
const E_FAIL: HRESULT = HRESULT(0x8000_4005_u32 as i32);

const CLSID_PACKAGE_MANAGER: GUID = GUID::from_u128(0xC53A4F16_787E_42A4_B304_29EFFB4BF597);
const CLSID_FIND_PACKAGES_OPTIONS: GUID = GUID::from_u128(0x572DED96_9C60_4526_8F92_EE7D91D38C1A);
const CLSID_COMPOSITE_CATALOG_OPTIONS: GUID = GUID::from_u128(0x526534B8_7E46_47C8_8416_B1685C327D37);
const CLSID_INSTALL_OPTIONS: GUID = GUID::from_u128(0x1095F097_EB96_453B_B4E6_1613637F3B14);
const CLSID_UNINSTALL_OPTIONS: GUID = GUID::from_u128(0xE1D9A11E_9F85_4D87_9C17_2B93143ADB8D);
const CLSID_PACKAGE_MATCH_FILTER: GUID = GUID::from_u128(0xD02C9DAF_99DC_429C_B503_4E504E4AB000);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageDto {
    pub id: String,
    pub name: String,
    pub source: String,
    pub current_version: String,
    pub available_version: String,
    pub has_update: bool,
    pub installed: bool,
    pub managed: bool,
    pub publisher: Option<String>,
    pub description: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperationOutcome {
    pub success: bool,
    pub status: String,
    pub extended_error: Option<String>,
    pub installer_error: Option<u32>,
    pub reboot_required: bool,
}

pub fn init_thread() {
    let _ = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
}

fn create<T: Interface>(clsid: &GUID) -> Result<T> {
    unsafe { CoCreateInstance(clsid, None::<&windows_core::IUnknown>, CLSCTX_LOCAL_SERVER | CLSCTX_ALLOW_LOWER_TRUST_REGISTRATION) }
}

fn fail(message: impl AsRef<str>) -> windows_core::Error {
    windows_core::Error::new(E_FAIL, message)
}

fn text(value: Result<HSTRING>) -> Option<String> {
    value.ok().map(|s| s.to_string_lossy()).filter(|s| !s.is_empty())
}

fn items<T: windows_core::RuntimeType + 'static>(view: windows_collections::IVectorView<T>) -> Result<Vec<T>> {
    (0..view.Size()?).map(|i| view.GetAt(i)).collect()
}

fn connect(manager: &PackageManager, behavior: CompositeSearchBehavior) -> Result<PackageCatalog> {
    let options: CreateCompositePackageCatalogOptions = create(&CLSID_COMPOSITE_CATALOG_OPTIONS)?;
    let catalogs = options.Catalogs()?;
    for reference in items(manager.GetPackageCatalogs()?)? {
        catalogs.Append(&reference)?;
    }
    options.SetCompositeSearchBehavior(behavior)?;
    let result = manager.CreateCompositePackageCatalog(&options)?.Connect()?;
    if result.Status()? != ConnectResultStatus::Ok {
        return Err(fail(format!("catalog connect failed: {}", result.Status()?.0)));
    }
    result.PackageCatalog()
}

fn find(catalog: &PackageCatalog, selector: Option<(PackageMatchField, PackageFieldMatchOption, &str)>, limit: u32) -> Result<Vec<CatalogPackage>> {
    let options: FindPackagesOptions = create(&CLSID_FIND_PACKAGES_OPTIONS)?;
    if let Some((field, option, value)) = selector {
        let filter: PackageMatchFilter = create(&CLSID_PACKAGE_MATCH_FILTER)?;
        filter.SetField(field)?;
        filter.SetOption(option)?;
        filter.SetValue(&HSTRING::from(value))?;
        options.Selectors()?.Append(&filter)?;
    }
    if limit > 0 {
        options.SetResultLimit(limit)?;
    }
    let result = catalog.FindPackages(&options)?;
    if result.Status()? != FindPackagesResultStatus::Ok {
        return Err(fail(format!("search failed: {}", result.Status()?.0)));
    }
    items(result.Matches()?)?.iter().map(|m| m.CatalogPackage()).collect()
}

fn source_of(version: &PackageVersionInfo) -> String {
    let name = version.PackageCatalog().and_then(|c| c.Info()).and_then(|i| i.Name()).map(|n| n.to_string_lossy()).unwrap_or_default();
    if name.eq_ignore_ascii_case("msstore") { "msstore".into() } else { "winget".into() }
}

fn to_dto(package: &CatalogPackage, with_metadata: bool) -> Result<PackageDto> {
    let installed = package.InstalledVersion().ok();
    let available = package.DefaultInstallVersion().ok();
    let has_update = installed.is_some() && package.IsUpdateAvailable().unwrap_or(false);
    let metadata = if with_metadata { available.as_ref().and_then(|v| v.GetCatalogPackageMetadata().ok()) } else { None };
    Ok(PackageDto {
        id: package.Id()?.to_string_lossy(),
        name: package.Name()?.to_string_lossy(),
        source: available.as_ref().map(source_of).unwrap_or_else(|| "winget".into()),
        current_version: installed.as_ref().or(available.as_ref()).and_then(|v| text(v.Version())).unwrap_or_default(),
        available_version: if has_update || installed.is_none() { available.as_ref().and_then(|v| text(v.Version())).unwrap_or_default() } else { String::new() },
        has_update,
        installed: installed.is_some(),
        managed: available.is_some(),
        publisher: metadata.as_ref().and_then(|m| text(m.Publisher())).or_else(|| installed.as_ref().and_then(|v| text(v.Publisher()))),
        description: metadata.as_ref().and_then(|m| text(m.Description()).or_else(|| text(m.ShortDescription()))),
    })
}

fn find_one(manager: &PackageManager, id: &str, behavior: CompositeSearchBehavior) -> Result<CatalogPackage> {
    let catalog = connect(manager, behavior)?;
    find(&catalog, Some((PackageMatchField::Id, PackageFieldMatchOption::EqualsCaseInsensitive, id)), 1)?
        .into_iter()
        .next()
        .ok_or_else(|| fail(format!("package not found: {id}")))
}

pub fn list() -> Result<Vec<PackageDto>> {
    let manager: PackageManager = create(&CLSID_PACKAGE_MANAGER)?;
    let catalog = connect(&manager, CompositeSearchBehavior::LocalCatalogs)?;
    Ok(find(&catalog, None, 0)?
        .iter()
        .filter_map(|p| to_dto(p, false).ok())
        .filter(|p| p.managed || !p.id.starts_with("MSIX\\"))
        .collect())
}

pub fn search(query: &str) -> Result<Vec<PackageDto>> {
    let manager: PackageManager = create(&CLSID_PACKAGE_MANAGER)?;
    let catalog = connect(&manager, CompositeSearchBehavior::RemotePackagesFromAllCatalogs)?;
    Ok(find(&catalog, Some((PackageMatchField::CatalogDefault, PackageFieldMatchOption::ContainsCaseInsensitive, query)), 25)?
        .iter()
        .filter_map(|p| to_dto(p, false).ok())
        .collect())
}

pub fn show(id: &str) -> Result<(PackageDto, Vec<String>)> {
    let manager: PackageManager = create(&CLSID_PACKAGE_MANAGER)?;
    let package = find_one(&manager, id, CompositeSearchBehavior::RemotePackagesFromAllCatalogs)?;
    let versions = items(package.AvailableVersions()?)?.iter().filter_map(|v| text(v.Version())).collect();
    Ok((to_dto(&package, true)?, versions))
}

fn install_percent(p: &InstallProgress) -> f64 {
    let value = match p.State {
        PackageInstallProgressState::Downloading => p.DownloadProgress * 60.0,
        PackageInstallProgressState::Installing => 60.0 + p.InstallationProgress * 35.0,
        PackageInstallProgressState::PostInstall => 97.0,
        PackageInstallProgressState::Finished => 100.0,
        _ => 0.0,
    };
    value.clamp(0.0, 100.0)
}

fn install_status(status: InstallResultStatus) -> &'static str {
    match status {
        InstallResultStatus::Ok => "Ok",
        InstallResultStatus::BlockedByPolicy => "BlockedByPolicy",
        InstallResultStatus::CatalogError => "CatalogError",
        InstallResultStatus::InvalidOptions => "InvalidOptions",
        InstallResultStatus::DownloadError => "DownloadError",
        InstallResultStatus::InstallError => "InstallError",
        InstallResultStatus::ManifestError => "ManifestError",
        InstallResultStatus::NoApplicableInstallers => "NoApplicableInstallers",
        InstallResultStatus::NoApplicableUpgrade => "NoApplicableUpgrade",
        InstallResultStatus::PackageAgreementsNotAccepted => "PackageAgreementsNotAccepted",
        _ => "InternalError",
    }
}

fn uninstall_status(status: UninstallResultStatus) -> &'static str {
    match status {
        UninstallResultStatus::Ok => "Ok",
        UninstallResultStatus::BlockedByPolicy => "BlockedByPolicy",
        UninstallResultStatus::CatalogError => "CatalogError",
        UninstallResultStatus::InvalidOptions => "InvalidOptions",
        UninstallResultStatus::UninstallError => "UninstallError",
        UninstallResultStatus::ManifestError => "ManifestError",
        _ => "InternalError",
    }
}

fn install_outcome(result: &InstallResult) -> Result<OperationOutcome> {
    let status = result.Status()?;
    let code = result.ExtendedErrorCode()?;
    Ok(OperationOutcome {
        success: status == InstallResultStatus::Ok,
        status: install_status(status).into(),
        extended_error: (code.0 != 0).then(|| format!("0x{:08X}", code.0 as u32)),
        installer_error: result.InstallerErrorCode().ok().filter(|c| *c != 0),
        reboot_required: result.RebootRequired().unwrap_or(false),
    })
}

fn install_options(interactive: bool) -> Result<InstallOptions> {
    let options: InstallOptions = create(&CLSID_INSTALL_OPTIONS)?;
    options.SetPackageInstallMode(if interactive { PackageInstallMode::Interactive } else { PackageInstallMode::Silent })?;
    options.SetAcceptPackageAgreements(true)?;
    Ok(options)
}

fn progress_handler(report: impl Fn(f64) + Send + 'static) -> AsyncOperationProgressHandler<InstallResult, InstallProgress> {
    AsyncOperationProgressHandler::new(move |_, progress: InstallProgress| {
        report(install_percent(&progress));
        Ok(())
    })
}

pub fn install(id: &str, version: Option<&str>, interactive: bool, report: impl Fn(f64) + Send + 'static) -> Result<OperationOutcome> {
    let manager: PackageManager = create(&CLSID_PACKAGE_MANAGER)?;
    let package = find_one(&manager, id, CompositeSearchBehavior::RemotePackagesFromAllCatalogs)?;
    let options = install_options(interactive)?;
    if let Some(version) = version {
        let target = items(package.AvailableVersions()?)?
            .into_iter()
            .find(|v| text(v.Version()).as_deref() == Some(version))
            .ok_or_else(|| fail(format!("version not found: {version}")))?;
        options.SetPackageVersionId(&target)?;
        options.SetForce(true)?;
    }
    let operation = manager.InstallPackageAsync(&package, &options)?;
    operation.SetProgress(&progress_handler(report))?;
    install_outcome(&operation.join()?)
}

pub fn upgrade(id: &str, interactive: bool, report: impl Fn(f64) + Send + 'static) -> Result<OperationOutcome> {
    let manager: PackageManager = create(&CLSID_PACKAGE_MANAGER)?;
    let package = find_one(&manager, id, CompositeSearchBehavior::LocalCatalogs)?;
    let operation = manager.UpgradePackageAsync(&package, &install_options(interactive)?)?;
    operation.SetProgress(&progress_handler(report))?;
    install_outcome(&operation.join()?)
}

pub fn uninstall(id: &str, report: impl Fn(f64) + Send + 'static) -> Result<OperationOutcome> {
    let manager: PackageManager = create(&CLSID_PACKAGE_MANAGER)?;
    let package = find_one(&manager, id, CompositeSearchBehavior::LocalCatalogs)?;
    let options: UninstallOptions = create(&CLSID_UNINSTALL_OPTIONS)?;
    options.SetPackageUninstallMode(PackageUninstallMode::Silent)?;
    let operation = manager.UninstallPackageAsync(&package, &options)?;
    operation.SetProgress(&AsyncOperationProgressHandler::new(move |_, p: UninstallProgress| {
        report(if p.State == PackageUninstallProgressState::Finished { 100.0 } else { (p.UninstallationProgress * 100.0).clamp(0.0, 100.0) });
        Ok(())
    }))?;
    let result = operation.join()?;
    let status = result.Status()?;
    let code = result.ExtendedErrorCode()?;
    Ok(OperationOutcome {
        success: status == UninstallResultStatus::Ok,
        status: uninstall_status(status).into(),
        extended_error: (code.0 != 0).then(|| format!("0x{:08X}", code.0 as u32)),
        installer_error: result.UninstallerErrorCode().ok().filter(|c| *c != 0),
        reboot_required: result.RebootRequired().unwrap_or(false),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore]
    fn reads_live_winget() {
        init_thread();
        let installed = list().unwrap();
        assert!(!installed.is_empty());
        let updates: Vec<_> = installed.iter().filter(|p| p.has_update).collect();
        for p in updates.iter().take(5) {
            println!("{} [{}] {} -> {} ({})", p.name, p.id, p.current_version, p.available_version, p.source);
        }
        println!("installed: {}, updates: {}", installed.len(), updates.len());
        let unmanaged: Vec<_> = installed.iter().filter(|p| !p.managed).collect();
        println!("unmanaged: {}", unmanaged.len());
        for p in unmanaged.iter().take(5) {
            println!("  {} [{}] {}", p.name, p.id, p.current_version);
        }
        if let Some(first) = unmanaged.first() {
            let manager: PackageManager = create(&CLSID_PACKAGE_MANAGER).unwrap();
            assert!(find_one(&manager, &first.id, CompositeSearchBehavior::LocalCatalogs).is_ok());
        }
        let found = search("firefox").unwrap();
        assert!(found.iter().any(|p| p.id == "Mozilla.Firefox"));
        let (detail, versions) = show("Mozilla.Firefox").unwrap();
        println!("show: {} by {:?}, {} versions, latest {:?}", detail.name, detail.publisher, versions.len(), versions.first());
        assert!(!versions.is_empty());
        for id in ["Google.Chrome", "Discord.Discord", "VideoLAN.VLC"] {
            let (d, v) = show(id).unwrap();
            println!("{id}: installed={} current={:?} available={:?} first={:?}", d.installed, d.current_version, d.available_version, v.first());
            assert!(!d.current_version.is_empty() || !d.available_version.is_empty(), "{id} has no version");
        }
    }
}
