import { computed, ref, watch, type WritableComputedRef } from 'vue'

export interface SettingsSection {
  id: string
  label: string
  items: SettingItem[]
}

export interface SettingItemBase {
  key: string
  label: string
  description?: string
}

export interface BooleanSettingItem extends SettingItemBase {
  type: 'boolean'
  ref: WritableComputedRef<boolean>
}

export interface StringSettingItem extends SettingItemBase {
  type: 'string'
  ref: WritableComputedRef<string>
}

export interface SelectSettingItem extends SettingItemBase {
  type: 'select'
  ref: WritableComputedRef<string>
  options: Array<{ label: string, value: string | number }>
}

export interface NumberSettingItem extends SettingItemBase {
  type: 'number'
  ref: WritableComputedRef<number>
  min?: number
  max?: number
  step?: number
  unit?: string
}

export type SettingItem =
  | BooleanSettingItem
  | StringSettingItem
  | SelectSettingItem
  | NumberSettingItem

export interface SettingsData {
  darkMode: boolean
  defaultMarkdownMode: boolean
  autoSubmitOnBlur: boolean
  dueWarningDays: number
}

export type SettingKey = keyof SettingsData

const STORAGE_KEY = 'todotree.settings'

const getDefaultSettings = (): SettingsData => ({
  darkMode: !! window.matchMedia?.('(prefers-color-scheme: dark)').matches,
  defaultMarkdownMode: false,
  autoSubmitOnBlur: true,
  dueWarningDays: 3,
})

const readStorage = (): SettingsData => {
  const defaults = getDefaultSettings()
  if (typeof window === 'undefined') return defaults

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (! raw) return defaults
    return {
      ...defaults,
      ...(JSON.parse(raw) as Partial<SettingsData>)
    }
  }
  catch {
    return defaults
  }
}

const writeStorage = (settings: SettingsData) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

const applyTheme = (isDarkMode: boolean) => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', isDarkMode)
}

const settingsData = ref<SettingsData>(readStorage())
let themeSyncReady = false

const ensureThemeSync = () => {
  if (themeSyncReady) return

  themeSyncReady = true
  watch(
    () => settingsData.value.darkMode,
    (isDarkMode) => applyTheme(isDarkMode),
    { immediate: true }
  )
}

export function useSettings() {
  ensureThemeSync()

  const updateSetting = <K extends SettingKey>(key: K, value: SettingsData[K]) => {
    settingsData.value[key] = value
    writeStorage(settingsData.value)
  }

  const getSettingItemRef = <K extends SettingKey>(key: K): WritableComputedRef<SettingsData[K]> => computed({
    get: () => settingsData.value[key],
    set: (value) => {
      settingsData.value[key] = value
      writeStorage(settingsData.value)
    },
  })

  const getSections = (): SettingsSection[] => [
    {
      id: 'appearance',
      label: '外观',
      items: [
        {
          key: 'darkMode',
          label: '深色模式',
          type: 'boolean',
          ref: getSettingItemRef('darkMode'),
        }
      ]
    },
    {
      id: 'editing',
      label: '编辑',
      items: [
        {
          key: 'defaultMarkdownMode',
          label: '默认 Markdown 源码模式',
          type: 'boolean',
          ref: getSettingItemRef('defaultMarkdownMode'),
        },
        {
          key: 'autoSubmitOnBlur',
          label: '失去焦点时提交编辑',
          type: 'boolean',
          ref: getSettingItemRef('autoSubmitOnBlur'),
        }
      ]
    },
    {
      id: 'due',
      label: '截止管理',
      items: [
        {
          key: 'dueWarningDays',
          label: '危险剩余时间',
          description: '小于此天数时，截止时间图标和文字开始渐变为红色',
          type: 'number',
          ref: getSettingItemRef('dueWarningDays') as WritableComputedRef<number>,
          min: 1,
          max: 30,
          step: 1,
          unit: '天',
        }
      ]
    }
  ]

  return {
    settingsData,
    updateSetting,
    getSections
  }
}
