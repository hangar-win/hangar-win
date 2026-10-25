<template>
  <div class="inline-flex w-fit rounded-md border border-rule bg-surface p-0.5" role="radiogroup" :aria-label="t('settings.mode')">
    <button
      v-for="m in modes"
      :key="m"
      role="radio"
      :aria-checked="themeStore.modePreference === m"
      class="h-8 px-3 rounded text-sm"
      :class="themeStore.modePreference === m ? 'bg-tint font-semibold text-ink' : 'text-ink-2 hover:text-ink'"
      @click="themeStore.modePreference = m"
    >{{ t(`settings.modes.${m}`) }}</button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useThemeStore, type ModePreference } from '@/stores/theme'

withDefaults(defineProps<{ modes?: ModePreference[] }>(), { modes: () => ['light', 'dark', 'system'] })
const { t } = useI18n()
const themeStore = useThemeStore()
</script>
