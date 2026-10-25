<template>
  <div v-if="operation?.status === 'running'" class="w-40">
    <div class="text-xs text-ink-2">{{ t(`state.${operation.type}Running`, { p: operation.progress }) }}</div>
    <div class="h-1 mt-1.5 rounded-full bg-tint overflow-hidden" role="progressbar" :aria-valuenow="operation.progress" aria-valuemin="0" aria-valuemax="100">
      <div class="h-full bg-primary transition-[width] duration-500 ease-out" :style="{ width: `${operation.progress}%` }" />
    </div>
  </div>
  <div v-else-if="operation?.status === 'error' && pkg.hasUpdate" class="text-sm">
    <span class="font-semibold text-danger">{{ t('state.failed') }}</span>
    <button class="ml-2 text-ink-2 underline underline-offset-2 hover:text-ink" :aria-expanded="expanded" @click="emit('toggle')">{{ t('state.details') }}</button>
  </div>
  <span v-else-if="pkg.hasUpdate" class="inline-block rounded border-[1.5px] border-dashed border-due px-2 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-due">
    {{ t('state.due') }}
  </span>
  <span v-else-if="pkg.unmanaged" class="text-sm text-ink-3">{{ t('library.noSource') }}</span>
  <span v-else-if="pkg.held" class="inline-flex items-center gap-1.5 text-sm text-ink-2"><PauseCircle class="w-3.5 h-3.5" />{{ pkg.held === 'pin' ? t('state.pinned') : t('state.skipped', { v: pkg.availableVersion }) }}</span>
  <LedgerStamp v-else-if="record" :label="t('state.stamped')" :sub="`${date(record.date)} · ${record.version}`" :fresh="fresh" />
  <span v-else class="inline-flex items-center gap-1.5 text-sm text-ink-3"><Check class="w-3.5 h-3.5" />{{ t('state.current') }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, PauseCircle } from 'lucide-vue-next'
import { usePackagesStore, packageKey } from '@/stores'
import { useFormat } from '@/composables/useFormat'
import type { Package } from '@/models'
import LedgerStamp from './LedgerStamp.vue'

const props = defineProps<{ pkg: Package, expanded?: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
const { t } = useI18n()
const { date } = useFormat()
const store = usePackagesStore()

const operation = computed(() => store.lastOperationFor(props.pkg))
const record = computed(() => store.records[packageKey(props.pkg)])
const fresh = computed(() => operation.value?.status === 'success' && Date.now() - (operation.value.finishedAt ?? 0) < 4000)
</script>
