<template>
  <div class="px-4 md:px-8 pt-7 pb-8 grid gap-5">
    <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h1 class="font-display text-[clamp(1.5rem,1.2rem+0.8vw,1.75rem)] font-semibold tracking-tight leading-none">{{ t('nav.library') }}</h1>
        <p class="mt-2 text-sm text-ink-2">
          {{ t('library.installed', { n: store.statusCounts.all }) }}
          · <b class="font-semibold" :class="store.totalUpdates ? 'text-due' : 'text-ink-2'">{{ t('library.due', { n: store.totalUpdates }) }}</b>
          · {{ store.lastChecked ? t('library.lastChecked', { time: time(store.lastChecked) }) : t('library.neverChecked') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="h-9 px-3.5 rounded-md border border-rule bg-surface text-sm inline-flex items-center gap-2 hover:bg-tint disabled:opacity-60" :disabled="store.isLoading" @click="store.fetchPackages(true)">
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': store.isLoading }" />{{ store.isLoading ? t('app.refreshing') : t('app.refresh') }}
        </button>
        <RouterLink to="/discover" class="h-9 px-3.5 rounded-md border border-rule bg-surface text-sm inline-flex items-center gap-2 hover:bg-tint">
          <Plus class="w-4 h-4" />{{ t('app.installNew') }}
        </RouterLink>
        <button
          class="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!store.totalUpdates || store.isBulkRunning"
          @click="store.updateAllPackages()"
        >
          <Loader2 v-if="store.isBulkRunning" class="w-4 h-4 animate-spin" />
          {{ store.isBulkRunning ? t('library.updatingAll') : t('library.updateAll', { n: store.totalUpdates }) }}
        </button>
      </div>
    </header>

    <div class="flex flex-wrap items-center gap-2.5">
      <div class="inline-flex rounded-md border border-rule bg-surface p-0.5" role="radiogroup" :aria-label="t('library.statusFilter')">
        <button
          v-for="s in (['due', 'all', 'current', 'other'] as const)"
          :key="s"
          role="radio"
          :aria-checked="store.statusFilter === s"
          class="h-8 px-3 rounded text-sm"
          :class="store.statusFilter === s ? 'bg-tint text-ink font-semibold' : 'text-ink-2 hover:text-ink'"
          @click="store.statusFilter = s"
        >{{ t(`library.status.${s}`) }}<span class="ml-1.5 text-ink-3">{{ store.statusCounts[s] }}</span></button>
      </div>
      <Select v-model="store.activeSource">
        <SelectTrigger class="w-48 h-9 bg-surface" :aria-label="t('library.sourceFilter')"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{{ t('library.allSources') }}</SelectItem>
          <SelectItem v-for="s in sources" :key="s" :value="s">{{ sourceName(s) }} · {{ store.sourceCounts[s] }}</SelectItem>
        </SelectContent>
      </Select>
      <label class="w-full lg:w-80 lg:ml-auto h-9 rounded-md border border-rule bg-surface flex items-center gap-2 px-3 focus-within:outline focus-within:outline-2 focus-within:outline-focus">
        <Search class="w-4 h-4 text-ink-3" />
        <input v-model="store.searchQuery" class="flex-1 bg-transparent text-sm outline-none" :placeholder="t('library.search')" :aria-label="t('library.search')" />
        <button v-if="store.searchQuery" class="text-ink-3 hover:text-ink" :aria-label="t('common.clear')" @click="store.searchQuery = ''"><X class="w-4 h-4" /></button>
      </label>
    </div>

    <p v-if="store.statusFilter === 'other'" class="text-sm text-ink-2 max-w-3xl">{{ t('library.otherHint') }}</p>

    <div class="rounded-lg border border-rule bg-surface overflow-hidden">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-tint text-left">
            <th class="label-caps h-8 px-3 w-14 border-r border-rule hidden xl:table-cell">{{ t('library.col.no') }}</th>
            <th class="label-caps h-8 px-3">{{ t('library.col.app') }}</th>
            <th class="label-caps h-8 px-3 w-24 hidden lg:table-cell">{{ t('library.col.source') }}</th>
            <th class="label-caps h-8 px-3 w-32 hidden lg:table-cell">{{ t('library.col.installed') }}</th>
            <th class="label-caps h-8 px-3 w-32 hidden lg:table-cell">{{ t('library.col.latest') }}</th>
            <th class="label-caps h-8 px-3 w-44 xl:w-52">{{ t('library.col.status') }}</th>
            <th class="h-8 px-3 w-36"><span class="sr-only">{{ t('library.col.actions') }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.isLoading && !store.packages.length">
            <td colspan="7" class="px-4 py-14 text-center text-ink-2"><Loader2 class="w-5 h-5 animate-spin inline mr-2" />{{ t('library.loading') }}</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="7" class="px-4 py-14">
              <div class="grid justify-items-center gap-3 text-center">
                <template v-if="store.statusFilter === 'due' && !store.searchQuery && store.activeSource === 'all'">
                  <LedgerStamp :label="t('library.empty.allCurrent')" :sub="store.lastChecked ? date(store.lastChecked) : undefined" />
                  <p class="text-ink-2 max-w-sm">{{ t('library.empty.allCurrentDesc') }}</p>
                  <button class="text-sm font-semibold underline underline-offset-2" @click="store.statusFilter = 'all'">{{ t('library.empty.showAll') }}</button>
                </template>
                <template v-else>
                  <p class="font-semibold">{{ store.searchQuery ? t('library.empty.noMatch', { q: store.searchQuery }) : t('library.empty.none') }}</p>
                  <button class="text-sm font-semibold underline underline-offset-2" @click="resetFilters">{{ t('library.empty.reset') }}</button>
                </template>
              </div>
            </td>
          </tr>
          <template v-for="(pkg, i) in rows" :key="packageKey(pkg)">
            <tr class="h-row border-t border-rule first:border-t-0 hover:bg-bg/60">
              <td class="px-3 text-xs text-ink-3 border-r border-rule hidden xl:table-cell">{{ String(i + 1).padStart(3, '0') }}</td>
              <td class="px-3 py-1.5">
                <span v-if="pkg.unmanaged" class="font-semibold">{{ pkg.name }}</span>
                <RouterLink v-else :to="{ name: 'detail', params: { id: pkg.id } }" class="font-semibold hover:underline underline-offset-2">{{ pkg.name }}</RouterLink>
                <div v-if="pkg.publisher" class="text-xs text-ink-3">{{ pkg.publisher }}</div>
                <div class="lg:hidden text-xs text-ink-2 mt-0.5"><span v-if="!pkg.unmanaged" class="font-bold tracking-[0.06em]" :style="{ color: sourceColor(pkg.source) }">{{ sourceCode(pkg.source) }} · </span>{{ pkg.currentVersion }}<template v-if="pkg.hasUpdate"> → <b class="text-ink">{{ pkg.availableVersion }}</b></template></div>
              </td>
              <td class="px-3 text-[0.6875rem] font-bold tracking-[0.06em] hidden lg:table-cell" :style="{ color: pkg.unmanaged ? undefined : sourceColor(pkg.source) }">{{ pkg.unmanaged ? '—' : sourceCode(pkg.source) }}</td>
              <td class="px-3 text-ink-2 hidden lg:table-cell">{{ pkg.currentVersion || '—' }}</td>
              <td class="px-3 hidden lg:table-cell" :class="pkg.hasUpdate ? 'font-semibold' : 'text-ink-3'">{{ pkg.hasUpdate ? pkg.availableVersion : '—' }}</td>
              <td class="px-3"><LedgerStatus :pkg="pkg" :expanded="expanded === packageKey(pkg)" @toggle="toggle(pkg)" /></td>
              <td class="px-3 text-right whitespace-nowrap">
                <button
                  v-if="pkg.hasUpdate && !pkg.updating"
                  class="h-7 px-3 rounded-md border border-primary text-primary text-xs font-semibold hover:bg-primary hover:text-primary-foreground"
                  @click="store.updatePackage(pkg)"
                >{{ store.lastOperationFor(pkg)?.status === 'error' ? t('state.retry') : t('state.update') }}</button>
                <DropdownMenu>
                  <DropdownMenuTrigger class="ml-1 h-7 w-7 inline-grid place-items-center rounded-md text-ink-2 hover:bg-tint hover:text-ink" :aria-label="t('state.more', { name: pkg.name })">
                    <MoreHorizontal class="w-4 h-4" />
                  </DropdownMenuTrigger>
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
              </td>
            </tr>
            <tr v-if="expanded === packageKey(pkg)" class="bg-bg">
              <td colspan="7" class="px-3 py-3">
                <CommandOutput :error="store.lastOperationFor(pkg)?.error" :output="store.lastOperationFor(pkg)?.output" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <ConfirmUninstall :open="!!pending" :name="pending?.name ?? ''" @update:open="v => !v && (pending = null)" @confirm="pending && store.uninstallPackage(pending)" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Loader2, MoreHorizontal, Plus, RefreshCw, Search, X } from 'lucide-vue-next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import ConfirmUninstall from '@/components/shared/ConfirmUninstall.vue'
import CommandOutput from '@/components/shared/CommandOutput.vue'
import { usePackagesStore, packageKey } from '@/stores'
import { useFormat } from '@/composables/useFormat'
import { PackageSource } from '@/models'
import type { Package } from '@/models'
import LedgerStatus from './LedgerStatus.vue'
import LedgerStamp from './LedgerStamp.vue'

const { t } = useI18n()
const router = useRouter()
const store = usePackagesStore()
const { date, time, sourceName, sourceCode, sourceColor } = useFormat()

const sources = Object.values(PackageSource)
const rows = computed(() => store.filteredPackages)
const expanded = ref<string | null>(null)
const pending = ref<Package | null>(null)

function toggle(pkg: Package) {
  expanded.value = expanded.value === packageKey(pkg) ? null : packageKey(pkg)
}

function resetFilters() {
  store.searchQuery = ''
  store.activeSource = 'all'
  store.statusFilter = 'all'
}
</script>
