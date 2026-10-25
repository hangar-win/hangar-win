import { PackageSource } from '@/models'
import type { Package, UpdateResult } from '@/models'
import type { PackageProvider } from '@/services/package-providers'
import type { Registry } from '@/stores/packages'

type Row = [name: string, id: string, current: string, available: string, source: PackageSource, publisher: string]

const W = PackageSource.Winget
const C = PackageSource.Chocolatey
const S = PackageSource.MsStore
const O = PackageSource.Scoop

const rows: Row[] = [
  ['DBeaver EE', 'DBeaver.DBeaver.Enterprise', '25.2.0', '25.3.0', W, 'DBeaver Corp'],
  ['Mozilla Thunderbird', 'Mozilla.Thunderbird.tr', '145.0', '146.0', W, 'Mozilla'],
  ['Notepad++', 'Notepad++.Notepad++', '8.8.6', '8.8.8', W, 'Notepad++ Team'],
  ['Visual Studio Code', 'Microsoft.VisualStudioCode', '1.105.1', '1.106.0', W, 'Microsoft'],
  ['Docker Desktop', 'Docker.DockerDesktop', '4.47.0', '4.49.0', W, 'Docker Inc.'],
  ['Git', 'Git.Git', '2.51.0', '2.51.2', W, 'The Git Development Community'],
  ['Node.js LTS', 'OpenJS.NodeJS.LTS', '22.20.0', '22.21.1', W, 'OpenJS Foundation'],
  ['Google Chrome', 'Google.Chrome', '141.0.7390.123', '142.0.7444.60', W, 'Google LLC'],
  ['nodejs', 'nodejs', '24.9.0', '24.10.0', C, 'Chocolatey community'],
  ['PowerToys', 'Microsoft.PowerToys', '0.94.2', '0.95.1', W, 'Microsoft'],
  ['WhatsApp', '9NKSQGP7F2NH', '2.2541.4', '2.2543.2', S, 'WhatsApp Inc.'],
  ['Postman', 'Postman.Postman', '11.66.0', '11.69.1', W, 'Postman'],
  ['Mozilla Firefox', 'Mozilla.Firefox', '146.0.1', '', W, 'Mozilla'],
  ['7-Zip', '7zip.7zip', '25.01', '', W, 'Igor Pavlov'],
  ['Spotify', '9NCBCSZSJRSB', '1.2.74.477', '', S, 'Spotify AB'],
  ['VLC media player', 'VideoLAN.VLC', '3.0.21', '', W, 'VideoLAN'],
  ['Discord', 'Discord.Discord', '1.0.9213', '', W, 'Discord Inc.'],
  ['OBS Studio', 'OBSProject.OBSStudio', '32.0.1', '', W, 'OBS Project'],
  ['Steam', 'Valve.Steam', '2.10.91.91', '', W, 'Valve Corporation'],
  ['Python 3.13', 'Python.Python.3.13', '3.13.9', '', W, 'Python Software Foundation'],
  ['Windows Terminal', 'Microsoft.WindowsTerminal', '1.23.12811.0', '', W, 'Microsoft'],
  ['Everything', 'voidtools.Everything', '1.4.1.1028', '', W, 'voidtools'],
  ['ShareX', 'ShareX.ShareX', '18.0.1', '', W, 'ShareX Team'],
  ['qBittorrent', 'qBittorrent.qBittorrent', '5.1.2', '', W, 'qBittorrent Project'],
  ['Telegram Desktop', 'Telegram.TelegramDesktop', '6.2.4', '', W, 'Telegram FZ-LLC'],
  ['LibreOffice', 'TheDocumentFoundation.LibreOffice', '25.8.2', '', W, 'The Document Foundation'],
  ['GIMP', 'GIMP.GIMP.3', '3.0.6', '', W, 'The GIMP Team'],
  ['Audacity', 'Audacity.Audacity', '3.7.5', '', W, 'Audacity Team'],
  ['PuTTY', 'putty', '0.83', '', C, 'Simon Tatham'],
  ['WinSCP', 'winscp', '6.5.4', '', C, 'Martin Prikryl'],
  ['Microsoft Teams', 'Microsoft.Teams', '25275.2601.4002.2815', '', W, 'Microsoft'],
  ['Zoom Workplace', 'Zoom.Zoom', '6.6.6', '', W, 'Zoom Video Communications'],
  ['ripgrep', 'ripgrep', '14.1.1', '15.2.0', O, ''],
  ['fzf', 'fzf', '0.65.2', '', O, '']
]

const installed: Package[] = [
  ...rows.map(([name, id, current, available, source, publisher]) => ({
    name, id, source, publisher: publisher || undefined,
    currentVersion: current,
    availableVersion: available,
    hasUpdate: !!available
  })),
  ...[['RustDesk', '1.5.0'], ['Riot Vanguard', 'Unknown'], ['Simpra WebPOS QA', '5.5.149']].map(([name, version]) => ({
    name, id: `ARP\\Machine\\X64\\${name}`, source: W, unmanaged: true,
    currentVersion: version, availableVersion: '', hasUpdate: false
  }))
]

const catalog: Package[] = [
  ...installed,
  { name: 'Brave', id: 'Brave.Brave', source: W, publisher: 'Brave Software', currentVersion: '1.84.132', availableVersion: '', hasUpdate: false },
  { name: 'Obsidian', id: 'Obsidian.Obsidian', source: W, publisher: 'Obsidian', currentVersion: '1.9.14', availableVersion: '', hasUpdate: false },
  { name: 'Blender', id: 'BlenderFoundation.Blender', source: W, publisher: 'Blender Foundation', currentVersion: '4.5.4', availableVersion: '', hasUpdate: false },
  { name: 'HandBrake', id: 'HandBrake.HandBrake', source: W, publisher: 'HandBrake Team', currentVersion: '1.10.2', availableVersion: '', hasUpdate: false }
].map(p => ({ ...p, description: `${p.name}, ${p.publisher} tarafından geliştirilen bir uygulama. Bu açıklama yalnızca geliştirme önizlemesi içindir.` }))

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const failing = new Set(['Docker.DockerDesktop'])

async function act(id: string, ms = 2600): Promise<UpdateResult> {
  await wait(ms)
  if (failing.has(id)) {
    return {
      success: false,
      packageId: id,
      error: 'Yükleyici yönetici izni istedi (0x80070005).',
      output: `Found Docker Desktop [${id}]\nDownloading installer...\n  ██████████████████████████████  612 MB / 612 MB\nStarting package install...\nInstaller failed with exit code: 0x80070005 : Access is denied.`
    }
  }
  return { success: true, packageId: id, output: `Found [${id}]\nSuccessfully installed` }
}

function search(query: string) {
  const q = query.toLowerCase()
  return catalog.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
}

export const devRegistry: Registry = {
  async getAllPackages(onlyUpdates: boolean) {
    await wait(500)
    const packages = onlyUpdates ? installed.filter(p => p.hasUpdate) : installed.map(p => ({ ...p, hasUpdate: false }))
    return { packages, totalUpdates: installed.filter(p => p.hasUpdate).length }
  },
  updatePackage: (id: string) => act(id),
  installPackage: (id: string) => act(id, 3200),
  uninstallPackage: (id: string) => act(id, 1800),
  async showPackage(id: string) {
    await wait(300)
    return catalog.find(p => p.id === id) ?? null
  },
  async getVersions(id: string) {
    await wait(400)
    const pkg = catalog.find(p => p.id === id)
    if (!pkg) return []
    const latest = pkg.availableVersion || pkg.currentVersion
    const [major, minor = '0'] = latest.split('.')
    return [latest, pkg.currentVersion, `${major}.${Math.max(0, Number(minor) - 1)}.0`, `${major}.${Math.max(0, Number(minor) - 2)}.0`]
      .filter((v, i, list) => v && list.indexOf(v) === i)
  },
  async searchPackages(query: string) {
    await wait(700)
    return search(query)
  },
  get(source: PackageSource) {
    return { searchPackages: async (query: string) => search(query).filter(p => p.source === source) } as unknown as PackageProvider
  }
}
