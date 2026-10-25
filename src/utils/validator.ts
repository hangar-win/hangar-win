export const PACKAGE_ID_PATTERN = '[A-Za-z0-9][A-Za-z0-9._+\\-]{0,127}'
export const VERSION_PATTERN = '[A-Za-z0-9][A-Za-z0-9._+\\-]{0,63}'
export const SEARCH_QUERY_PATTERN = '[\\p{L}\\p{N}][\\p{L}\\p{N} ._+\\-]{0,99}'

const full = (source: string) => new RegExp(`^${source}$`, 'u')
const id = full(PACKAGE_ID_PATTERN)
const version = full(VERSION_PATTERN)
const query = full(SEARCH_QUERY_PATTERN)

export const Validator = {
    validatePackageId: (value: string) => id.test(value),
    validateVersion: (value: string) => version.test(value),
    validateSearchQuery: (value: string) => query.test(value)
}
