import { invoke } from '@tauri-apps/api/core'
import { Command } from '@tauri-apps/plugin-shell'
import type { BuiltCommand } from './command-builder'

export interface IpcResponse {
    success: boolean
    stdout: string
    stderr: string
    error?: string
}

const decoder = new TextDecoder()

class IpcService {
    async executeCommand(command: BuiltCommand): Promise<IpcResponse> {
        try {
            const output = await Command.create(command.scope, command.args, { encoding: 'raw' }).execute()
            return {
                success: output.code === 0,
                stdout: decoder.decode(new Uint8Array(output.stdout)),
                stderr: decoder.decode(new Uint8Array(output.stderr))
            }
        } catch (error: any) {
            console.error('IPC executeCommand error:', error)
            const message = error?.message || String(error)
            return { success: false, stdout: '', stderr: message, error: message }
        }
    }

    async isAdmin(): Promise<boolean> {
        try {
            return await invoke<boolean>('is_elevated')
        } catch {
            return true
        }
    }
}

export const ipcService = new IpcService()
