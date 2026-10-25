import { ref, watch } from 'vue'
import { Clapperboard, Code2, FileText, Gamepad2, Globe, MessageCircle, ShieldCheck, Sparkles, Wrench } from 'lucide-vue-next'
import { usePackagesStore } from '@/stores/packages'
import type { Package, PackageSource } from '@/models'

const SHELVES = {
  popular: ['Mozilla.Firefox', 'Google.Chrome', 'VideoLAN.VLC', '7zip.7zip', 'Discord.Discord', 'Spotify.Spotify', 'OBSProject.OBSStudio', 'Valve.Steam', 'Notepad++.Notepad++', 'Microsoft.PowerToys'],
  browser: ['Mozilla.Firefox', 'Google.Chrome', 'Brave.Brave', 'Vivaldi.Vivaldi', 'Opera.Opera', 'LibreWolf.LibreWolf', 'Ablaze.Floorp'],
  communication: ['Discord.Discord', 'Telegram.TelegramDesktop', 'OpenWhisperSystems.Signal', 'Zoom.Zoom', 'Microsoft.Teams', 'SlackTechnologies.Slack', 'Mozilla.Thunderbird'],
  media: ['VideoLAN.VLC', 'Spotify.Spotify', 'OBSProject.OBSStudio', 'Audacity.Audacity', 'HandBrake.HandBrake', 'GIMP.GIMP.3', 'KDE.Kdenlive', 'Daum.PotPlayer'],
  productivity: ['TheDocumentFoundation.LibreOffice', 'ONLYOFFICE.DesktopEditors', 'Obsidian.Obsidian', 'Notion.Notion', 'SumatraPDF.SumatraPDF', 'Adobe.Acrobat.Reader.64-bit', 'Doist.Todoist'],
  developer: ['Microsoft.VisualStudioCode', 'Git.Git', 'OpenJS.NodeJS.LTS', 'Python.Python.3.13', 'Microsoft.WindowsTerminal', 'Docker.DockerDesktop', 'Postman.Postman', 'Notepad++.Notepad++'],
  gaming: ['Valve.Steam', 'EpicGames.EpicGamesLauncher', 'GOG.Galaxy', 'ElectronicArts.EADesktop', 'Ubisoft.Connect', 'HeroicGamesLauncher.HeroicGamesLauncher'],
  tools: ['7zip.7zip', 'Microsoft.PowerToys', 'voidtools.Everything', 'ShareX.ShareX', 'RARLab.WinRAR', 'JAMSoftware.TreeSize.Free', 'CPUID.CPU-Z', 'qBittorrent.qBittorrent'],
  security: ['Bitwarden.Bitwarden', 'AgileBits.1Password', 'KeePassXCTeam.KeePassXC', 'Malwarebytes.Malwarebytes', 'Proton.ProtonVPN', 'Cloudflare.Warp', 'WireGuard.WireGuard']
}

export type Shelf = keyof typeof SHELVES

export const shelfIcons: Record<Shelf, typeof Globe> = {
  popular: Sparkles, browser: Globe, communication: MessageCircle, media: Clapperboard, productivity: FileText,
  developer: Code2, gaming: Gamepad2, tools: Wrench, security: ShieldCheck
}

export const shelves = Object.keys(SHELVES) as Shelf[]

export function useDiscover() {
  const store = usePackagesStore()
  const query = ref('')
  const source = ref<PackageSource | 'all'>('all')
  const results = ref<Package[]>([])
  const searched = ref('')
  const searching = ref(false)
  const shelf = ref<Shelf>('popular')
  const shelfItems = ref<Package[]>([])
  const loadingShelf = ref(true)

  async function search() {
    const q = query.value.trim()
    if (!q) {
      results.value = []
      searched.value = ''
      return
    }
    searching.value = true
    try {
      results.value = await store.searchRemote(q, source.value)
      searched.value = q
    } finally {
      searching.value = false
    }
  }

  function clear() {
    query.value = ''
    results.value = []
    searched.value = ''
  }

  function openShelf(value: Shelf) {
    clear()
    shelf.value = value
  }

  watch(source, () => searched.value && search())

  watch(shelf, async value => {
    loadingShelf.value = true
    const items = await store.fetchMultiplePackageDetails(SHELVES[value])
    if (shelf.value !== value) return
    shelfItems.value = items
    loadingShelf.value = false
  }, { immediate: true })

  const isInstalled = (pkg: Package) => !!store.packages.find(p => p.id === pkg.id)
  const operationFor = (pkg: Package) => store.lastOperationFor(pkg)
  const install = (pkg: Package) => store.installPackage(pkg.id, pkg.source, undefined, pkg.name)

  return { query, source, results, searched, searching, shelf, shelfItems, loadingShelf, openShelf, search, clear, isInstalled, operationFor, install }
}
