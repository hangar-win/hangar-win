import { Channel, invoke } from '@tauri-apps/api/core'
import { PackageSource } from '@/models'
import type { Package, UpdateResult } from '@/models'
import type { PackageProvider, ProgressReporter } from './types'
import i18n from '@/i18n'

interface PackageDto {
    id: string
    name: string
    source: string
    currentVersion: string
    availableVersion: string
    hasUpdate: boolean
    installed: boolean
    managed: boolean
    publisher?: string | null
    description?: string | null
}

interface OperationOutcome {
    success: boolean
    status: string
    extendedError?: string | null
    installerError?: number | null
    rebootRequired: boolean
}

const toPackage = (dto: PackageDto): Package => ({
    id: dto.id,
    name: dto.name,
    source: dto.source === 'msstore' ? PackageSource.MsStore : PackageSource.Winget,
    currentVersion: dto.currentVersion,
    availableVersion: dto.availableVersion,
    hasUpdate: dto.hasUpdate,
    unmanaged: !dto.managed || undefined,
    publisher: dto.publisher ?? undefined,
    description: dto.description ?? undefined
})

function describe(outcome: OperationOutcome) {
    return [
        `Status: ${outcome.status}`,
        outcome.extendedError && `Extended error: ${outcome.extendedError}`,
        outcome.installerError && `Installer exit code: ${outcome.installerError}`,
        outcome.rebootRequired && 'Reboot required'
    ].filter(Boolean).join('\n')
}

function errorMessage(outcome: OperationOutcome) {
    const t = i18n.global.t
    if (outcome.extendedError === '0x80070005') return t('errors.winget.AccessDenied')
    const key = `errors.winget.${outcome.status}`
    return i18n.global.te(key) ? t(key) : t('errors.winget.InternalError')
}

function shared<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>, ttl: number) {
    let pending = cache.get(key)
    if (!pending) {
        pending = load()
        cache.set(key, pending)
        pending.then(() => setTimeout(() => cache.delete(key), ttl), () => cache.delete(key))
    }
    return pending
}

export class WingetProvider implements PackageProvider {
    readonly name = PackageSource.Winget
    readonly icon = ''
    private listings = new Map<string, Promise<Package[]>>()
    private details = new Map<string, Promise<[PackageDto, string[]] | null>>()

    async isInstalled(): Promise<boolean> {
        return true
    }

    async getPackages(onlyUpdates: boolean): Promise<Package[]> {
        const all = await shared(this.listings, 'all', async () => (await invoke<PackageDto[]>('winget_list')).map(toPackage), 1000)
        return onlyUpdates ? all.filter(p => p.hasUpdate) : all
    }

    updatePackage(id: string, interactive: boolean, onProgress?: ProgressReporter): Promise<UpdateResult> {
        return this.run(id, 'winget_upgrade', { id, interactive }, onProgress)
    }

    installPackage(id: string, interactive: boolean, version?: string, onProgress?: ProgressReporter): Promise<UpdateResult> {
        return this.run(id, 'winget_install', { id, interactive, version: version ?? null }, onProgress)
    }

    uninstallPackage(id: string, onProgress?: ProgressReporter): Promise<UpdateResult> {
        return this.run(id, 'winget_uninstall', { id }, onProgress)
    }

    async searchPackages(query: string): Promise<Package[]> {
        if (!query.trim()) return []
        return (await invoke<PackageDto[]>('winget_search', { query: query.trim() })).map(toPackage)
    }

    async showPackage(id: string): Promise<Package | null> {
        const result = await this.show(id)
        return result ? toPackage(result[0]) : null
    }

    async getVersions(id: string, limit: number = 8): Promise<string[]> {
        const result = await this.show(id)
        return result ? result[1].slice(0, limit) : []
    }

    private show(id: string) {
        return shared(this.details, id, () => invoke<[PackageDto, string[]]>('winget_show', { id }).catch(() => null), 30_000)
    }

    private async run(id: string, command: string, args: Record<string, unknown>, onProgress?: ProgressReporter): Promise<UpdateResult> {
        const channel = new Channel<number>()
        channel.onmessage = percent => onProgress?.(percent)
        try {
            const outcome = await invoke<OperationOutcome>(command, { ...args, onProgress: channel })
            this.listings.clear()
            this.details.delete(id)
            return {
                success: outcome.success,
                packageId: id,
                output: describe(outcome),
                error: outcome.success ? undefined : errorMessage(outcome)
            }
        } catch (error) {
            const message = String(error)
            return { success: false, packageId: id, output: message, error: message }
        }
    }
}

export const wingetProvider = new WingetProvider()
