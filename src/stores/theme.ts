import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useStorage, usePreferredDark } from '@vueuse/core'
import { BUILTIN_THEMES, applyTheme, parseThemeJson, withDefaultColors } from '@/themes/tokens'
import type { ThemeDefinition, Mode, TemplateId } from '@/themes/tokens'

export type ModePreference = Mode | 'system'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

export const useThemeStore = defineStore('theme', () => {
  const customThemes = useStorage<ThemeDefinition[]>('theme.custom', [])
  const activeId = useStorage('theme.active', 'ledger')
  const modePreference = useStorage<ModePreference>('theme.mode', 'system')
  const prefersDark = usePreferredDark()

  const themes = computed(() => [...BUILTIN_THEMES, ...customThemes.value.map(withDefaultColors)])
  const active = computed(() => themes.value.find(t => t.id === activeId.value) ?? BUILTIN_THEMES[0])
  const mode = computed<Mode>(() => modePreference.value === 'system' ? (prefersDark.value ? 'dark' : 'light') : modePreference.value)
  const isBuiltin = (id: string) => BUILTIN_THEMES.some(t => t.id === id)

  const draft = ref<ThemeDefinition | null>(null)
  let modeBeforeEditing: ModePreference = 'system'
  const preview = computed(() => draft.value ?? active.value)
  const template = computed(() => preview.value.template)
  const editing = computed(() => draft.value !== null)

  watch([preview, mode], () => applyTheme(preview.value, mode.value), { immediate: true, deep: true })

  function select(id: string) {
    draft.value = null
    activeId.value = id
  }

  function startEditing(id: string, copyName: (name: string) => string) {
    const source = themes.value.find(t => t.id === id)
    if (!source) return
    activeId.value = id
    modeBeforeEditing = modePreference.value
    draft.value = isBuiltin(id) ? { ...clone(source), id: `custom-${Date.now()}`, name: copyName(source.name) } : clone(source)
  }

  function setDraftTemplate(value: TemplateId) {
    if (draft.value) draft.value.template = value
  }

  function resetDraft() {
    if (!draft.value) return
    const base = BUILTIN_THEMES.find(t => t.template === draft.value!.template) ?? BUILTIN_THEMES[0]
    Object.assign(draft.value, { light: clone(base.light), dark: clone(base.dark), scalars: clone(base.scalars) })
  }

  function useDefault() {
    select(BUILTIN_THEMES[0].id)
    modePreference.value = 'system'
  }

  function closeEditor() {
    draft.value = null
    modePreference.value = modeBeforeEditing
  }

  function cancelEditing() {
    closeEditor()
  }

  function saveDraft() {
    if (!draft.value) return
    const theme = { ...clone(draft.value), name: draft.value.name.trim().slice(0, 60) || active.value.name }
    const index = customThemes.value.findIndex(t => t.id === theme.id)
    if (index >= 0) customThemes.value.splice(index, 1, theme)
    else customThemes.value.push(theme)
    closeEditor()
    activeId.value = theme.id
  }

  function remove(id: string) {
    customThemes.value = customThemes.value.filter(t => t.id !== id)
    if (activeId.value === id) select(BUILTIN_THEMES[0].id)
  }

  function exportJson(id = activeId.value) {
    const theme = themes.value.find(t => t.id === id)
    return JSON.stringify(theme, null, 2)
  }

  function importJson(text: string) {
    const theme = parseThemeJson(text)
    if (isBuiltin(theme.id) || themes.value.some(t => t.id === theme.id)) theme.id = `custom-${Date.now()}`
    customThemes.value.push(theme)
    select(theme.id)
    return theme
  }

  return {
    themes, active, activeId, mode, modePreference, template, draft, preview, editing,
    isBuiltin, select, startEditing, setDraftTemplate, resetDraft, useDefault, cancelEditing, saveDraft, remove, exportJson, importJson
  }
})
