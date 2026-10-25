// Package provider types and interfaces
// Models'dan import ediliyor

import { PackageSource } from '@/models'
import type { Package, UpdateResult, PackageListResult, BulkUpdateResult } from '@/models'

// Re-export from models
export { PackageSource }
export type { Package, UpdateResult, PackageListResult, BulkUpdateResult }

/**
 * Package Provider Interface
 * İleride yeni paket yöneticileri eklemek için bu interface'i implement edin
 */
export type ProgressReporter = (percent: number) => void

export interface PackageProvider {
    /** Provider adı */
    readonly name: PackageSource

    /** Provider ikonu */
    readonly icon: string

    /** Provider yüklü mü kontrol et */
    isInstalled(): Promise<boolean>

    /** Paket listesini al */
    getPackages(onlyUpdates: boolean): Promise<Package[]>

    /** Paketi güncelle */
    updatePackage(id: string, interactive: boolean, onProgress?: ProgressReporter): Promise<UpdateResult>

    /** Paketi yükle */
    installPackage(id: string, interactive: boolean, version?: string, onProgress?: ProgressReporter): Promise<UpdateResult>

    /** Paketi kaldır */
    uninstallPackage(id: string, onProgress?: ProgressReporter): Promise<UpdateResult>

    updateMany?(ids: string[]): Promise<UpdateResult[]>

    installMany?(ids: string[]): Promise<UpdateResult[]>

    /** Paket ara */
    searchPackages?(query: string): Promise<Package[]>

    /** Paket detaylarını getir */
    showPackage?(id: string): Promise<Package | null>

    /** Mevcut versiyonları getir */
    getVersions?(id: string, limit?: number): Promise<string[]>
}
