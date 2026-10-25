import { invoke } from '@tauri-apps/api/core'
import { PackageSource } from '@/models'
import type { Package, UpdateResult } from '@/models'
import type { PackageProvider } from './types'
import i18n from '@/i18n'

interface ScoopApp {
    name: string
    version: string
    latest: string
    source: string
}

const toPackage = (app: ScoopApp, installed: boolean): Package => ({
    id: app.name,
    name: app.name,
    source: PackageSource.Scoop,
    currentVersion: app.version,
    availableVersion: installed ? app.latest : app.version,
    hasUpdate: installed && !!app.latest
})

export class ScoopProvider implements PackageProvider {
    readonly name = PackageSource.Scoop
    readonly icon = ''
    private available?: Promise<boolean>

    isInstalled(): Promise<boolean> {
        return this.available ??= invoke<boolean>('scoop_available').catch(() => false)
    }

    async getPackages(onlyUpdates: boolean): Promise<Package[]> {
        if (!await this.isInstalled()) return []
        try {
            return (await invoke<ScoopApp[]>('scoop_list', { outdated: onlyUpdates })).map(app => toPackage(app, true))
        } catch (error) {
            console.error('ScoopProvider getPackages error:', error)
            return []
        }
    }

    updatePackage(id: string): Promise<UpdateResult> {
        return this.run('update', id)
    }

    installPackage(id: string): Promise<UpdateResult> {
        return this.run('install', id)
    }

    uninstallPackage(id: string): Promise<UpdateResult> {
        return this.run('uninstall', id)
    }

    async searchPackages(query: string): Promise<Package[]> {
        if (!query.trim() || !await this.isInstalled()) return []
        try {
            return (await invoke<ScoopApp[]>('scoop_search', { query: query.trim() })).map(app => toPackage(app, false))
        } catch {
            return []
        }
    }

    private async run(action: 'install' | 'update' | 'uninstall', id: string): Promise<UpdateResult> {
        try {
            const run = await invoke<{ success: boolean, output: string }>('scoop_run', { action, id })
            return { success: run.success, packageId: id, output: run.output, error: run.success ? undefined : i18n.global.t('errors.scoop.failed') }
        } catch (error) {
            const message = String(error)
            return { success: false, packageId: id, output: message, error: message }
        }
    }
}

export const scoopProvider = new ScoopProvider()
