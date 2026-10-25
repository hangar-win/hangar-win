import { Validator } from '@/utils/validator'

type Arg = string | { param: 'id' | 'version' | 'query' }

const QUERY: Arg = { param: 'query' }

const templates = {
    'choco.version': ['--version'],
    'choco.list': ['list', '-r'],
    'choco.outdated': ['outdated', '-r'],
    'choco.search': ['search', QUERY, '-r']
} satisfies Record<string, Arg[]>

export type CommandTemplate = keyof typeof templates

export interface BuiltCommand {
    scope: string
    args: string[]
}

const checks = {
    id: Validator.validatePackageId,
    version: Validator.validateVersion,
    query: Validator.validateSearchQuery
}

export class CommandBuilder {
    static build(template: CommandTemplate, params: Partial<Record<'id' | 'version' | 'query', string>> = {}): BuiltCommand {
        const args = (templates[template] as Arg[]).map(arg => {
            if (typeof arg === 'string') return arg
            const value = params[arg.param]?.trim() ?? ''
            if (!checks[arg.param](value)) throw new Error(`Invalid ${arg.param}: ${value}`)
            return value
        })
        return { scope: template.replace(/\./g, '-'), args }
    }
}
