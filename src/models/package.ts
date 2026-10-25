// Package Model

import { PackageSource } from './enums'

export interface Package {
    name: string
    id: string
    currentVersion: string
    availableVersion: string
    source: PackageSource
    hasUpdate: boolean
    publisher?: string
    description?: string
    version?: string // Fallback for various sources
    held?: 'skip' | 'pin'
    unmanaged?: boolean
    updating?: boolean
    progress?: number
    updateResult?: {
        success: boolean
        error?: string
    }
}

export interface PackageListResult {
    packages: Package[]
    totalUpdates: number
}

export interface UpdateResult {
    success: boolean
    output: string
    packageId: string
    code?: number
    error?: string
}

export interface BulkUpdateResult {
    results: Array<UpdateResult & { name: string }>
    total: number
    successful: number
    failed: number
}
