<template>
  <div class="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
    <span class="min-w-0 max-w-xl text-sm">
      <span class="font-semibold block">{{ t('settings.appList') }}</span>
      <span class="text-ink-2 block mt-0.5">{{ t('settings.appListDesc') }}</span>
    </span>
    <div class="flex flex-wrap gap-2">
      <label class="h-9 px-3 rounded-md border border-rule bg-surface text-sm font-medium inline-flex items-center gap-2 cursor-pointer hover:bg-tint focus-within:outline focus-within:outline-2 focus-within:outline-focus">
        <Upload class="w-4 h-4" />{{ t('settings.importApps') }}
        <input type="file" accept="application/json,.json" class="sr-only" @change="onImport" />
      </label>
      <button class="h-9 px-3 rounded-md border border-rule bg-surface text-sm font-medium inline-flex items-center gap-2 hover:bg-tint disabled:opacity-50" :disabled="!store.packages.length" @click="onExport">
        <Download class="w-4 h-4" />{{ t('settings.exportApps') }}
      </button>
    </div>
    <p v-if="message" role="alert" class="basis-full text-sm" :class="error ? 'text-danger' : 'text-ink-2'">{{ message }}</p>
  </div>

  <Dialog :open="pending.length > 0" @update:open="v => !v && (pending = [])">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle class="font-display text-lg">{{ t('settings.importTitle', { n: pending.length }) }}</DialogTitle>
        <DialogDescription v-if="skipped" class="text-ink-2">{{ t('settings.importSkipped', { n: skipped }) }}</DialogDescription>
      </DialogHeader>
      <ul class="max-h-64 overflow-y-auto rounded-md border border-rule text-sm">
        <li v-for="entry in pending" :key="`${entry.source}:${entry.id}`" class="px-3 py-2 flex justify-between gap-3 border-t border-rule first:border-t-0">
          <span class="truncate">{{ entry.id }}</span>
          <span class="shrink-0 text-xs font-bold tracking-[0.06em]" :style="{ color: sourceColor(entry.source) }">{{ sourceCode(entry.source) }}</span>
        </li>
      </ul>
      <DialogFooter class="gap-2">
        <button class="h-9 px-4 rounded-md border border-rule bg-surface text-ink hover:bg-tint" @click="pending = []">{{ t('common.cancel') }}</button>
        <button class="h-9 px-4 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90" @click="installAll">{{ t('settings.installAll') }}</button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Download, Upload } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePackagesStore } from '@/stores'
import { useFormat } from '@/composables/useFormat'
import { exportAppList, parseAppList, type AppEntry } from '@/services/app-list'

const { t } = useI18n()
const router = useRouter()
const store = usePackagesStore()
const { sourceCode, sourceColor } = useFormat()
const pending = ref<AppEntry[]>([])
const skipped = ref(0)
const message = ref('')
const error = ref(false)

function onExport() {
  const blob = new Blob([exportAppList(store.packages)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `hangar-apps-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

async function onImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  message.value = ''
  try {
    const entries = parseAppList(await file.text())
    if (!store.packages.length) await store.fetchPackages()
    pending.value = entries.filter(e => !store.findPackage(e))
    skipped.value = entries.length - pending.value.length
    error.value = false
    if (!pending.value.length) message.value = t('settings.importNothing')
  } catch {
    error.value = true
    message.value = t('settings.importInvalid')
  }
}

function installAll() {
  const list = pending.value
  pending.value = []
  store.installMany(list)
  router.push({ name: 'operations' })
}
</script>
