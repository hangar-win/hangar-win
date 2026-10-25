import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ConsoleLog {
    type: 'log' | 'error' | 'warn' | 'info'
    message: string
    timestamp: number
}

export const useUIStore = defineStore('ui', () => {
    const consoleOpen = ref(false)
    const consoleLogs = ref<ConsoleLog[]>([])

    function addConsoleLog(type: ConsoleLog['type'], message: string) {
        consoleLogs.value.push({ type, message, timestamp: Date.now() })
        if (consoleLogs.value.length > 500) consoleLogs.value.shift()
    }

    function clearConsole() {
        consoleLogs.value = []
    }

    function toggleConsole() {
        consoleOpen.value = !consoleOpen.value
    }

    function setupConsoleInterceptors() {
        for (const type of ['log', 'error', 'warn', 'info'] as const) {
            const original = console[type]
            console[type] = (...args: any[]) => {
                original(...args)
                addConsoleLog(type, args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '))
            }
        }
    }

    return { consoleOpen, consoleLogs, addConsoleLog, clearConsole, toggleConsole, setupConsoleInterceptors }
})
