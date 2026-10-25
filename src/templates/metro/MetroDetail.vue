<template>
  <div class="grid">
    <div v-if="!pkg" class="px-4 md:px-8 py-20 text-ink-2"><Loader2 class="w-5 h-5 animate-spin inline mr-2" />{{ t('detail.loading') }}</div>

    <template v-else>
      <section class="bg-tint border-b border-rule px-4 md:px-8 pt-5 pb-6" :style="{ '--line': `rgb(var(--src-${pkg.source}))` }">
        <button class="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink" @click="router.back()"><ArrowLeft class="w-4 h-4" />{{ t('nav.back') }}</button>
        <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <MetroRoundel :source="pkg.source" large />
          <div class="min-w-0 flex-1">
            <h1 class="font-display text-[clamp(1.625rem,1.2rem+1.2vw,2rem)] font-semibold tracking-wide leading-tight">{{ pkg.name }}</h1>
            <p class="text-sm text-ink-2">{{ pkg.publisher || t('detail.unknownPublisher') }} · {{ t('metro.line', { name: sourceName(pkg.source) }) }}</p>
          </div>
          <div class="flex gap-2 items-center">
            <span v-if="busy && operation" class="text-sm text-ink-2">{{ t(`state.${operation.type}Running`, { p: operation.progress }) }}</span>
            <template v-else-if="isInstalled">
              <button class="h-10 px-4 rounded-sm border border-rule bg-surface text-sm text-danger hover:bg-bg" @click="confirmOpen = true">{{ t('state.uninstall') }}</button>
              <button v-if="installed?.hasUpdate" class="h-10 px-5 rounded-sm bg-primary text-primary-foreground font-display tracking-wide hover:bg-primary/90" @click="update">{{ t('detail.updateTo', { v: installed.availableVersion }) }}</button>
            </template>
            <button v-else class="h-10 px-6 rounded-sm bg-primary text-primary-foreground font-display tracking-wide hover:bg-primary/90" @click="install()">{{ t('discover.install') }}</button>
          </div>
        </div>
      </section>

      <div class="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-[22.5rem_minmax(0,1fr)] gap-10 items-start max-w-[87.5rem]" :style="{ '--line': `rgb(var(--src-${pkg.source}))` }">
        <section>
          <h2 class="font-display text-xl tracking-wide mb-4">{{ t('detail.versions') }}</h2>
          <div v-if="loadingVersions" class="text-sm text-ink-2"><Loader2 class="w-4 h-4 animate-spin inline mr-2" />{{ t('detail.versionsLoading') }}</div>
          <p v-else-if="!versions.length" class="text-sm text-ink-2">{{ t('detail.noVersions') }}</p>
          <ol v-else class="relative">
            <span class="absolute left-[0.6875rem] top-5 bottom-5 w-1.5" :style="{ background: 'var(--line)' }" aria-hidden="true" />
            <li v-for="(v, i) in versions" :key="v" class="relative min-h-row flex items-center gap-4 py-1.5">
              <span
                class="relative z-10 w-7 h-7 rounded-full border-[3px] shrink-0"
                :style="{ borderColor: 'var(--line)', background: isHere(v) ? 'var(--line)' : 'rgb(var(--surface))' }"
                aria-hidden="true"
              />
              <div class="flex-1 min-w-0">
                <div class="font-semibold tabular-nums">{{ v }}</div>
                <div class="text-xs text-ink-3">{{ i === 0 ? t('detail.latest') : t('metro.olderStop') }}</div>
              </div>
              <span v-if="isHere(v)" class="px-2 py-1 rounded-sm bg-signature text-[#15171A] text-xs font-bold">{{ t('metro.youAreHere') }}</span>
              <button v-else class="text-sm font-semibold underline underline-offset-2 hover:text-ink-2 disabled:opacity-50" :disabled="busy" @click="install(v)">{{ isInstalled ? t('detail.switchTo') : t('detail.installThis') }}</button>
            </li>
          </ol>
        </section>

        <section class="grid gap-6">
          <dl class="grid grid-cols-[minmax(7rem,11.25rem)_1fr] border-t border-rule text-sm">
            <template v-for="row in facts" :key="row.label">
              <dt class="py-3 text-ink-2 border-b border-rule">{{ row.label }}</dt>
              <dd class="py-3 border-b border-rule" :class="row.class">{{ row.value }}</dd>
            </template>
          </dl>
          <div>
            <h2 class="font-display text-xl tracking-wide mb-2">{{ t('detail.description') }}</h2>
            <p class="text-ink-2 leading-relaxed max-w-[70ch]">{{ pkg.description || t('detail.noDescription') }}</p>
          </div>
          <div v-if="history.length">
            <h2 class="font-display text-xl tracking-wide mb-2">{{ t('detail.history') }}</h2>
            <ul class="border-t border-rule text-sm">
              <li v-for="op in history" :key="op.id" class="py-2.5 border-b border-rule flex justify-between gap-4">
                <span>{{ t(`operations.type.${op.type}`) }}<span v-if="op.version" class="text-ink-3"> · {{ op.version }}</span></span>
                <span :class="op.status === 'error' ? 'text-danger font-semibold' : 'text-ink-2'">{{ t(`operations.status.${op.status}`) }} · {{ time(op.startedAt) }}</span>
              </li>
            </ul>
          </div>
          <p class="text-sm text-ink-3 inline-flex items-center gap-2"><ShieldAlert class="w-4 h-4" />{{ t('detail.adminNote') }}</p>
        </section>
      </div>
    </template>

    <ConfirmUninstall v-model:open="confirmOpen" :name="pkg?.name ?? ''" @confirm="uninstall" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-vue-next'
import ConfirmUninstall from '@/components/shared/ConfirmUninstall.vue'
import { usePackagesStore } from '@/stores'
import { usePackageDetail } from '@/composables/usePackageDetail'
import { useFormat } from '@/composables/useFormat'
import MetroRoundel from './MetroRoundel.vue'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const router = useRouter()
const store = usePackagesStore()
const { date, time, sourceName } = useFormat()
const { pkg, versions, loadingVersions, installed, isInstalled, installedVersion, latestVersion, record, operation, busy, install, update, uninstall } = usePackageDetail(() => props.id)
const confirmOpen = ref(false)

const isHere = (v: string) => isInstalled.value && v === installedVersion.value

const facts = computed(() => pkg.value ? [
  { label: t('detail.packageId'), value: pkg.value.id, class: 'font-mono text-xs' },
  { label: t('library.col.installed'), value: installedVersion.value || t('detail.notInstalled'), class: installedVersion.value ? '' : 'text-ink-3' },
  { label: t('library.col.latest'), value: latestVersion.value || '—', class: 'font-semibold' },
  ...(record.value ? [{ label: t('detail.lastMaintenance'), value: `${date(record.value.date)} · ${record.value.version}`, class: 'text-success font-semibold' }] : [])
] : [])

const history = computed(() => pkg.value ? store.operations.filter(o => o.packageId === pkg.value!.id) : [])
</script>
