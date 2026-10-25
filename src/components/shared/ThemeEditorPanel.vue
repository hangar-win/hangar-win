<template>
  <DialogRoot :open="themeStore.editing" :modal="false" @update:open="open => !open && themeStore.cancelEditing()">
    <DialogPortal>
      <DialogContent
        class="fixed inset-y-0 right-0 z-50 w-[min(26rem,100vw)] bg-surface text-ink border-l border-rule shadow-[-12px_0_32px_-12px_rgb(0_0_0/0.35)] flex flex-col data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-200"
        @pointer-down-outside.prevent
        @interact-outside.prevent
      >
        <template v-if="draft">
          <header class="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-rule">
            <div>
              <DialogTitle class="font-display text-lg font-semibold">{{ t('settings.editTitle') }}</DialogTitle>
              <DialogDescription class="text-sm text-ink-2">{{ t('settings.editLive') }}</DialogDescription>
            </div>
            <DialogClose class="h-8 w-8 rounded-md grid place-items-center text-ink-2 hover:bg-tint hover:text-ink" :aria-label="t('common.cancel')"><X class="w-4 h-4" /></DialogClose>
          </header>

          <div class="flex-1 overflow-y-auto px-5 py-5 grid gap-6 content-start">
            <label class="grid gap-1.5">
              <span class="label-caps">{{ t('settings.name') }}</span>
              <input v-model="draft.name" maxlength="60" class="h-9 rounded-md border border-rule bg-bg px-3" />
            </label>

            <fieldset class="grid gap-2">
              <legend class="label-caps mb-2">{{ t('settings.layout') }}</legend>
              <div class="grid grid-cols-2 gap-2" role="radiogroup">
                <button
                  v-for="id in templateIds"
                  :key="id"
                  role="radio"
                  :aria-checked="draft.template === id"
                  class="rounded-lg border p-2.5 text-left grid gap-2 hover:border-ink-3"
                  :class="draft.template === id ? 'border-focus ring-1 ring-focus' : 'border-rule'"
                  @click="themeStore.setDraftTemplate(id)"
                >
                  <span class="h-12 rounded border border-rule bg-bg overflow-hidden flex" :class="id === 'metro' ? 'flex-col' : ''" aria-hidden="true">
                    <span class="bg-rail shrink-0" :class="id === 'metro' ? 'h-2.5' : 'w-3'" />
                    <span class="flex-1 grid content-start gap-1 p-1.5">
                      <span class="h-1 w-3/4 rounded-full bg-ink/60" />
                      <span class="h-1 w-1/2 rounded-full bg-ink/30" />
                    </span>
                  </span>
                  <span class="text-sm font-semibold">{{ t(`template.${id}`) }}</span>
                  <span class="text-xs text-ink-2 leading-snug">{{ t(`template.${id}Desc`) }}</span>
                </button>
              </div>
            </fieldset>

            <div class="grid gap-2">
              <span class="label-caps">{{ t('settings.palette') }}</span>
              <ModeSwitch :modes="['light', 'dark']" />
            </div>

            <fieldset v-for="group in groups" :key="group.id" class="grid gap-2">
              <legend class="label-caps mb-1">{{ t(`settings.groups.${group.id}`) }}</legend>
              <label v-for="key in group.keys" :key="key" class="flex items-center gap-3 text-sm">
                <input type="color" v-model="draft[themeStore.mode][key]" class="h-7 w-9 rounded border border-rule bg-transparent p-0.5 cursor-pointer" />
                <span class="flex-1">{{ t(`settings.colors.${key}`) }}</span>
                <span class="font-mono text-xs text-ink-3 uppercase">{{ draft[themeStore.mode][key] }}</span>
              </label>
            </fieldset>

            <fieldset class="grid gap-4">
              <legend class="label-caps mb-1">{{ t('settings.shape') }}</legend>
              <label class="grid gap-1.5 text-sm">
                <span class="flex justify-between">{{ t('settings.radius') }}<span class="text-ink-3">{{ draft.scalars.radius }}px</span></span>
                <input type="range" min="0" max="16" v-model.number="draft.scalars.radius" class="accent-[rgb(var(--focus))]" />
              </label>
              <label class="grid gap-1.5 text-sm">
                <span class="flex justify-between">{{ t('settings.fontSize') }}<span class="text-ink-3">{{ draft.scalars.fontSize }}px</span></span>
                <input type="range" min="12" max="18" v-model.number="draft.scalars.fontSize" class="accent-[rgb(var(--focus))]" />
              </label>
              <label class="grid gap-1.5 text-sm">
                {{ t('settings.density') }}
                <select v-model="draft.scalars.density" class="h-9 rounded-md border border-rule bg-bg px-2">
                  <option v-for="d in (['compact', 'regular', 'comfortable'] as const)" :key="d" :value="d">{{ t(`settings.densities.${d}`) }}</option>
                </select>
              </label>
              <label class="grid gap-1.5 text-sm">
                {{ t('settings.font') }}
                <select v-model="draft.scalars.font" class="h-9 rounded-md border border-rule bg-bg px-2">
                  <option v-for="f in (['segoe', 'bahnschrift', 'system'] as const)" :key="f" :value="f">{{ t(`settings.fonts.${f}`) }}</option>
                </select>
              </label>
            </fieldset>
          </div>

          <footer class="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-rule">
            <button class="h-9 px-3 rounded-md text-sm text-ink-2 hover:bg-tint hover:text-ink inline-flex items-center gap-2" @click="themeStore.resetDraft()">
              <RotateCcw class="w-4 h-4" />{{ t('settings.resetDraft') }}
            </button>
            <span class="flex-1" />
            <button class="h-9 px-3 rounded-md border border-rule text-sm hover:bg-tint" @click="themeStore.cancelEditing()">{{ t('common.cancel') }}</button>
            <button class="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90" @click="themeStore.saveDraft()">{{ t('settings.save') }}</button>
          </footer>
        </template>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { DialogClose, DialogContent, DialogDescription, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { RotateCcw, X } from 'lucide-vue-next'
import { useThemeStore } from '@/stores/theme'
import type { ColorKey, TemplateId } from '@/themes/tokens'
import ModeSwitch from './ModeSwitch.vue'

const { t } = useI18n()
const themeStore = useThemeStore()
const draft = computed(() => themeStore.draft)
const templateIds: TemplateId[] = ['ledger', 'metro']

const groups: { id: string, keys: ColorKey[] }[] = [
  { id: 'ground', keys: ['bg', 'surface', 'tint', 'rule'] },
  { id: 'text', keys: ['ink', 'ink-2', 'ink-3'] },
  { id: 'rail', keys: ['rail', 'rail-ink', 'rail-muted'] },
  { id: 'accent', keys: ['accent', 'accent-ink', 'signature', 'focus'] },
  { id: 'state', keys: ['due', 'danger', 'success'] },
  { id: 'sources', keys: ['src-winget', 'src-chocolatey', 'src-msstore', 'src-scoop'] }
]
</script>
