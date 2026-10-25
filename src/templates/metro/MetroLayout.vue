<template>
  <div class="h-screen flex flex-col bg-bg text-ink overflow-hidden">
    <header class="h-14 shrink-0 bg-rail text-rail-ink flex items-stretch px-3 lg:px-5 gap-3 lg:gap-6">
      <div class="flex items-center gap-2.5 pr-2">
        <span class="w-8 h-8 rounded-sm bg-rail-ink text-rail grid place-items-center"><Package class="w-4 h-4" /></span>
        <span class="hidden xl:inline font-display text-[1.0625rem] font-semibold tracking-wide">{{ t('app.title') }}</span>
      </div>

      <nav class="flex items-stretch" :aria-label="t('nav.label')">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="relative flex items-center gap-2 px-3 lg:px-4 font-display text-[0.9375rem] tracking-wide transition-colors"
          :class="isActive(item.to) ? 'text-rail-ink' : 'text-rail-muted hover:text-rail-ink'"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          :title="item.label"
        >
          <component :is="item.icon" class="w-4 h-4" />
          <span class="sr-only lg:not-sr-only">{{ item.label }}</span>
          <span v-if="item.count" class="min-w-5 h-5 px-1.5 rounded-sm bg-signature text-[#15171A] text-xs font-bold grid place-items-center">{{ item.count }}</span>
          <span v-if="isActive(item.to)" class="absolute left-3 right-3 bottom-0 h-1 bg-signature" />
        </RouterLink>
      </nav>

      <div class="ml-auto flex items-center gap-3 lg:gap-4 text-sm">
        <RouterLink v-if="packagesStore.runningCount" to="/operations" class="flex items-center gap-2 text-rail-ink">
          <span class="w-2.5 h-2.5 rounded-full bg-signature animate-station-pulse" /><span class="hidden xl:inline">{{ t('operations.runningSummary', { n: packagesStore.runningCount }) }}</span>
        </RouterLink>
        <span v-if="!appStore.isAdmin" class="flex items-center gap-1.5 text-signature font-semibold"><ShieldAlert class="w-4 h-4" role="img" :aria-label="t('app.notAdminShort')" /><span class="hidden lg:inline">{{ t('app.notAdminShort') }}</span></span>
        <label class="flex items-center gap-2 cursor-pointer text-rail-muted" :title="t('app.silentHint')">
          <span class="hidden lg:inline">{{ t('app.silentInstall') }}</span>
          <Switch v-model="packagesStore.silentInstall" :aria-label="t('app.silentInstall')" class="data-[state=checked]:bg-signature data-[state=unchecked]:bg-rail-ink/25" />
        </label>
        <button
          class="h-8 px-3 rounded-sm border border-rail-muted/40 flex items-center gap-2 hover:bg-rail-ink/10"
          :class="{ 'bg-rail-ink/10': ui.consoleOpen }"
          :aria-expanded="ui.consoleOpen"
          :aria-label="t('console.title')"
          @click="ui.toggleConsole()"
        ><Terminal class="w-4 h-4" /><span class="hidden lg:inline">{{ t('console.title') }}</span></button>
      </div>
    </header>

    <div class="flex-1 min-h-0 flex">
      <main class="flex-1 min-w-0 overflow-auto"><slot /></main>
      <aside v-if="ui.consoleOpen" class="w-[min(26.25rem,45vw)] shrink-0 bg-rail text-rail-ink flex flex-col border-l border-rule" :aria-label="t('console.title')">
        <div class="h-11 shrink-0 flex items-center gap-3 px-4 border-b border-rail-muted/20">
          <span class="font-display tracking-wide flex-1">{{ t('console.title') }}</span>
          <button class="text-xs font-semibold text-rail-muted hover:text-rail-ink" @click="ui.clearConsole()">{{ t('console.clear') }}</button>
          <button class="p-1 text-rail-muted hover:text-rail-ink" :aria-label="t('console.close')" @click="ui.toggleConsole()"><X class="w-4 h-4" /></button>
        </div>
        <div class="flex-1 min-h-0 metro-console"><ConsoleLog /></div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Activity, Compass, LayoutList, Package, Settings, ShieldAlert, Terminal, X } from 'lucide-vue-next'
import { Switch } from '@/components/ui/switch'
import ConsoleLog from '@/components/shared/ConsoleLog.vue'
import { useAppStore, usePackagesStore, useUIStore } from '@/stores'

const { t } = useI18n()
const route = useRoute()
const appStore = useAppStore()
const packagesStore = usePackagesStore()
const ui = useUIStore()

const nav = computed(() => [
  { to: '/', label: t('nav.library'), icon: LayoutList, count: packagesStore.totalUpdates },
  { to: '/discover', label: t('nav.discover'), icon: Compass },
  { to: '/operations', label: t('nav.operations'), icon: Activity },
  { to: '/settings', label: t('nav.settings'), icon: Settings }
])

const isActive = (to: string) => to === '/' ? route.path === '/' || route.name === 'detail' : route.path.startsWith(to)
</script>

<style scoped>
.metro-console :deep(.text-ink-3) { color: rgb(var(--rail-muted)); }
.metro-console :deep(.text-ink-2) { color: rgb(var(--rail-ink)); }
</style>
