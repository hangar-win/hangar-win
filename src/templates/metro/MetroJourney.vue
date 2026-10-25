<template>
  <div class="flex items-center gap-2.5 text-sm" :style="{ '--line': `rgb(var(--src-${pkg.source}))` }">
    <template v-if="pkg.hasUpdate || running">
      <span class="text-ink-2 tabular-nums">{{ from }}</span>
      <span class="w-2.5 h-2.5 rounded-full border-2 bg-surface shrink-0" :style="{ borderColor: 'var(--line)' }" />
      <span
        class="relative h-1 w-16 rounded-full overflow-hidden"
        :class="failed ? 'border-t-2 border-dashed border-danger bg-transparent' : 'bg-tint'"
      >
        <span v-if="!failed" class="absolute inset-y-0 left-0 transition-[width] duration-500 ease-out" :style="{ width: `${running ? progress : 100}%`, background: 'var(--line)', opacity: running ? 1 : 0.9 }" />
      </span>
      <span
        class="w-3.5 h-3.5 rounded-full shrink-0"
        :class="{ 'animate-station-pulse': running }"
        :style="failed ? { border: '2px solid rgb(var(--danger))' } : { background: 'var(--line)' }"
      />
      <span class="font-semibold tabular-nums">{{ to }}</span>
    </template>
    <template v-else>
      <span class="w-3.5 h-3.5 rounded-full shrink-0" :style="{ background: 'var(--line)' }" />
      <span class="tabular-nums">{{ pkg.currentVersion }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePackagesStore } from '@/stores'
import type { Package } from '@/models'

const props = defineProps<{ pkg: Package }>()
const store = usePackagesStore()
const operation = computed(() => store.lastOperationFor(props.pkg))
const running = computed(() => operation.value?.status === 'running' && operation.value.type === 'update')
const failed = computed(() => operation.value?.status === 'error' && props.pkg.hasUpdate)
const progress = computed(() => operation.value?.progress ?? 0)
const from = computed(() => props.pkg.currentVersion)
const to = computed(() => props.pkg.availableVersion || operation.value?.version || '')
</script>
