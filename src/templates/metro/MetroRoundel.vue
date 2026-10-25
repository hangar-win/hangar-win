<template>
  <span
    class="inline-grid place-items-center rounded-full font-display font-bold text-white shrink-0"
    :class="large ? 'w-12 h-12 text-xl' : 'w-6 h-6 text-xs'"
    :style="{ background: `rgb(var(--src-${source}))` }"
    :title="sourceName(source)"
  >{{ MARKS[source] }}</span>
</template>

<script setup lang="ts">
import { useFormat } from '@/composables/useFormat'
import type { PackageSource } from '@/models'

const MARKS: Record<PackageSource, string> = { winget: 'W', chocolatey: 'C', msstore: 'S', scoop: 'Sc' }

defineProps<{ source: PackageSource, large?: boolean }>()
const { sourceName } = useFormat()
</script>
