<template>
  <div class="px-4 md:px-8 pt-7 pb-10 grid gap-10 max-w-6xl">
    <h1 class="font-display text-[clamp(1.625rem,1.2rem+1.2vw,2rem)] font-semibold tracking-wide leading-none">{{ t('nav.settings') }}</h1>

    <section class="grid gap-4">
      <h2 class="font-display text-xl tracking-wide pb-2 border-b-4 border-ink">{{ t('settings.appearance') }}</h2>
      <ThemeGallery />
    </section>

    <section class="grid gap-4">
      <h2 class="font-display text-xl tracking-wide pb-2 border-b-4 border-ink">{{ t('settings.general') }}</h2>
      <div class="border-t border-rule text-sm">
        <div class="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-4 border-b border-rule">
          <span class="font-semibold">{{ t('settings.language') }}</span>
          <div class="inline-flex rounded-sm border border-rule p-0.5" role="radiogroup" :aria-label="t('settings.language')">
            <button v-for="l in (['tr', 'en'] as const)" :key="l" role="radio" :aria-checked="appStore.locale === l" class="h-8 px-3 rounded-sm" :class="appStore.locale === l ? 'bg-ink text-bg font-semibold' : 'text-ink-2 hover:text-ink'" @click="appStore.setLocale(l)">{{ t(`settings.languages.${l}`) }}</button>
          </div>
        </div>
        <label class="flex items-center justify-between gap-8 py-4 border-b border-rule cursor-pointer">
          <span class="min-w-0 max-w-xl">
            <span class="font-semibold block">{{ t('app.silentInstall') }}</span>
            <span class="text-ink-2 block mt-0.5">{{ t('settings.silentDesc') }}</span>
          </span>
          <Switch v-model="packagesStore.silentInstall" :aria-label="t('app.silentInstall')" class="shrink-0" />
        </label>
        <div class="py-4 border-b border-rule"><AppListTransfer /></div>
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
