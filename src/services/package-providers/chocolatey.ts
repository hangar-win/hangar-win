// Chocolatey Package Provider

import { ipcService } from '../ipc'
import { PackageSource } from '@/models'
import type { Package, UpdateResult } from '@/models'
import type { PackageProvider } from './types'
import { CommandBuilder } from '@/services/command-builder'
import { invoke } from '@tauri-apps/api/core'
import i18n from '@/i18n'

interface ElevatedRun {
    success: boolean
    cancelled: boolean
    exitCode: number | null
    output: string
}

export class ChocolateyProvider implements PackageProvider {
    readonly name = PackageSource.Chocolatey
    readonly icon = '🍫'

    async isInstalled(): Promise<boolean> {
        try {
            return (await ipcService.executeCommand(CommandBuilder.build('choco.version'))).success
        } catch {
            return false
        }
    }

    async getPackages(onlyUpdates: boolean): Promise<Package[]> {
        const isInstalled = await this.isInstalled()
        if (!isInstalled) return []

        try {
            const command = onlyUpdates
                ? CommandBuilder.build('choco.outdated')
                : CommandBuilder.build('choco.list')
            const result = await ipcService.executeCommand(command)
            return this.parseOutput(result.stdout, onlyUpdates)
        } catch (error) {
            console.error('ChocolateyProvider getPackages error:', error)
            return []
        }
    }

    async updatePackage(id: string): Promise<UpdateResult> {
        return (await this.elevated('upgrade', [id]))[0]
    }

    async installPackage(id: string): Promise<UpdateResult> {
        return (await this.elevated('install', [id]))[0]
    }

    async uninstallPackage(id: string): Promise<UpdateResult> {
        return (await this.elevated('uninstall', [id]))[0]
    }

    updateMany(ids: string[]): Promise<UpdateResult[]> {
        return this.elevated('upgrade', ids)
    }

    installMany(ids: string[]): Promise<UpdateResult[]> {
        return this.elevated('install', ids)
    }

    private async elevated(action: 'install' | 'upgrade' | 'uninstall', ids: string[]): Promise<UpdateResult[]> {
        const t = i18n.global.t
        let run: ElevatedRun
        try {
            run = await invoke<ElevatedRun>('choco_elevated', { action, ids })
        } catch (error) {
            run = { success: false, cancelled: false, exitCode: null, output: String(error) }
        }
        const failures = run.output.slice(run.output.lastIndexOf('Failures'))
        const failed = (id: string) => !run.success && (ids.length === 1 || run.cancelled || failures.includes(` - ${id} `) || !run.output.includes('Failures'))
        const error = run.cancelled ? t('errors.choco.cancelled') : t('errors.choco.failed', { code: run.exitCode ?? '?' })
        return ids.map(packageId => ({ success: !failed(packageId), output: run.output, packageId, error: failed(packageId) ? error : undefined }))
    }

    async searchPackages(query: string): Promise<Package[]> {
        try {
            const command = CommandBuilder.build('choco.search', { query })
            const result = await ipcService.executeCommand(command)
            return this.parseSearchOutput(result.stdout)
        } catch {
            return []
        }
    }

    private parseOutput(stdout: string, onlyUpdates: boolean): Package[] {
        const packages: Package[] = []
        const lines = stdout.split('\n')

        for (const line of lines) {
            if (!line.trim() || !line.includes('|')) continue

            const parts = line.split('|')

            if (onlyUpdates && parts.length >= 3) {
                const pkgName = parts[0].trim()
                packages.push({
                    name: pkgName,
                    id: pkgName,
                    currentVersion: parts[1].trim(),
                    availableVersion: parts[2].trim(),
                    source: PackageSource.Chocolatey,
                    hasUpdate: true
                })
            } else if (!onlyUpdates && parts.length >= 2) {
                const pkgName = parts[0].trim()
                const version = parts[1].trim()
                packages.push({
                    name: pkgName,
                    id: pkgName,
                    currentVersion: version,
                    availableVersion: version,
                    source: PackageSource.Chocolatey,
                    hasUpdate: false
                })
            }
        }

        return packages
    }

    private parseSearchOutput(stdout: string): Package[] {
        const packages: Package[] = []
        const lines = stdout.split('\n')

        for (const line of lines) {
            if (!line.trim() || !line.includes('|')) continue

            const parts = line.split('|')
            if (parts.length >= 2) {
                const pkgName = parts[0].trim()
                const version = parts[1].trim()
                packages.push({
                    name: pkgName,
                    id: pkgName,
                    currentVersion: version,
                    availableVersion: version,
                    source: PackageSource.Chocolatey,
                    hasUpdate: false
                })
            }
        }

        return packages
    }
}

export const chocolateyProvider = new ChocolateyProvider()
