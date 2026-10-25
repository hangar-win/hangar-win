<template>
  <div class="px-4 md:px-8 pt-7 pb-10 grid gap-8 max-w-6xl">
    <header>
      <h1 class="font-display text-[clamp(1.5rem,1.2rem+0.8vw,1.75rem)] font-semibold tracking-tight leading-none">{{ t('nav.settings') }}</h1>
    </header>

    <section class="grid gap-3">
      <h2 class="label-caps">{{ t('settings.appearance') }}</h2>
      <ThemeGallery />
    </section>

    <section class="grid gap-3">
      <h2 class="label-caps">{{ t('settings.general') }}</h2>
      <div class="rounded-lg border border-rule bg-surface text-sm">
        <div class="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-3.5 border-b border-rule">
          <span class="font-semibold">{{ t('settings.language') }}</span>
          <div class="inline-flex rounded-md border border-rule p-0.5" role="radiogroup" :aria-label="t('settings.language')">
            <button v-for="l in (['tr', 'en'] as const)" :key="l" role="radio" :aria-checked="appStore.locale === l" class="h-8 px-3 rounded" :class="appStore.locale === l ? 'bg-tint font-semibold' : 'text-ink-2 hover:text-ink'" @click="appStore.setLocale(l)">{{ t(`settings.languages.${l}`) }}</button>
          </div>
        </div>
        <label class="flex items-center justify-between gap-8 px-4 py-4 border-b border-rule cursor-pointer">
          <span class="min-w-0 max-w-xl">
            <span class="font-semibold block">{{ t('app.silentInstall') }}</span>
            <span class="text-ink-2 block mt-0.5">{{ t('settings.silentDesc') }}</span>
          </span>
          <Switch v-model="packagesStore.silentInstall" :aria-label="t('app.silentInstall')" class="shrink-0" />
        </label>
        <div class="px-4 py-4"><AppListTransfer /></div>
      </div>
    </section>

    <AppCredits />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Switch } from '@/components/ui/switch'
import ThemeGallery from '@/components/shared/ThemeGallery.vue'
import AppCredits from '@/components/shared/AppCredits.vue'
import AppListTransfer from '@/components/shared/AppListTransfer.vue'
import { useAppStore, usePackagesStore } from '@/stores'

const { t } = useI18n()
const appStore = useAppStore()
const packagesStore = usePackagesStore()
</script>
