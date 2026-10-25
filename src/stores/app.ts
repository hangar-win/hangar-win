import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { ipcService } from '@/services/ipc'
import i18n from '@/i18n'

export type Locale = 'tr' | 'en'

export const useAppStore = defineStore('app', () => {
    const isAdmin = ref(true)
    const locale = useStorage<Locale>('locale', 'tr')

    watch(locale, value => { i18n.global.locale.value = value }, { immediate: true })

    function setLocale(value: Locale) {
        locale.value = value
    }

    async function checkAdminStatus() {
        try {
            isAdmin.value = await ipcService.isAdmin()
        } catch (error) {
            console.error('Admin check failed:', error)
        }
    }

    return { isAdmin, locale, setLocale, checkAdminStatus }
})
