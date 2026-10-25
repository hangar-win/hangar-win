import { computed, ref, watch } from 'vue'
import { usePackagesStore, packageKey } from '@/stores/packages'
import { PackageSource } from '@/models'
import type { Package } from '@/models'

export function usePackageDetail(getId: () => string) {
  const store = usePackagesStore()
  const pkg = ref<Package | null>(null)
  const versions = ref<string[]>([])
  const loadingVersions = ref(false)

  const installed = computed(() => pkg.value ? store.findPackage(pkg.value) : undefined)
  const isInstalled = computed(() => !!installed.value)
  const installedVersion = computed(() => installed.value?.currentVersion ?? '')
  const latestVersion = computed(() => versions.value[0] || installed.value?.availableVersion || pkg.value?.currentVersion || '')
  const record = computed(() => pkg.value ? store.records[packageKey(pkg.value)] : undefined)
  const operation = computed(() => pkg.value ? store.lastOperationFor(pkg.value) : undefined)
  const busy = computed(() => operation.value?.status === 'running')

  async function load(id: string) {
    pkg.value = null
    versions.value = []
    if (store.packages.length === 0) await store.fetchPackages()
    const found = store.packages.find(p => p.id === id)
    const details = await store.fetchPackageDetails(id, found?.source)
    pkg.value = found
      ? { ...found, description: found.description || details?.description, publisher: found.publisher || details?.publisher }
      : details ?? { id, name: id.split('.').pop() || id, source: PackageSource.Winget, currentVersion: '', availableVersion: '', hasUpdate: false }

    loadingVersions.value = true
    try {
      const list = await store.fetchVersions(id, pkg.value.source)
      const current = installedVersion.value
      versions.value = current && !list.includes(current) ? [...list, current] : list
    } finally {
      loadingVersions.value = false
    }
  }

  watch(getId, id => id && load(id), { immediate: true })

  const install = (version?: string) => pkg.value && store.installPackage(pkg.value.id, pkg.value.source, version, pkg.value.name)
  const update = () => installed.value && store.updatePackage(installed.value)
  const uninstall = () => installed.value && store.uninstallPackage(installed.value)

  return { pkg, versions, loadingVersions, installed, isInstalled, installedVersion, latestVersion, record, operation, busy, install, update, uninstall }
}
