<template>
  <div class="h-screen flex bg-bg text-ink overflow-hidden">
    <aside class="w-16 lg:w-[14.5rem] shrink-0 bg-rail text-rail-ink flex flex-col pt-5 pb-4">
      <div class="flex items-center gap-3 px-4 lg:px-5 pb-6">
        <div class="w-8 h-8 rounded-md border-[1.5px] border-rail-muted grid place-items-center">
          <Package class="w-4 h-4" />
        </div>
        <div class="min-w-0 hidden lg:block">
          <div class="font-display font-semibold leading-tight">{{ t('app.title') }}</div>
          <div class="text-xs text-rail-muted">{{ t('app.sources') }}</div>
        </div>
      </div>

      <nav class="grid gap-0.5" :aria-label="t('nav.label')">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="relative flex items-center gap-3 h-10 pr-4 text-sm transition-colors"
          :title="item.label"
          :class="isActive(item.to) ? 'bg-bg text-ink font-semibold rounded-l-lg ml-2.5 pl-3 lg:pl-2.5' : 'pl-5 text-rail-muted hover:text-rail-ink'"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          <component :is="item.icon" class="w-4 h-4 shrink-0" />
          <span class="flex-1 sr-only lg:not-sr-only">{{ item.label }}</span>
          <span v-if="item.count" class="lg:hidden absolute left-8 top-2 w-2 h-2 rounded-full" :class="isActive(item.to) ? 'bg-due' : 'bg-rail-ink'" />
          <span v-if="item.count" class="hidden lg:inline text-xs font-bold" :class="isActive(item.to) ? item.tone : 'text-rail-ink'">{{ item.count }}</span>
        </RouterLink>
      </nav>

      <div class="mt-auto grid gap-3 px-4">
        <ShieldAlert v-if="!appStore.isAdmin" class="lg:hidden w-5 h-5 mx-auto" role="img" :aria-label="t('app.notAdminTitle')" />
        <div v-if="!appStore.isAdmin" class="hidden lg:block rounded-lg border border-rail-muted/50 px-3 py-2.5 text-xs leading-snug">
          <div class="flex items-center gap-1.5 font-semibold"><ShieldAlert class="w-3.5 h-3.5" />{{ t('app.notAdminTitle') }}</div>
          <p class="text-rail-muted mt-0.5">{{ t('app.notAdminDesc') }}</p>
        </div>
        <label class="flex items-center justify-center lg:justify-between gap-3 text-sm px-1 cursor-pointer" :title="t('app.silentInstall')">
          <span class="hidden lg:block">
            <span class="block">{{ t('app.silentInstall') }}</span>
            <span class="block text-xs text-rail-muted">{{ t('app.silentHint') }}</span>
          </span>
          <Switch v-model="packagesStore.silentInstall" :aria-label="t('app.silentInstall')" class="data-[state=checked]:bg-rail-muted data-[state=unchecked]:bg-rail-ink/25" />
        </label>
      </div>
    </aside>

    <div class="flex-1 min-w-0 flex flex-col">
      <main class="flex-1 min-h-0 overflow-auto">
        <slot />
      </main>

      <section v-if="ui.consoleOpen" class="h-64 shrink-0 border-t border-rule bg-surface flex flex-col" :aria-label="t('console.title')">
        <div class="h-9 shrink-0 flex items-center gap-3 px-4 md:px-8 bg-tint border-b border-rule">
          <Terminal class="w-4 h-4 text-ink-2" />
          <span class="label-caps flex-1">{{ t('console.title') }}</span>
          <button class="text-xs font-semibold text-ink-2 hover:text-ink" @click="ui.clearConsole()">{{ t('console.clear') }}</button>
          <button class="p-1 rounded text-ink-2 hover:text-ink" :aria-label="t('console.close')" @click="ui.toggleConsole()"><X class="w-4 h-4" /></button>
        </div>
        <div class="flex-1 min-h-0"><ConsoleLog /></div>
      </section>

      <footer class="h-10 shrink-0 border-t border-rule bg-surface flex items-center gap-5 px-4 md:px-8 text-sm text-ink-2">
        <RouterLink to="/operations" class="flex items-center gap-2 hover:text-ink">
          <span class="w-2 h-2 rounded-full" :class="packagesStore.runningCount ? 'bg-primary animate-pulse' : 'bg-rule'" />
          {{ t('operations.runningSummary', { n: packagesStore.runningCount }) }}
        </RouterLink>
        <RouterLink v-if="packagesStore.failedCount" to="/operations" class="flex items-center gap-2 text-danger hover:underline">
          <span class="w-2 h-2 rounded-full bg-danger" />
          {{ t('operations.failedSummary', { n: packagesStore.failedCount }) }}
        </RouterLink>
        <button class="ml-auto flex items-center gap-2 font-semibold text-ink hover:text-primary" :aria-expanded="ui.consoleOpen" @click="ui.toggleConsole()">
          <Terminal class="w-4 h-4" />
          {{ ui.consoleOpen ? t('console.close') : t('console.open') }}
        </button>
      </footer>
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
  { to: '/', label: t('nav.library'), icon: LayoutList, count: packagesStore.totalUpdates, tone: 'text-due' },
  { to: '/discover', label: t('nav.discover'), icon: Compass },
  { to: '/operations', label: t('nav.operations'), icon: Activity, count: packagesStore.runningCount, tone: 'text-primary' },
  { to: '/settings', label: t('nav.settings'), icon: Settings }
])

const isActive = (to: string) => to === '/' ? route.path === '/' || route.name === 'detail' : route.path.startsWith(to)
</script>
