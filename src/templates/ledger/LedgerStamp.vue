<template>
  <span
    class="inline-block -rotate-3 rounded border-[1.5px] border-signature outline outline-1 outline-offset-2 outline-signature px-2 py-0.5 text-signature leading-tight"
    :class="{ 'animate-stamp': fresh }"
  >
    <span class="block text-[0.6875rem] font-extrabold uppercase tracking-[0.08em]">{{ label }}</span>
    <span v-if="sub" class="block text-[0.6875rem] font-semibold">{{ sub }}</span>
  </span>
</template>

<script setup lang="ts">
defineProps<{ label: string, sub?: string, fresh?: boolean }>()
</script>
