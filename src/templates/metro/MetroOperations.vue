<template>
  <div class="px-4 md:px-8 pt-7 pb-10 grid gap-6 max-w-[68.75rem]">
    <header class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h1 class="font-display text-[clamp(1.625rem,1.2rem+1.2vw,2rem)] font-semibold tracking-wide leading-none">{{ t('nav.operations') }}</h1>
        <p class="mt-2.5 text-sm text-ink-2">
          {{ t('operations.runningSummary', { n: store.runningCount }) }} · <span :class="store.failedCount ? 'text-danger font-semibold' : ''">{{ t('operations.failedSummary', { n: store.failedCount }) }}</span>
        </p>
      </div>
      <button v-if="hasCompleted" class="h-10 px-4 rounded-sm border border-rule text-sm hover:bg-tint" @click="store.clearCompletedOperations()">{{ t('operations.clear') }}</button>
    </header>

    <div v-if="!store.operations.length" class="py-14">
      <p class="font-display text-xl tracking-wide">{{ t('operations.empty') }}</p>
      <p class="text-sm text-ink-2 mt-1">{{ t('operations.emptyDesc') }}</p>
    </div>

    <ol v-else class="relative">
      <span class="absolute left-[0.8125rem] top-4 bottom-4 w-1 bg-rule" aria-hidden="true" />
      <li v-for="op in store.operations" :key="op.id" class="relative grid grid-cols-[1.875rem_minmax(0,1fr)_auto] gap-4 py-3">
        <span
          class="relative z-10 mt-1 w-[1.875rem] h-[1.875rem] rounded-full border-[3px] grid place-items-center bg-surface"
          :class="{ 'animate-station-pulse': op.status === 'running' }"
          :style="{ borderColor: op.status === 'error' ? 'rgb(var(--danger))' : op.status === 'success' ? 'rgb(var(--success))' : `rgb(var(--src-${op.source}))` }"
          aria-hidden="true"
        >
          <Check v-if="op.status === 'success'" class="w-3.5 h-3.5 text-success" />
          <X v-else-if="op.status === 'error'" class="w-3.5 h-3.5 text-danger" />
        </span>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <MetroRoundel :source="op.source" />
            <RouterLink :to="{ name: 'detail', params: { id: op.packageId } }" class="font-semibold hover:underline underline-offset-2">{{ op.packageName }}</RouterLink>
          </div>
          <div class="text-sm text-ink-2 mt-0.5">{{ t(`operations.type.${op.type}`) }}<span v-if="op.version"> · {{ op.version }}</span> · {{ time(op.startedAt) }}</div>
          <div v-if="op.status === 'running'" class="mt-2 h-1.5 w-full max-w-72 bg-tint rounded-full overflow-hidden">
            <div class="h-full transition-[width] duration-500 ease-out" :style="{ width: `${op.progress}%`, background: `rgb(var(--src-${op.source}))` }" />
          </div>
          <div v-if="open === op.id" class="mt-3"><CommandOutput :error="op.error" :output="op.output" /></div>
        </div>
        <div class="flex items-start gap-2 text-sm pt-1">
          <span v-if="op.status === 'running'" class="text-ink-2">%{{ op.progress }}</span>
          <template v-else-if="op.status === 'error'">
            <button class="text-danger font-semibold underline underline-offset-2" :aria-expanded="open === op.id" @click="open = open === op.id ? null : op.id">{{ t('state.failed') }}</button>
            <button class="h-8 px-3 rounded-sm bg-primary text-primary-foreground text-xs font-semibold" @click="store.retry(op)">{{ t('state.retry') }}</button>
          </template>
          <span v-else class="text-success font-semibold">{{ op.type === 'uninstall' ? t('operations.removed') : t('operations.status.success') }}</span>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, X } from 'lucide-vue-next'
import CommandOutput from '@/components/shared/CommandOutput.vue'
import { usePackagesStore } from '@/stores'
import { useFormat } from '@/composables/useFormat'
import MetroRoundel from './MetroRoundel.vue'

const { t } = useI18n()
const store = usePackagesStore()
const { time } = useFormat()
const open = ref<string | null>(null)
const hasCompleted = computed(() => store.operations.some(o => o.status !== 'running'))
</script>
