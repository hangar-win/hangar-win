import { useI18n } from 'vue-i18n'
import { PackageSource } from '@/models'

export function useFormat() {
  const { t, locale } = useI18n()

  const date = (value: string | number) =>
    new Intl.DateTimeFormat(locale.value, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))

  const time = (value: number) =>
    new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(new Date(value))

  const sourceName = (source: PackageSource) => t(`source.${source}`)
  const sourceCode = (source: PackageSource) => t(`source.code.${source}`)
  const sourceColor = (source: PackageSource) => `rgb(var(--src-${source}))`

  return { date, time, sourceName, sourceCode, sourceColor }
}
