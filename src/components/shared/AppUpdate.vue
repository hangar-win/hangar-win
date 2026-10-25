<template>
  <Teleport to="body">
    <Transition name="update">
      <div v-if="update && !dismissed" role="status" class="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-rule bg-surface p-4 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.25)]">
        <div class="flex items-start gap-3">
          <Download class="w-5 h-5 mt-0.5 shrink-0 text-primary" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-ink">{{ t('appUpdate.title', { version: update.version }) }}</p>
            <p class="mt-1 text-sm text-ink-2">{{ failed ? t('appUpdate.failed') : installing ? t('appUpdate.installing') : t('appUpdate.desc') }}</p>
            <Progress v-if="installing" :model-value="percent" class="mt-3 h-1.5" />
            <div v-else class="mt-3 flex justify-end gap-2">
              <button class="h-8 px-3 rounded-md text-sm text-ink-2 hover:bg-tint hover:text-ink" @click="dismissed = true">{{ t('appUpdate.later') }}</button>
              <button class="h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90" @click="install">{{ t('appUpdate.install') }}</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { Download } from 'lucide-vue-next'
import { Progress } from '@/components/ui/progress'

const { t } = useI18n()
const update = shallowRef<Update | null>(null)
const dismissed = ref(false)
const installing = ref(false)
const failed = ref(false)
const percent = ref(0)

onMounted(async () => {
  if (!('__TAURI_INTERNALS__' in window) || import.meta.env.DEV) return
  try {
    update.value = await check()
  } catch {
  }
})

async function install() {
  if (!update.value) return
  installing.value = true
  failed.value = false
  let total = 0
  let received = 0
  try {
    await update.value.downloadAndInstall(event => {
      if (event.event === 'Started') total = event.data.contentLength ?? 0
      else if (event.event === 'Progress') {
        received += event.data.chunkLength
        if (total) percent.value = Math.round((received / total) * 100)
      }
    })
  } catch {
    installing.value = false
    failed.value = true
  }
}
</script>

<style scoped>
.update-enter-active, .update-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.update-enter-from, .update-leave-to { opacity: 0; transform: translateY(0.5rem); }
</style>
