<template>
  <div class="px-4 md:px-8 pt-6 pb-8 grid gap-6">
    <button class="w-fit inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink" @click="router.back()">
      <ArrowLeft class="w-4 h-4" />{{ t('nav.back') }}
    </button>

    <div v-if="!pkg" class="py-20 text-center text-ink-2"><Loader2 class="w-5 h-5 animate-spin inline mr-2" />{{ t('detail.loading') }}</div>

    <template v-else>
      <header class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div class="min-w-0">
          <h1 class="font-display text-[clamp(1.5rem,1.2rem+0.8vw,1.75rem)] font-semibold tracking-tight leading-tight">{{ pkg.name }}</h1>
          <p class="mt-1 text-sm text-ink-2">{{ pkg.publisher || t('detail.unknownPublisher') }}</p>
        </div>
        <div class="flex gap-2 shrink-0">
          <template v-if="busy && operation">
            <div class="w-56"><LedgerStatus v-if="installed" :pkg="installed" /><span v-else class="text-sm text-ink-2">{{ t(`state.${operation.type}Running`, { p: operation.progress }) }}</span></div>
          </template>
          <template v-else-if="isInstalled">
            <button class="h-9 px-3.5 rounded-md border border-rule bg-surface text-sm text-danger hover:bg-tint" @click="confirmOpen = true">{{ t('state.uninstall') }}</button>
            <button v-if="installed?.hasUpdate" class="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90" @click="update">
              {{ t('detail.updateTo', { v: installed.availableVersion }) }}
            </button>
          </template>
          <button v-else class="h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90" @click="install()">{{ t('discover.install') }}</button>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_23.75rem] gap-6 items-start">
        <div class="grid gap-6">
          <section class="rounded-lg border border-rule bg-surface overflow-hidden">
            <h2 class="label-caps h-8 px-4 flex items-center bg-tint border-b border-rule">{{ t('detail.record') }}</h2>
            <dl class="grid grid-cols-[minmax(7rem,11.25rem)_1fr] text-sm">
              <template v-for="row in facts" :key="row.label">
                <dt class="px-4 h-row flex items-center text-ink-2 border-b border-rule border-r">{{ row.label }}</dt>
                <dd class="px-4 h-row flex items-center border-b border-rule" :class="row.class" :style="row.style">{{ row.value }}</dd>
              </template>
              <dt class="px-4 py-3 text-ink-2 border-r border-rule">{{ t('library.col.status') }}</dt>
              <dd class="px-4 py-3">
                <LedgerStatus v-if="installed" :pkg="installed" />
                <span v-else class="text-sm text-ink-3">{{ t('detail.notInstalled') }}</span>
              </dd>
            </dl>
          </section>

          <section>
            <h2 class="label-caps mb-2">{{ t('detail.description') }}</h2>
            <p class="text-ink-2 leading-relaxed max-w-[70ch]">{{ pkg.description || t('detail.noDescription') }}</p>
          </section>
          <p class="text-sm text-ink-3 inline-flex items-center gap-2"><ShieldAlert class="w-4 h-4" />{{ t('detail.adminNote') }}</p>
        </div>

        <div class="grid gap-6">
          <section class="rounded-lg border border-rule bg-surface overflow-hidden">
            <h2 class="label-caps h-8 px-4 flex items-center bg-tint border-b border-rule">{{ t('detail.versions') }}</h2>
            <div v-if="loadingVersions" class="px-4 py-6 text-sm text-ink-2"><Loader2 class="w-4 h-4 animate-spin inline mr-2" />{{ t('detail.versionsLoading') }}</div>
            <p v-else-if="!versions.length" class="px-4 py-6 text-sm text-ink-2">{{ t('detail.noVersions') }}</p>
            <ul v-else>
              <li v-for="(v, i) in versions" :key="v" class="h-row px-4 flex items-center gap-3 border-t border-rule first:border-t-0 text-sm">
                <span class="font-semibold">{{ v }}</span>
                <span v-if="i === 0" class="text-xs text-ink-3">{{ t('detail.latest') }}</span>
                <span v-if="isInstalled && v === installedVersion" class="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-signature">{{ t('detail.installedHere') }}</span>
                <button
                  v-if="!(isInstalled && v === installedVersion)"
                  class="ml-auto text-xs font-semibold text-primary hover:underline underline-offset-2 disabled:opacity-50"
                  :disabled="busy"
                  @click="install(v)"
                >{{ isInstalled ? t('detail.switchTo') : t('detail.installThis') }}</button>
              </li>
            </ul>
          </section>

          <section class="rounded-lg border border-rule bg-surface overflow-hidden">
            <h2 class="label-caps h-8 px-4 flex items-center bg-tint border-b border-rule">{{ t('detail.history') }}</h2>
            <ul v-if="history.length || record" class="px-4 py-3 grid gap-3">
              <li v-if="record"><LedgerStamp :label="t('state.stamped')" :sub="`${date(record.date)} · ${record.version}`" /></li>
              <li v-for="op in history" :key="op.id" class="text-sm flex justify-between gap-3">
                <span>{{ t(`operations.type.${op.type}`) }}<span v-if="op.version" class="text-ink-3"> · {{ op.version }}</span></span>
                <span :class="op.status === 'error' ? 'text-danger font-semibold' : 'text-ink-2'">{{ t(`operations.status.${op.status}`) }} · {{ time(op.startedAt) }}</span>
              </li>
            </ul>
            <p v-else class="px-4 py-6 text-sm text-ink-2">{{ t('detail.noHistory') }}</p>
          </section>
        </div>
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
import LedgerStatus from './LedgerStatus.vue'
import LedgerStamp from './LedgerStamp.vue'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const router = useRouter()
const store = usePackagesStore()
const { date, time, sourceName, sourceColor } = useFormat()
const { pkg, versions, loadingVersions, installed, isInstalled, installedVersion, latestVersion, record, operation, busy, install, update, uninstall } = usePackageDetail(() => props.id)
const confirmOpen = ref(false)

const facts = computed(() => pkg.value ? [
  { label: t('detail.packageId'), value: pkg.value.id, class: 'font-mono text-xs' },
  { label: t('library.col.source'), value: sourceName(pkg.value.source), class: 'font-semibold', style: { color: sourceColor(pkg.value.source) } },
  { label: t('library.col.installed'), value: installedVersion.value || t('detail.notInstalled'), class: installedVersion.value ? '' : 'text-ink-3' },
  { label: t('library.col.latest'), value: latestVersion.value || '—', class: 'font-semibold' }
] : [])

const history = computed(() => pkg.value ? store.operations.filter(o => o.packageId === pkg.value!.id) : [])
</script>
