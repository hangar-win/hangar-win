// Package Provider Registry
// Tüm providerleri merkezi olarak yönetir

import { PackageSource } from '@/models'
import type { Package, UpdateResult, PackageListResult, BulkUpdateResult } from '@/models'
import type { PackageProvider, ProgressReporter } from './types'
import { wingetProvider } from './winget'
import { chocolateyProvider } from './chocolatey'
import { scoopProvider } from './scoop'

// Re-export types
export * from './types'

class PackageProviderRegistry {
    private providers: Map<PackageSource, PackageProvider> = new Map()

    constructor() {
        this.register(wingetProvider)
        this.register(chocolateyProvider)
        this.register(scoopProvider)
    }

    register(provider: PackageProvider): void {
        this.providers.set(provider.name, provider)
    }

    get(source: PackageSource): PackageProvider | undefined {
        return this.providers.get(source === PackageSource.MsStore ? PackageSource.Winget : source)
    }

    getAll(): PackageProvider[] {
        return Array.from(this.providers.values())
    }

    async getInstalledProviders(): Promise<PackageProvider[]> {
        const results = await Promise.all(
            this.getAll().map(async (p) => ({ provider: p, installed: await p.isInstalled() }))
        )
        return results.filter(r => r.installed).map(r => r.provider)
    }

    async getAllPackages(onlyUpdates: boolean): Promise<PackageListResult> {
        const providers = await this.getInstalledProviders()

        const packageLists = await Promise.all(
            providers.map(p => p.getPackages(onlyUpdates))
        )

        const packages = packageLists.flat()
        const totalUpdates = packages.filter(p => p.hasUpdate).length

        return { packages, totalUpdates }
    }

    async updatePackage(id: string, source: PackageSource, interactive: boolean, onProgress?: ProgressReporter): Promise<UpdateResult> {
        const provider = this.get(source)
        if (!provider) {
            return {
                success: false,
                output: '',
                packageId: id,
                error: `Provider bulunamadı: ${source}`
            }
        }

        return provider.updatePackage(id, interactive, onProgress)
    }

    async installPackage(id: string, source: PackageSource, interactive: boolean, version?: string, onProgress?: ProgressReporter): Promise<UpdateResult> {
        const provider = this.get(source)
        if (!provider) {
            return {
                success: false,
                output: '',
                packageId: id,
                error: `Provider bulunamadı: ${source}`
            }
        }

        return provider.installPackage(id, interactive, version, onProgress)
    }

    async uninstallPackage(id: string, source: PackageSource, onProgress?: ProgressReporter): Promise<UpdateResult> {
        const provider = this.get(source)
        if (!provider) {
            return {
                success: false,
                output: '',
                packageId: id,
                error: `Provider bulunamadı: ${source}`
            }
        }

        return provider.uninstallPackage(id, onProgress)
    }

    async updateAllPackages(packages: Package[], interactive: boolean): Promise<BulkUpdateResult> {
        const results: Array<UpdateResult & { name: string }> = []

        for (const pkg of packages) {
            const result = await this.updatePackage(pkg.id, pkg.source, interactive)
            results.push({ ...result, name: pkg.name })
        }

        return {
            results,
            total: packages.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        }
    }

    async showPackage(id: string, source: PackageSource = PackageSource.Winget): Promise<Package | null> {
        const provider = this.get(source)
        if (!provider?.showPackage) return null
        return provider.showPackage(id)
    }

    async getVersions(id: string, source: PackageSource = PackageSource.Winget, limit: number = 5): Promise<string[]> {
        const provider = this.get(source)
        if (!provider?.getVersions) return []
        return provider.getVersions(id, limit)
    }

    async searchPackages(query: string): Promise<Package[]> {
        const providers = await this.getInstalledProviders()

        const searchResults = await Promise.all(
            providers.map(p => p.searchPackages ? p.searchPackages(query) : Promise.resolve([]))
        )

        return searchResults.flat()
    }
}

export const packageRegistry = new PackageProviderRegistry()
