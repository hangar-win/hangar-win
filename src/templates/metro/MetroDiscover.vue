<template>
  <div class="grid">
    <section class="bg-tint border-b border-rule px-4 md:px-8 pt-7 pb-6">
      <h1 class="font-display text-[clamp(1.625rem,1.2rem+1.2vw,2rem)] font-semibold tracking-wide leading-none">{{ t('discover.title') }}</h1>
      <p class="mt-2.5 text-sm text-ink-2">{{ t('discover.subtitle') }}</p>
      <form class="mt-5 flex flex-wrap gap-2 max-w-4xl" role="search" @submit.prevent="search">
        <label class="flex-1 min-w-[16rem] h-12 rounded-sm border-2 border-ink bg-surface flex items-center gap-3 px-4 focus-within:outline focus-within:outline-2 focus-within:outline-focus">
          <Search class="w-5 h-5" />
          <input v-model="query" class="flex-1 bg-transparent outline-none text-[0.9375rem]" :placeholder="t('discover.placeholder')" :aria-label="t('discover.placeholder')" autofocus />
          <button v-if="query" type="button" class="text-ink-3 hover:text-ink" :aria-label="t('common.clear')" @click="clear"><X class="w-4 h-4" /></button>
        </label>
        <button type="submit" class="h-12 px-6 rounded-sm bg-primary text-primary-foreground font-display tracking-wide inline-flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50" :disabled="searching || !query.trim()">
          <Loader2 v-if="searching" class="w-4 h-4 animate-spin" />{{ t('discover.search') }}
        </button>
      </form>
      <div class="mt-3 flex flex-wrap gap-2" role="radiogroup" :aria-label="t('library.sourceFilter')">
        <button
          v-for="chip in chips"
          :key="chip.value"
          role="radio"
          :aria-checked="source === chip.value"
          class="h-8 pl-1 pr-3 rounded-full border text-sm inline-flex items-center gap-2"
          :class="source === chip.value ? 'border-ink bg-ink text-bg' : 'border-rule bg-surface hover:border-ink-3'"
          @click="source = chip.value"
        >
          <MetroRoundel v-if="chip.value !== 'all'" :source="chip.value" />
          <span v-else class="w-6 h-6 rounded-full border-2 border-current" />{{ chip.label }}
        </button>
      </div>
    </section>

    <section class="px-4 md:px-8 py-6 max-w-[87.5rem]">
      <div class="mb-5 flex flex-wrap gap-2" role="radiogroup" :aria-label="t('discover.categories')">
        <button
          v-for="s in shelves"
          :key="s"
          role="radio"
          :aria-checked="!searched && shelf === s"
          class="h-9 px-3 rounded-sm border text-sm inline-flex items-center gap-2"
          :class="!searched && shelf === s ? 'border-ink bg-ink text-bg font-semibold' : 'border-rule hover:border-ink-3'"
          @click="openShelf(s)"
        ><component :is="shelfIcons[s]" class="w-4 h-4" />{{ t(`discover.shelf.${s}`) }}</button>
      </div>
      <h2 class="font-display text-xl tracking-wide mb-3">{{ searched ? t('discover.results', { n: results.length, q: searched }) : t(`discover.shelf.${shelf}`) }}</h2>
      <div v-if="searching || (!searched && loadingShelf)" class="py-12 text-ink-2"><Loader2 class="w-5 h-5 animate-spin inline mr-2" />{{ searching ? t('discover.searching') : t('discover.loadingPopular') }}</div>
      <div v-else-if="!list.length" class="py-12">
        <p class="font-semibold">{{ t('discover.noResults', { q: searched }) }}</p>
        <p class="text-sm text-ink-2 mt-1">{{ t('discover.noResultsHint') }}</p>
      </div>
      <ul v-else class="border-t border-rule">
        <li v-for="pkg in list" :key="pkg.source + pkg.id" class="min-h-row grid grid-cols-[2.5rem_minmax(0,1fr)_auto] md:grid-cols-[2.5rem_minmax(0,1fr)_10rem_12rem] items-center gap-4 border-b border-rule hover:bg-tint/50">
          <MetroRoundel :source="pkg.source" class="justify-self-center" />
          <div class="py-2 min-w-0">
            <RouterLink :to="{ name: 'detail', params: { id: pkg.id } }" class="font-semibold hover:underline underline-offset-2">{{ pkg.name }}</RouterLink>
            <div class="text-xs text-ink-3 truncate">{{ pkg.publisher || pkg.id }}</div>
          </div>
          <span class="hidden md:block text-sm text-ink-2 tabular-nums">{{ pkg.availableVersion || pkg.currentVersion || '—' }}</span>
          <div class="flex justify-end pr-2 text-sm">
            <span v-if="operationFor(pkg)?.status === 'running'" class="text-ink-2">{{ t('state.installRunning', { p: operationFor(pkg)!.progress }) }}</span>
            <button v-else-if="operationFor(pkg)?.status === 'error'" class="h-8 px-3 rounded-sm bg-primary text-primary-foreground text-xs font-semibold" @click="install(pkg)">{{ t('state.retry') }}</button>
            <span v-else-if="isInstalled(pkg)" class="text-success font-semibold inline-flex items-center gap-1.5"><Check class="w-4 h-4" />{{ t('discover.installed') }}</span>
            <button v-else class="h-8 px-4 rounded-sm bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90" @click="install(pkg)">{{ t('discover.install') }}</button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Loader2, Search, X } from 'lucide-vue-next'
import { useDiscover, shelves, shelfIcons } from '@/composables/useDiscover'
import { useFormat } from '@/composables/useFormat'
import { PackageSource } from '@/models'
import MetroRoundel from './MetroRoundel.vue'

const { t } = useI18n()
const { sourceName } = useFormat()
const { query, source, results, searched, searching, shelf, shelfItems, loadingShelf, openShelf, search, clear, isInstalled, operationFor, install } = useDiscover()
const list = computed(() => searched.value ? results.value : shelfItems.value)
const chips = computed(() => [
  { value: 'all' as const, label: t('library.allSources') },
  ...Object.values(PackageSource).map(s => ({ value: s, label: sourceName(s) }))
])
</script>
