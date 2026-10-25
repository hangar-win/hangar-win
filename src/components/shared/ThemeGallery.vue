<template>
  <div class="grid gap-6">
    <section class="grid gap-3">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 class="font-display text-base font-semibold">{{ t('settings.themes') }}</h3>
          <p class="text-sm text-ink-2">{{ t('settings.themesHint') }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="h-9 px-3 rounded-md border border-rule bg-surface text-sm font-medium inline-flex items-center gap-2 hover:bg-tint disabled:opacity-50" :disabled="isDefault" @click="themeStore.useDefault()">
            <RotateCcw class="w-4 h-4" />{{ t('settings.useDefault') }}
          </button>
          <label class="h-9 px-3 rounded-md border border-rule bg-surface text-sm font-medium inline-flex items-center gap-2 cursor-pointer hover:bg-tint focus-within:outline focus-within:outline-2 focus-within:outline-focus">
            <Upload class="w-4 h-4" />{{ t('settings.import') }}
            <input type="file" accept="application/json,.json" class="sr-only" @change="onImport" />
          </label>
          <button class="h-9 px-3 rounded-md border border-rule bg-surface text-sm font-medium inline-flex items-center gap-2 hover:bg-tint" @click="onExport">
            <Download class="w-4 h-4" />{{ t('settings.export') }}
          </button>
        </div>
      </div>
      <p v-if="importError" role="alert" class="text-sm text-danger">{{ importError }}</p>

      <div class="grid grid-cols-[repeat(auto-fill,minmax(min(17rem,100%),1fr))] gap-3">
        <div
          v-for="theme in themeStore.themes"
          :key="theme.id"
          class="relative min-w-0 rounded-lg border bg-surface p-3 grid grid-cols-[minmax(0,1fr)] gap-3 transition-colors hover:border-ink-3"
          :class="theme.id === themeStore.activeId ? 'border-focus ring-1 ring-focus' : 'border-rule'"
        >
          <button class="absolute inset-0 rounded-lg" :aria-pressed="theme.id === themeStore.activeId" :aria-label="theme.name" @click="themeStore.select(theme.id)" />
          <div class="flex h-14 rounded-md overflow-hidden border border-rule pointer-events-none" aria-hidden="true">
            <div class="w-1/4" :style="{ background: theme[themeStore.mode].rail }" />
            <div class="flex-1 grid content-center gap-1.5 px-3" :style="{ background: theme[themeStore.mode].bg }">
              <div class="h-1.5 w-3/4 rounded-full" :style="{ background: theme[themeStore.mode].ink }" />
              <div class="flex gap-1">
                <span class="h-2.5 w-6 rounded-sm" :style="{ background: theme[themeStore.mode].signature }" />
                <span class="h-2.5 w-4 rounded-sm" :style="{ background: theme[themeStore.mode]['src-winget'] }" />
                <span class="h-2.5 w-4 rounded-sm" :style="{ background: theme[themeStore.mode]['src-chocolatey'] }" />
                <span class="h-2.5 w-4 rounded-sm" :style="{ background: theme[themeStore.mode]['src-msstore'] }" />
                <span class="h-2.5 w-4 rounded-sm" :style="{ background: theme[themeStore.mode]['src-scoop'] }" />
              </div>
            </div>
          </div>
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0 pointer-events-none">
              <div class="font-semibold flex items-center gap-1.5 min-w-0">
                <span class="truncate" :title="theme.name">{{ theme.name }}</span>
                <Check v-if="theme.id === themeStore.activeId" class="w-4 h-4 text-focus shrink-0" />
              </div>
              <div class="text-xs text-ink-2 truncate">{{ t(`template.${theme.template}`) }} · {{ themeStore.isBuiltin(theme.id) ? t('settings.builtin') : t('settings.custom') }}</div>
            </div>
            <div class="relative flex gap-1 shrink-0">
              <button
                class="h-8 px-2.5 rounded-md text-xs font-semibold text-ink-2 hover:bg-tint hover:text-ink inline-flex items-center gap-1.5"
                @click="edit(theme.id)"
              >
                <component :is="themeStore.isBuiltin(theme.id) ? Copy : Pencil" class="w-3.5 h-3.5" />
                {{ themeStore.isBuiltin(theme.id) ? t('settings.copyEdit') : t('settings.edit') }}
              </button>
              <button
                v-if="!themeStore.isBuiltin(theme.id)"
                class="h-8 w-8 rounded-md text-danger hover:bg-tint grid place-items-center"
                :aria-label="t('settings.deleteNamed', { name: theme.name })"
                @click="themeStore.remove(theme.id)"
              ><Trash2 class="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-3">
      <h3 class="font-display text-base font-semibold">{{ t('settings.mode') }}</h3>
      <ModeSwitch />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Copy, Download, Pencil, RotateCcw, Trash2, Upload } from 'lucide-vue-next'
import { useThemeStore } from '@/stores/theme'
import { BUILTIN_THEMES } from '@/themes/tokens'
import ModeSwitch from './ModeSwitch.vue'

const { t } = useI18n()
const themeStore = useThemeStore()
const importError = ref('')
const isDefault = computed(() => themeStore.activeId === BUILTIN_THEMES[0].id && themeStore.modePreference === 'system')

function edit(id: string) {
  themeStore.startEditing(id, name => t('settings.copyName', { name }))
}

function onExport() {
  const blob = new Blob([themeStore.exportJson()], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${themeStore.active.name.replace(/[^\p{L}\p{N}-]+/gu, '-').toLowerCase()}.theme.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

async function onImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    themeStore.importJson(await file.text())
    importError.value = ''
  } catch {
    importError.value = t('settings.importError')
  }
}
</script>
