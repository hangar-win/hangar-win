<template>
  <footer class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-5 border-t border-rule text-xs text-ink-3">
    <div class="flex items-center gap-2">
      <span>{{ t('app.title') }} · v{{ version }}</span>
      <span aria-hidden="true">·</span>
      <a :href="links.source" class="inline-flex items-center gap-1 hover:text-ink underline-offset-2 hover:underline" @click.prevent="visit(links.source)">
        <Code2 class="w-3.5 h-3.5" />{{ t('credits.source') }}
      </a>
    </div>
    <div class="flex items-center gap-3">
      <span>{{ t('credits.by') }} <span class="font-semibold text-ink-2">Fatih Sağlam</span></span>
      <a :href="links.github" class="h-7 w-7 grid place-items-center rounded-md hover:bg-tint hover:text-ink" :aria-label="t('credits.github')" :title="t('credits.github')" @click.prevent="visit(links.github)">
        <Github class="w-4 h-4" />
      </a>
      <a :href="links.linkedin" class="h-7 w-7 grid place-items-center rounded-md hover:bg-tint hover:text-ink" :aria-label="t('credits.linkedin')" :title="t('credits.linkedin')" @click.prevent="visit(links.linkedin)">
        <Linkedin class="w-4 h-4" />
      </a>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { version } from '../../../package.json'
import { open } from '@tauri-apps/plugin-shell'
import { Code2, Github, Linkedin } from 'lucide-vue-next'

const { t } = useI18n()

const links = {
  source: 'https://github.com/hangar-win/hangar-win',
  github: 'https://github.com/Fatih-Sglm',
  linkedin: 'https://www.linkedin.com/in/fatih-saglam'
}

async function visit(url: string) {
  if ('__TAURI_INTERNALS__' in window) await open(url)
  else window.open(url, '_blank', 'noopener')
}
</script>
