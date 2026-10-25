<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle class="font-display text-lg">{{ t('uninstall.title', { name }) }}</DialogTitle>
        <DialogDescription class="text-ink-2">{{ t('uninstall.desc') }}</DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <button class="h-9 px-4 rounded-md border border-rule bg-surface text-ink hover:bg-tint" @click="emit('update:open', false)">
          {{ t('common.cancel') }}
        </button>
        <button class="h-9 px-4 rounded-md bg-danger text-surface font-semibold hover:bg-danger/90" @click="confirm">
          {{ t('uninstall.confirm') }}
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

defineProps<{ open: boolean, name: string }>()
const emit = defineEmits<{ 'update:open': [value: boolean], confirm: [] }>()
const { t } = useI18n()

function confirm() {
  emit('update:open', false)
  emit('confirm')
}
</script>
