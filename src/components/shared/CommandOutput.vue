<template>
  <div class="rounded-md border border-rule bg-bg">
    <div class="flex items-center justify-between px-3 h-8 border-b border-rule">
      <span class="label-caps">{{ t('operations.output') }}</span>
      <button class="text-xs font-semibold text-ink-2 hover:text-ink inline-flex items-center gap-1" @click="copy">
        <Check v-if="copied" class="w-3.5 h-3.5" />
        <Copy v-else class="w-3.5 h-3.5" />
        {{ copied ? t('operations.copied') : t('operations.copy') }}
      </button>
    </div>
    <pre class="px-3 py-2 text-xs leading-relaxed font-mono text-ink-2 whitespace-pre-wrap max-h-56 overflow-auto">{{ text }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Copy } from 'lucide-vue-next'

const props = defineProps<{ output?: string, error?: string }>()
const { t } = useI18n()
const copied = ref(false)

const text = computed(() => [props.error, props.output?.replace(/^\s*[-\\|/]\s*$/gm, '').replace(/\n{3,}/g, '\n\n').trim()].filter(Boolean).join('\n\n'))

async function copy() {
  await navigator.clipboard.writeText(text.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>
