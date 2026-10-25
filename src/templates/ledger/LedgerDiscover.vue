<template>
  <div class="px-4 md:px-8 pt-7 pb-8 grid gap-5">
    <header>
      <h1 class="font-display text-[clamp(1.5rem,1.2rem+0.8vw,1.75rem)] font-semibold tracking-tight leading-none">{{ t('discover.title') }}</h1>
      <p class="mt-2 text-sm text-ink-2">{{ t('discover.subtitle') }}</p>
    </header>

    <form class="flex flex-wrap gap-2.5" role="search" @submit.prevent="search">
      <label class="flex-1 min-w-[16rem] h-11 rounded-md border border-rule bg-surface flex items-center gap-2.5 px-3.5 focus-within:outline focus-within:outline-2 focus-within:outline-focus">
        <Search class="w-5 h-5 text-ink-3" />
        <input v-model="query" class="flex-1 bg-transparent outline-none" :placeholder="t('discover.placeholder')" :aria-label="t('discover.placeholder')" autofocus />
        <button v-if="query" type="button" class="text-ink-3 hover:text-ink" :aria-label="t('common.clear')" @click="clear"><X class="w-4 h-4" /></button>
      </label>
      <Select v-model="source">
        <SelectTrigger class="w-48 h-11 bg-surface" :aria-label="t('library.sourceFilter')"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{{ t('library.allSources') }}</SelectItem>
          <SelectItem v-for="s in sources" :key="s" :value="s">{{ sourceName(s) }}</SelectItem>
        </SelectContent>
      </Select>
      <button type="submit" class="h-11 px-6 rounded-md bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 hover:bg-primary/90 disabled:opacity-60" :disabled="searching || !query.trim()">
        <Loader2 v-if="searching" class="w-4 h-4 animate-spin" />{{ t('discover.search') }}
      </button>
    </form>

    <div class="flex flex-wrap gap-2" role="radiogroup" :aria-label="t('discover.categories')">
      <button
        v-for="s in shelves"
        :key="s"
        role="radio"
        :aria-checked="!searched && shelf === s"
        class="h-8 px-3 rounded-full border text-sm inline-flex items-center gap-1.5"
        :class="!searched && shelf === s ? 'border-primary bg-primary text-primary-foreground font-semibold' : 'border-rule bg-surface text-ink-2 hover:text-ink hover:border-ink-3'"
        @click="openShelf(s)"
      ><component :is="shelfIcons[s]" class="w-4 h-4" />{{ t(`discover.shelf.${s}`) }}</button>
    </div>

    <section class="grid gap-2.5">
      <h2 class="label-caps">
        {{ searched ? t('discover.results', { n: results.length, q: searched }) : t(`discover.shelf.${shelf}`) }}
      </h2>
      <div class="rounded-lg border border-rule bg-surface overflow-hidden">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-tint text-left">
              <th class="label-caps h-8 px-3">{{ t('library.col.app') }}</th>
              <th class="label-caps h-8 px-3 w-24 hidden lg:table-cell">{{ t('library.col.source') }}</th>
              <th class="label-caps h-8 px-3 w-40 hidden md:table-cell">{{ t('library.col.version') }}</th>
              <th class="h-8 px-3 w-44"><span class="sr-only">{{ t('library.col.actions') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="searching || (!searched && loadingShelf)">
              <td colspan="4" class="px-4 py-12 text-center text-ink-2"><Loader2 class="w-5 h-5 animate-spin inline mr-2" />{{ searching ? t('discover.searching') : t('discover.loadingPopular') }}</td>
            </tr>
            <tr v-else-if="!list.length">
              <td colspan="4" class="px-4 py-12 text-center">
                <p class="font-semibold">{{ t('discover.noResults', { q: searched }) }}</p>
                <p class="text-sm text-ink-2 mt-1">{{ t('discover.noResultsHint') }}</p>
              </td>
            </tr>
            <tr v-for="pkg in list" v-else :key="pkg.source + pkg.id" class="h-row border-t border-rule first:border-t-0 hover:bg-bg/60">
              <td class="px-3 py-1.5">
                <RouterLink :to="{ name: 'detail', params: { id: pkg.id } }" class="font-semibold hover:underline underline-offset-2">{{ pkg.name }}</RouterLink>
                <div class="text-xs text-ink-3">{{ pkg.publisher || pkg.id }}</div>
                <div class="lg:hidden text-xs text-ink-2 mt-0.5"><span class="font-bold tracking-[0.06em]" :style="{ color: sourceColor(pkg.source) }">{{ sourceCode(pkg.source) }}</span><span class="md:hidden"> · {{ pkg.availableVersion || pkg.currentVersion }}</span></div>
              </td>
              <td class="px-3 text-[0.6875rem] font-bold tracking-[0.06em] hidden lg:table-cell" :style="{ color: sourceColor(pkg.source) }">{{ sourceCode(pkg.source) }}</td>
              <td class="px-3 text-ink-2 hidden md:table-cell">{{ pkg.availableVersion || pkg.currentVersion || '—' }}</td>
              <td class="px-3 text-right">
                <template v-if="operationFor(pkg)?.status === 'running'">
                  <span class="text-xs text-ink-2">{{ t('state.installRunning', { p: operationFor(pkg)!.progress }) }}</span>
                </template>
                <span v-else-if="operationFor(pkg)?.status === 'error'" class="text-sm">
                  <span class="font-semibold text-danger">{{ t('state.failed') }}</span>
                  <button class="ml-2 h-7 px-3 rounded-md border border-primary text-primary text-xs font-semibold hover:bg-primary hover:text-primary-foreground" @click="install(pkg)">{{ t('state.retry') }}</button>
                </span>
                <span v-else-if="isInstalled(pkg)" class="inline-flex items-center gap-1.5 text-sm text-ink-3"><Check class="w-3.5 h-3.5" />{{ t('discover.installed') }}</span>
                <button v-else class="h-7 px-3 rounded-md border border-primary text-primary text-xs font-semibold hover:bg-primary hover:text-primary-foreground" @click="install(pkg)">{{ t('discover.install') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Loader2, Search, X } from 'lucide-vue-next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDiscover, shelves, shelfIcons } from '@/composables/useDiscover'
import { useFormat } from '@/composables/useFormat'
import { PackageSource } from '@/models'

const { t } = useI18n()
const { sourceName, sourceCode, sourceColor } = useFormat()
const { query, source, results, searched, searching, shelf, shelfItems, loadingShelf, openShelf, search, clear, isInstalled, operationFor, install } = useDiscover()
const sources = Object.values(PackageSource)
const list = computed(() => searched.value ? results.value : shelfItems.value)
</script>
