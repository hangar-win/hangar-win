<template>
  <div ref="scroller" class="h-full overflow-auto font-mono text-xs leading-relaxed px-4 py-3">
    <p v-if="ui.consoleLogs.length === 0" class="text-ink-3">{{ t('console.empty') }}</p>
    <div v-for="(log, i) in ui.consoleLogs" :key="i" class="flex gap-3">
      <span class="text-ink-3 shrink-0">{{ time(log.timestamp) }}</span>
      <span :class="{ 'text-danger': log.type === 'error', 'text-due': log.type === 'warn', 'text-ink-2': log.type === 'log' || log.type === 'info' }" class="whitespace-pre-wrap break-all">{{ log.message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUIStore } from '@/stores'
import { useFormat } from '@/composables/useFormat'

const { t } = useI18n()
const ui = useUIStore()
const { time } = useFormat()
const scroller = ref<HTMLElement>()

watch(() => ui.consoleLogs.length, async () => {
  await nextTick()
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight })
}, { immediate: true })
</script>
