import { PackageSource } from '@/models'
import type { Package } from '@/models'
import { Validator } from '@/utils/validator'

export interface AppEntry {
    id: string
    source: PackageSource
}

const WINGET_SOURCES: Partial<Record<PackageSource, Record<string, string>>> = {
    [PackageSource.Winget]: { Argument: 'https://cdn.winget.microsoft.com/cache', Identifier: 'Microsoft.Winget.Source_8wekyb3d8bbwe', Name: 'winget', Type: 'Microsoft.PreIndexed.Package' },
    [PackageSource.MsStore]: { Argument: 'https://storeedgefd.dsx.mp.microsoft.com/v9.0', Identifier: 'StoreEdgeFD', Name: 'msstore', Type: 'Microsoft.Rest' }
}

const EXTRA_SOURCES: Partial<Record<PackageSource, string>> = {
    [PackageSource.Chocolatey]: 'Chocolatey',
    [PackageSource.Scoop]: 'Scoop'
}

const entriesOf = (list: Package[], source: string) =>
    list.filter(p => p.source === source && !p.unmanaged).map(p => ({ PackageIdentifier: p.id }))

export function exportAppList(list: Package[]): string {
    const data: Record<string, unknown> = {
        $schema: 'https://aka.ms/winget-packages.schema.2.0.json',
        CreationDate: new Date().toISOString(),
        Sources: Object.entries(WINGET_SOURCES)
            .map(([source, details]) => ({ Packages: entriesOf(list, source), SourceDetails: details }))
            .filter(s => s.Packages.length)
    }
    for (const [source, key] of Object.entries(EXTRA_SOURCES)) {
        const packages = entriesOf(list, source)
        if (packages.length) data[key] = { Packages: packages }
    }
    return JSON.stringify(data, null, 2)
}

export function parseAppList(text: string): AppEntry[] {
    const data = JSON.parse(text.replace(/^﻿/, ''))
    const read = (packages: unknown, source: PackageSource): AppEntry[] => Array.isArray(packages)
        ? packages.map(p => p?.PackageIdentifier).filter((id): id is string => typeof id === 'string' && Validator.validatePackageId(id)).map(id => ({ id, source }))
        : []
    const fromSources = Array.isArray(data?.Sources)
        ? data.Sources.flatMap((s: any) => {
            const source = Object.entries(WINGET_SOURCES).find(([, d]) => d?.Name === s?.SourceDetails?.Name)?.[0] as PackageSource | undefined
            return source ? read(s.Packages, source) : []
        })
        : []
    const fromExtra = Object.entries(EXTRA_SOURCES).flatMap(([source, key]) => read(data?.[key!]?.Packages, source as PackageSource))
    const unique = new Map<string, AppEntry>([...fromSources, ...fromExtra].map(e => [`${e.source}:${e.id}`, e]))
    if (!unique.size) throw new Error('empty')
    return [...unique.values()]
}
