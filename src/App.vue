<template>
  <component :is="layout">
    <router-view />
  </component>
  <ThemeEditorPanel />
  <AppUpdate />
  <Toast />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Toast } from '@/components/ui/toast'
import ThemeEditorPanel from '@/components/shared/ThemeEditorPanel.vue'
import AppUpdate from '@/components/shared/AppUpdate.vue'
import { useThemeStore } from '@/stores/theme'
import { useAppStore, usePackagesStore } from '@/stores'
import { templates } from '@/templates'

const themeStore = useThemeStore()
const appStore = useAppStore()
const packagesStore = usePackagesStore()
const layout = computed(() => templates[themeStore.template].layout)

onMounted(() => {
  appStore.checkAdminStatus()
  packagesStore.fetchPackages()
})
</script>
