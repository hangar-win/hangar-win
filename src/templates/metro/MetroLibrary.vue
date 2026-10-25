<template>
  <div class="px-4 md:px-8 pt-7 pb-10 grid gap-6 max-w-[87.5rem]">
    <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h1 class="font-display text-[clamp(1.625rem,1.2rem+1.2vw,2rem)] font-semibold tracking-wide leading-none">{{ t('nav.library') }}</h1>
        <p class="mt-2.5 text-sm text-ink-2">
          {{ t('library.installed', { n: store.statusCounts.all }) }} ·
          <b class="font-semibold text-ink">{{ t('library.dueShort', { n: store.totalUpdates }) }}</b> ·
          {{ store.lastChecked ? t('library.lastChecked', { time: time(store.lastChecked) }) : t('library.neverChecked') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="h-10 px-4 rounded-sm border border-rule text-sm inline-flex items-center gap-2 hover:bg-tint disabled:opacity-60" :disabled="store.isLoading" @click="store.fetchPackages(true)">
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': store.isLoading }" />{{ store.isLoading ? t('app.refreshing') : t('app.refresh') }}
        </button>
        <RouterLink to="/discover" class="h-10 px-4 rounded-sm border border-rule text-sm inline-flex items-center gap-2 hover:bg-tint"><Plus class="w-4 h-4" />{{ t('app.installNew') }}</RouterLink>
        <button
          class="h-10 px-5 rounded-sm bg-primary text-primary-foreground font-display tracking-wide inline-flex items-center gap-2 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!store.totalUpdates || store.isBulkRunning"
          @click="store.updateAllPackages()"
        >
          <Loader2 v-if="store.isBulkRunning" class="w-4 h-4 animate-spin" /><ArrowRight v-else class="w-4 h-4" />
          {{ store.isBulkRunning ? t('library.updatingAll') : t('library.updateAllMetro', { n: store.totalUpdates }) }}
        </button>
      </div>
    </header>

    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="chip in chips"
        :key="chip.value"
        class="h-9 pl-1.5 pr-3 rounded-full border text-sm inline-flex items-center gap-2"
        :class="store.activeSource === chip.value ? 'border-ink bg-ink text-bg' : 'border-rule hover:border-ink-3'"
        :aria-pressed="store.activeSource === chip.value"
        @click="store.activeSource = chip.value"
      >
        <MetroRoundel v-if="chip.value !== 'all'" :source="chip.value" />
        <span v-else class="w-6 h-6 rounded-full border-2 border-current" />
        {{ chip.label }}<span class="opacity-70">{{ chip.count }}</span>
      </button>
      <div class="ml-auto inline-flex rounded-sm border border-rule p-0.5" role="radiogroup" :aria-label="t('library.statusFilter')">
        <button
          v-for="s in (['due', 'all', 'current', 'other'] as const)"
          :key="s"
          role="radio"
          :aria-checked="store.statusFilter === s"
          class="h-8 px-3 rounded-sm text-sm"
          :class="store.statusFilter === s ? 'bg-tint font-semibold' : 'text-ink-2 hover:text-ink'"
          @click="store.statusFilter = s"
        >{{ t(`library.status.${s}`) }} <span class="text-ink-3">{{ store.statusCounts[s] }}</span></button>
      </div>
      <label class="w-full sm:w-72 h-9 rounded-sm border border-rule flex items-center gap-2 px-3 focus-within:outline focus-within:outline-2 focus-within:outline-focus">
        <Search class="w-4 h-4 text-ink-3" />
        <input v-model="store.searchQuery" class="flex-1 bg-transparent text-sm outline-none" :placeholder="t('library.search')" :aria-label="t('library.search')" />
        <button v-if="store.searchQuery" class="text-ink-3 hover:text-ink" :aria-label="t('common.clear')" @click="store.searchQuery = ''"><X class="w-4 h-4" /></button>
      </label>
    </div>

    <p v-if="store.statusFilter === 'other'" class="text-sm text-ink-2 max-w-3xl">{{ t('library.otherHint') }}</p>

    <div v-if="store.isLoading && !store.packages.length" class="py-16 text-center text-ink-2"><Loader2 class="w-5 h-5 animate-spin inline mr-2" />{{ t('library.loading') }}</div>

    <div v-else-if="!groups.length" class="py-16 grid justify-items-center gap-3 text-center">
      <template v-if="store.statusFilter === 'due' && !store.searchQuery && store.activeSource === 'all'">
        <span class="w-6 h-6 rounded-full bg-success" />
        <p class="font-display text-xl tracking-wide">{{ t('library.empty.allCurrent') }}</p>
        <p class="text-ink-2 max-w-sm">{{ t('library.empty.allCurrentDesc') }}</p>
        <button class="text-sm font-semibold underline underline-offset-2" @click="store.statusFilter = 'all'">{{ t('library.empty.showAll') }}</button>
      </template>
      <template v-else>
        <p class="font-semibold">{{ store.searchQuery ? t('library.empty.noMatch', { q: store.searchQuery }) : t('library.empty.none') }}</p>
        <button class="text-sm font-semibold underline underline-offset-2" @click="resetFilters">{{ t('library.empty.reset') }}</button>
      </template>
    </div>

    <section v-for="group in groups" :key="group.key" class="grid" :style="{ '--line': group.source ? `rgb(var(--src-${group.source}))` : 'rgb(var(--ink-3))' }">
      <h2 class="flex items-center gap-3 pb-3">
        <MetroRoundel v-if="group.source" :source="group.source" large />
        <span class="font-display text-xl tracking-wide">{{ group.source ? t('metro.line', { name: sourceName(group.source) }) : t('library.status.other') }}</span>
        <span class="text-sm text-ink-3">{{ t('metro.stops', { n: group.items.length }) }}</span>
      </h2>
      <ul class="border-t border-rule">
        <li v-for="(pkg, i) in group.items" :key="pkg.id" class="border-b border-rule">
          <div class="min-h-row grid grid-cols-[2.5rem_minmax(0,1fr)_auto] lg:grid-cols-[3rem_minmax(0,1fr)_20rem_13rem] items-center gap-4 pr-2 hover:bg-tint/50">
            <div class="relative self-stretch" aria-hidden="true">
              <span class="absolute left-1/2 -translate-x-1/2 w-1.5" :class="[i === 0 ? 'top-1/2' : 'top-0', i === group.items.length - 1 ? 'bottom-1/2' : 'bottom-0']" :style="{ background: 'var(--line)' }" />
              <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-surface border-[3px]" :style="{ borderColor: 'var(--line)' }" />
            </div>
            <div class="py-2 min-w-0">
              <span v-if="pkg.unmanaged" class="font-semibold">{{ pkg.name }}</span>
              <RouterLink v-else :to="{ name: 'detail', params: { id: pkg.id } }" class="font-semibold hover:underline underline-offset-2">{{ pkg.name }}</RouterLink>
              <div v-if="pkg.publisher" class="text-xs text-ink-3 truncate">{{ pkg.publisher }}</div>
              <MetroJourney :pkg="pkg" class="lg:hidden mt-1.5" />
            </div>
            <MetroJourney :pkg="pkg" class="hidden lg:flex" />
            <div class="flex items-center justify-end gap-2 text-sm">
              <template v-if="opFor(pkg)?.status === 'running'">
                <span class="text-ink-2">{{ t(`state.${opFor(pkg)!.type}Running`, { p: opFor(pkg)!.progress }) }}</span>
              </template>
              <template v-else-if="opFor(pkg)?.status === 'error' && pkg.hasUpdate">
                <button class="text-danger font-semibold underline underline-offset-2" :aria-expanded="expanded === pkg.id" @click="expanded = expanded === pkg.id ? null : pkg.id">{{ t('state.failed') }}</button>
                <button class="h-8 px-3 rounded-sm bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90" @click="store.updatePackage(pkg)">{{ t('state.retry') }}</button>
              </template>
              <button v-else-if="pkg.hasUpdate" class="h-8 px-3 rounded-sm bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90" @click="store.updatePackage(pkg)">{{ t('state.update') }}</button>
              <span v-else-if="pkg.unmanaged" class="text-ink-3">{{ t('library.noSource') }}</span>
              <span v-else-if="pkg.held" class="inline-flex items-center gap-1.5 text-ink-2"><PauseCircle class="w-3.5 h-3.5" />{{ pkg.held === 'pin' ? t('state.pinned') : t('state.skipped', { v: pkg.availableVersion }) }}</span>
              <span v-else-if="store.records[packageKey(pkg)]" class="text-success font-semibold">{{ t('metro.arrived', { date: date(store.records[packageKey(pkg)].date) }) }}</span>
              <span v-else class="text-ink-3">{{ t('state.current') }}</span>
              <DropdownMenu>
                <DropdownMenuTrigger class="h-8 w-8 grid place-items-center rounded-sm text-ink-2 hover:bg-tint hover:text-ink" :aria-label="t('state.more', { name: pkg.name })"><MoreHorizontal class="w-4 h-4" /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <template v-if="!pkg.unmanaged">
                    <DropdownMenuItem @click="router.push({ name: 'detail', params: { id: pkg.id } })">{{ t('state.openDetail') }}</DropdownMenuItem>
                    <DropdownMenuItem v-if="pkg.held" @click="store.release(pkg)">{{ t('state.release') }}</DropdownMenuItem>
                    <template v-else>
                      <DropdownMenuItem v-if="pkg.hasUpdate" @click="store.hold(pkg, 'skip')">{{ t('state.skipVersion', { v: pkg.availableVersion }) }}</DropdownMenuItem>
                      <DropdownMenuItem @click="store.hold(pkg, 'pin')">{{ t('state.pin') }}</DropdownMenuItem>
                    </template>
                  </template>
                  <DropdownMenuItem class="text-danger" :disabled="pkg.updating" @click="pending = pkg">{{ t('state.uninstall') }}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div v-if="expanded === pkg.id" class="pl-10 lg:pl-16 pr-2 pb-3">
            <CommandOutput :error="opFor(pkg)?.error" :output="opFor(pkg)?.output" />
          </div>
        </li>
      </ul>
    </section>

    <ConfirmUninstall :open="!!pending" :name="pending?.name ?? ''" @update:open="v => !v && (pending = null)" @confirm="pending && store.uninstallPackage(pending)" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowRight, Loader2, MoreHorizontal, PauseCircle, Plus, RefreshCw, Search, X } from 'lucide-vue-next'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import ConfirmUninstall from '@/components/shared/ConfirmUninstall.vue'
import CommandOutput from '@/components/shared/CommandOutput.vue'
import { usePackagesStore, packageKey } from '@/stores'
import { useFormat } from '@/composables/useFormat'
import { PackageSource } from '@/models'
import type { Package } from '@/models'
import MetroRoundel from './MetroRoundel.vue'
import MetroJourney from './MetroJourney.vue'

const { t } = useI18n()
const router = useRouter()
const store = usePackagesStore()
const { date, time, sourceName } = useFormat()

const expanded = ref<string | null>(null)
const pending = ref<Package | null>(null)
const opFor = (pkg: Package) => store.lastOperationFor(pkg)

const chips = computed(() => [
  { value: 'all' as const, label: t('library.allSources'), count: store.statusCounts.all },
  ...Object.values(PackageSource).filter(s => store.sourceCounts[s]).map(s => ({ value: s, label: sourceName(s), count: store.sourceCounts[s] }))
])

const groups = computed(() => (store.statusFilter === 'other'
  ? [{ key: 'other', source: undefined, items: store.filteredPackages }]
  : Object.values(PackageSource).map(source => ({ key: source, source, items: store.filteredPackages.filter(p => p.source === source) })))
  .filter(g => g.items.length))

function resetFilters() {
  store.searchQuery = ''
  store.activeSource = 'all'
  store.statusFilter = 'all'
}
</script>
