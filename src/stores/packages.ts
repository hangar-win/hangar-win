import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { packageRegistry } from '@/services/package-providers'
import { PackageSource } from '@/models'
import type { Package, UpdateResult } from '@/models'
import type { ProgressReporter } from '@/services/package-providers'
import { useNotificationStore } from './notification'
import { cacheService } from '@/services/cache'
import i18n from '@/i18n'

export type StatusFilter = 'due' | 'all' | 'current' | 'other'
export type OperationType = 'install' | 'update' | 'uninstall'

export interface Operation {
    id: string
    packageId: string
    packageName: string
    source: PackageSource
    type: OperationType
    version?: string
    progress: number
    status: 'running' | 'success' | 'error'
    error?: string
    output?: string
    startedAt: number
    finishedAt?: number
}

export interface MaintenanceRecord {
    date: string
    version: string
}

export type Registry = Pick<typeof packageRegistry, 'getAllPackages' | 'updatePackage' | 'installPackage' | 'uninstallPackage' | 'showPackage' | 'getVersions' | 'searchPackages' | 'get'>

const isDevBrowser = import.meta.env.DEV && !('__TAURI_INTERNALS__' in window)
const registryReady: Promise<Registry> = isDevBrowser
    ? import('@/dev/devRegistry').then(m => m.devRegistry)
    : Promise.resolve(packageRegistry)

export const packageKey = (pkg: Pick<Package, 'id' | 'source'>) => `${pkg.source}:${pkg.id}`

const PINNED = '*'
const nameOf = (id: string) => id.split('.').pop() || id

export const usePackagesStore = defineStore('packages', () => {
    const packages = ref<Package[]>([])
    const isLoading = ref(false)
    const lastChecked = ref<number | null>(null)
    const operations = ref<Operation[]>([])

    const activeSource = ref<PackageSource | 'all'>('all')
    const searchQuery = ref('')
    const statusFilter = useStorage<StatusFilter>('settings.statusFilter', 'due')
    const silentInstall = useStorage('settings.silentInstall', true)
    const records = useStorage<Record<string, MaintenanceRecord>>('packages.records', {})
    const held = useStorage<Record<string, string>>('packages.held', {})

    const filteredPackages = computed(() => {
        const query = searchQuery.value.trim().toLowerCase()
        return packages.value
            .filter(p => statusFilter.value === 'other' ? p.unmanaged : !p.unmanaged && (statusFilter.value === 'all' || (statusFilter.value === 'due') === p.hasUpdate))
            .filter(p => activeSource.value === 'all' || p.source === activeSource.value)
            .filter(p => !query || p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query))
            .sort((a, b) => Number(b.hasUpdate) - Number(a.hasUpdate) || a.name.localeCompare(b.name))
    })

    const duePackages = computed(() => packages.value.filter(p => p.hasUpdate))
    const totalUpdates = computed(() => duePackages.value.length)
    const runningCount = computed(() => operations.value.filter(o => o.status === 'running').length)
    const failedCount = computed(() => operations.value.filter(o => o.status === 'error').length)
    const isBulkRunning = ref(false)

    const managed = computed(() => packages.value.filter(p => !p.unmanaged))

    const statusCounts = computed(() => ({
        due: totalUpdates.value,
        all: managed.value.length,
        current: managed.value.length - totalUpdates.value,
        other: packages.value.length - managed.value.length
    }))

    const sourceCounts = computed(() => {
        const counts: Record<PackageSource, number> = { winget: 0, chocolatey: 0, msstore: 0, scoop: 0 }
        for (const p of managed.value) counts[p.source]++
        return counts
    })

    function applyHold(pkg: Package): Package {
        const rule = held.value[packageKey(pkg)]
        const pending = pkg.hasUpdate || (!!pkg.held && !!pkg.availableVersion && pkg.availableVersion !== pkg.currentVersion)
        const kind = rule === PINNED ? 'pin' : pending && rule === pkg.availableVersion ? 'skip' : undefined
        return Object.assign(pkg, { held: kind, hasUpdate: pending && !kind })
    }

    function hold(pkg: Package, kind: 'skip' | 'pin') {
        held.value[packageKey(pkg)] = kind === 'pin' ? PINNED : pkg.availableVersion
        applyHold(pkg)
    }

    function release(pkg: Package) {
        delete held.value[packageKey(pkg)]
        applyHold(pkg)
    }

    function isValidPackage(pkg: Package): boolean {
        if (pkg.unmanaged) return !!pkg.name
        if (!pkg.id || pkg.id.length < 2) return false
        if ((pkg.source === PackageSource.Winget || pkg.source === PackageSource.MsStore) && !pkg.id.includes('.') && !/^[A-Z0-9]{9,14}$/.test(pkg.id)) return false
        return !!pkg.name && pkg.name !== '-'
    }

    function setPackages(list: Package[]) {
        const previous = new Map(packages.value.map(p => [packageKey(p), p]))
        packages.value = list.filter(isValidPackage).map(pkg => {
            const old = previous.get(packageKey(pkg))
            return applyHold({ ...pkg, updating: old?.updating ?? false, progress: old?.progress ?? 0, updateResult: old?.updateResult })
        })
    }

    let inflight: Promise<void> | null = null

    function refresh() {
        return inflight ??= loadPackages().finally(() => { inflight = null })
    }

    async function fetchPackages(force = false) {
        if (!force && !packages.value.length) {
            const cached = cacheService.get<{ packages: Package[], checkedAt?: number }>('installed-packages')
            if (cached) {
                setPackages(cached.packages)
                lastChecked.value = cached.checkedAt ?? null
                refresh()
                return
            }
        }
        await refresh()
    }

    async function loadPackages() {
        isLoading.value = true
        try {
            const registry = await registryReady
            const [installed, updates] = await Promise.all([
                registry.getAllPackages(false),
                registry.getAllPackages(true)
            ])
            const updateMap = new Map(updates.packages.map(p => [packageKey(p), p]))
            const merged = installed.packages.map(pkg => {
                const update = updateMap.get(packageKey(pkg))
                return update ? { ...pkg, hasUpdate: true, availableVersion: update.availableVersion } : pkg
            })
            setPackages(merged)
            lastChecked.value = Date.now()
            cacheService.set('installed-packages', { packages: packages.value, checkedAt: lastChecked.value })
        } catch (error: any) {
            const t = i18n.global.t
            useNotificationStore().error(t('errors.loadTitle'), t('errors.loadDesc', { message: error.message }))
        } finally {
            isLoading.value = false
        }
    }

    function invalidatePackageCache(id: string) {
        cacheService.invalidate(`pkg:${id}`)
        cacheService.invalidate(`versions:${id}`)
        cacheService.invalidate('installed-packages')
    }

    function findPackage(pkg: Pick<Package, 'id' | 'source'>) {
        return packages.value.find(p => p.id === pkg.id && p.source === pkg.source)
    }

    async function runOperation(type: OperationType, target: { id: string, name: string, source: PackageSource, version?: string }, task: (registry: Registry, report: ProgressReporter) => Promise<UpdateResult>): Promise<UpdateResult> {
        const op: Operation = {
            id: `${type}-${target.id}-${Date.now()}`,
            packageId: target.id,
            packageName: target.name,
            source: target.source,
            type,
            version: target.version,
            progress: 0,
            status: 'running',
            startedAt: Date.now()
        }
        operations.value.unshift(op)
        const live = operations.value[0]
        const installed = findPackage(target)
        if (installed) {
            installed.updating = true
            installed.progress = 0
            installed.updateResult = undefined
        }

        const setProgress = (value: number) => {
            live.progress = Math.round(Math.min(100, Math.max(live.progress, value)))
            if (installed) installed.progress = live.progress
        }
        const tick = setInterval(() => {
            if (live.progress < 90) setProgress(Math.min(90, live.progress + Math.random() * 10))
        }, 500)
        const report: ProgressReporter = value => {
            clearInterval(tick)
            setProgress(value)
        }

        let result: UpdateResult
        try {
            result = await task(await registryReady, report)
        } catch (error: any) {
            result = { success: false, output: '', packageId: target.id, error: error.message }
        }

        clearInterval(tick)
        Object.assign(live, {
            progress: 100,
            status: result.success ? 'success' : 'error',
            error: result.error,
            output: result.output,
            finishedAt: Date.now()
        })
        if (installed) {
            installed.updating = false
            installed.progress = 100
            installed.updateResult = { success: result.success, error: result.error }
        }
        if (result.success) invalidatePackageCache(target.id)
        if (!isBulkRunning.value) notify(type, target, result)
        return result
    }

    function notify(type: OperationType, target: { name: string, version?: string }, result: UpdateResult) {
        const t = i18n.global.t
        const notes = useNotificationStore()
        if (result.success) notes.success(t(`toast.${type}.done`, { name: target.name }), target.version && type !== 'uninstall' ? t('toast.version', { v: target.version }) : '')
        else notes.error(t(`toast.${type}.failed`, { name: target.name }), result.error ?? '', 8000)
    }

    function summarize(type: 'install' | 'update', results: UpdateResult[]) {
        if (!results.length) return
        const t = i18n.global.t
        const failed = results.filter(r => !r.success).length
        const done = results.length - failed
        const title = t(`toast.${type}.bulk`, { n: done }, done)
        if (failed) useNotificationStore().warning(title, t('toast.bulkFailed', { n: failed }, failed), 8000)
        else useNotificationStore().success(title, '')
    }

    async function updatePackage(pkg: Package, shared?: Promise<UpdateResult[]>): Promise<UpdateResult> {
        const task = shared
            ? async () => (await shared).find(r => r.packageId === pkg.id) ?? { success: false, output: '', packageId: pkg.id }
            : (r: Registry, report: ProgressReporter) => r.updatePackage(pkg.id, pkg.source, !silentInstall.value, report)
        const result = await runOperation('update', { ...pkg, version: pkg.availableVersion }, task)
        if (result.success) {
            const current = findPackage(pkg)
            if (current) {
                records.value[packageKey(pkg)] = { date: new Date().toISOString(), version: pkg.availableVersion || current.currentVersion }
                current.currentVersion = pkg.availableVersion || current.currentVersion
                current.hasUpdate = false
            }
        }
        return result
    }

    async function install(target: { id: string, source: PackageSource, version?: string, name: string }, task: (registry: Registry, report: ProgressReporter) => Promise<UpdateResult>) {
        const result = await runOperation('install', target, task)
        if (result.success) records.value[packageKey(target)] = { date: new Date().toISOString(), version: target.version || '' }
        return result
    }

    async function installPackage(id: string, source: PackageSource, version?: string, name?: string): Promise<UpdateResult> {
        const result = await install({ id, source, version, name: name || nameOf(id) }, (r, report) => r.installPackage(id, source, !silentInstall.value, version, report))
        if (result.success) await fetchPackages(true)
        return result
    }

    async function installMany(list: Array<{ id: string, source: PackageSource }>) {
        const results: UpdateResult[] = []
        isBulkRunning.value = true
        try {
            const choco = list.filter(p => p.source === PackageSource.Chocolatey)
            const chocoProvider = (await registryReady).get(PackageSource.Chocolatey)
            const batched = choco.length > 0 && !!chocoProvider?.installMany
            if (batched) {
                const shared = chocoProvider!.installMany!(choco.map(p => p.id))
                results.push(...await Promise.all(choco.map(p => install({ ...p, name: p.id }, async () => (await shared).find(r => r.packageId === p.id) ?? { success: false, output: '', packageId: p.id }))))
            }
            for (const p of list.filter(p => !(batched && p.source === PackageSource.Chocolatey))) {
                results.push(await install({ ...p, name: nameOf(p.id) }, (r, report) => r.installPackage(p.id, p.source, !silentInstall.value, undefined, report)))
            }
            await fetchPackages(true)
        } finally {
            isBulkRunning.value = false
        }
        summarize('install', results)
    }

    async function uninstallPackage(pkg: Package): Promise<UpdateResult> {
        const result = await runOperation('uninstall', pkg, (r, report) => r.uninstallPackage(pkg.id, pkg.source, report))
        if (result.success) {
            packages.value = packages.value.filter(p => !(p.id === pkg.id && p.source === pkg.source))
            delete records.value[packageKey(pkg)]
        }
        return result
    }

    async function updateAllPackages() {
        const results: UpdateResult[] = []
        isBulkRunning.value = true
        try {
            const due = [...duePackages.value]
            const choco = due.filter(p => p.source === PackageSource.Chocolatey)
            const chocoProvider = (await registryReady).get(PackageSource.Chocolatey)
            const batched = choco.length > 0 && !!chocoProvider?.updateMany
            if (batched) {
                const shared = chocoProvider!.updateMany!(choco.map(p => p.id))
                results.push(...await Promise.all(choco.map(pkg => updatePackage(pkg, shared))))
            }
            for (const pkg of due.filter(p => !(batched && p.source === PackageSource.Chocolatey))) results.push(await updatePackage(pkg))
        } finally {
            isBulkRunning.value = false
        }
        summarize('update', results)
    }

    function retry(op: Operation) {
        operations.value = operations.value.filter(o => o.id !== op.id)
        const pkg = findPackage({ id: op.packageId, source: op.source })
        if (op.type === 'update' && pkg) return updatePackage(pkg)
        if (op.type === 'uninstall' && pkg) return uninstallPackage(pkg)
        return installPackage(op.packageId, op.source, op.version, op.packageName)
    }

    function lastOperationFor(pkg: Pick<Package, 'id' | 'source'>) {
        return operations.value.find(o => o.packageId === pkg.id && o.source === pkg.source)
    }

    function clearCompletedOperations() {
        operations.value = operations.value.filter(o => o.status === 'running')
    }

    async function fetchPackageDetails(id: string, source: PackageSource = PackageSource.Winget): Promise<Package | null> {
        const cacheKey = `pkg:${id}`
        const cached = cacheService.get<Package>(cacheKey)
        if (cached) return cached
        try {
            const result = await (await registryReady).showPackage(id, source)
            if (result) cacheService.set(cacheKey, result)
            return result
        } catch {
            return null
        }
    }

    async function fetchVersions(id: string, source: PackageSource = PackageSource.Winget, limit = 8): Promise<string[]> {
        const cacheKey = `versions:${id}`
        const cached = cacheService.get<string[]>(cacheKey)
        if (cached) return cached
        try {
            const result = await (await registryReady).getVersions(id, source, limit)
            if (result.length > 0) cacheService.set(cacheKey, result)
            return result
        } catch {
            return []
        }
    }

    async function fetchMultiplePackageDetails(ids: string[]): Promise<Package[]> {
        const results = await Promise.allSettled(ids.map(id => fetchPackageDetails(id)))
        return results.flatMap(r => r.status === 'fulfilled' && r.value ? [r.value] : [])
    }

    async function searchRemote(query: string, source: PackageSource | 'all' = 'all'): Promise<Package[]> {
        const registry = await registryReady
        try {
            if (source === 'all') return await registry.searchPackages(query)
            const provider = registry.get(source)
            const results = provider?.searchPackages ? await provider.searchPackages(query) : []
            return results.filter(p => p.source === source)
        } catch (error) {
            console.error('Search error:', error)
            return []
        }
    }

    return {
        packages, isLoading, lastChecked, operations, records, held,
        activeSource, searchQuery, statusFilter, silentInstall, isBulkRunning,
        filteredPackages, duePackages, totalUpdates, statusCounts, sourceCounts, runningCount, failedCount,
        fetchPackages, fetchPackageDetails, fetchVersions, fetchMultiplePackageDetails, searchRemote,
        updatePackage, installPackage, installMany, uninstallPackage, updateAllPackages, retry, hold, release,
        findPackage, lastOperationFor, clearCompletedOperations
    }
})
