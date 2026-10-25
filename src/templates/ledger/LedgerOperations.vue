<template>
  <div class="px-4 md:px-8 pt-7 pb-8 grid gap-5">
    <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h1 class="font-display text-[clamp(1.5rem,1.2rem+0.8vw,1.75rem)] font-semibold tracking-tight leading-none">{{ t('nav.operations') }}</h1>
        <p class="mt-2 text-sm text-ink-2">
          {{ t('operations.runningSummary', { n: store.runningCount }) }} · <span :class="store.failedCount ? 'text-danger font-semibold' : ''">{{ t('operations.failedSummary', { n: store.failedCount }) }}</span>
        </p>
      </div>
      <button v-if="hasCompleted" class="h-9 px-3.5 rounded-md border border-rule bg-surface text-sm hover:bg-tint" @click="store.clearCompletedOperations()">{{ t('operations.clear') }}</button>
    </header>

    <div class="rounded-lg border border-rule bg-surface overflow-hidden">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-tint text-left">
            <th class="label-caps h-8 px-3 w-14 border-r border-rule hidden xl:table-cell">{{ t('library.col.no') }}</th>
            <th class="label-caps h-8 px-3">{{ t('library.col.app') }}</th>
            <th class="label-caps h-8 px-3 w-48 hidden md:table-cell">{{ t('operations.col.action') }}</th>
            <th class="label-caps h-8 px-3 w-28 hidden lg:table-cell">{{ t('operations.col.started') }}</th>
            <th class="label-caps h-8 px-3 w-56 xl:w-64">{{ t('library.col.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!store.operations.length">
            <td colspan="5" class="px-4 py-14 text-center">
              <p class="font-semibold">{{ t('operations.empty') }}</p>
              <p class="text-sm text-ink-2 mt-1">{{ t('operations.emptyDesc') }}</p>
            </td>
          </tr>
          <template v-for="(op, i) in store.operations" :key="op.id">
            <tr class="h-row border-t border-rule first:border-t-0">
              <td class="px-3 text-xs text-ink-3 border-r border-rule hidden xl:table-cell">{{ String(store.operations.length - i).padStart(3, '0') }}</td>
              <td class="px-3 py-1.5">
                <RouterLink :to="{ name: 'detail', params: { id: op.packageId } }" class="font-semibold hover:underline underline-offset-2">{{ op.packageName }}</RouterLink>
                <span class="ml-2 text-[0.6875rem] font-bold tracking-[0.06em]" :style="{ color: sourceColor(op.source) }">{{ sourceCode(op.source) }}</span>
              </td>
              <td class="px-3 text-ink-2 hidden md:table-cell">{{ t(`operations.type.${op.type}`) }}<span v-if="op.version" class="text-ink-3"> · {{ op.version }}</span></td>
              <td class="px-3 text-ink-2 hidden lg:table-cell">{{ time(op.startedAt) }}</td>
              <td class="px-3">
                <div v-if="op.status === 'running'" class="w-44">
                  <div class="text-xs text-ink-2">{{ t(`state.${op.type}Running`, { p: op.progress }) }}</div>
                  <div class="h-1 mt-1.5 rounded-full bg-tint overflow-hidden"><div class="h-full bg-primary transition-[width] duration-500 ease-out" :style="{ width: `${op.progress}%` }" /></div>
                </div>
                <div v-else-if="op.status === 'error'" class="flex items-center gap-3">
                  <span class="font-semibold text-danger">{{ t('state.failed') }}</span>
                  <button class="text-ink-2 underline underline-offset-2 hover:text-ink" :aria-expanded="open === op.id" @click="open = open === op.id ? null : op.id">{{ t('state.details') }}</button>
                  <button class="h-7 px-3 rounded-md border border-primary text-primary text-xs font-semibold hover:bg-primary hover:text-primary-foreground" @click="store.retry(op)">{{ t('state.retry') }}</button>
                </div>
                <LedgerStamp v-else-if="op.type !== 'uninstall'" :label="t('operations.status.success')" :sub="op.finishedAt ? time(op.finishedAt) : undefined" :fresh="!!op.finishedAt && Date.now() - op.finishedAt < 4000" />
                <span v-else class="text-ink-3">{{ t('operations.removed') }}</span>
              </td>
            </tr>
            <tr v-if="open === op.id" class="bg-bg">
              <td colspan="5" class="px-3 py-3"><CommandOutput :error="op.error" :output="op.output" /></td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CommandOutput from '@/components/shared/CommandOutput.vue'
import { usePackagesStore } from '@/stores'
import { useFormat } from '@/composables/useFormat'
import LedgerStamp from './LedgerStamp.vue'

const { t } = useI18n()
const store = usePackagesStore()
const { time, sourceCode, sourceColor } = useFormat()
const open = ref<string | null>(null)
const hasCompleted = computed(() => store.operations.some(o => o.status !== 'running'))
</script>
