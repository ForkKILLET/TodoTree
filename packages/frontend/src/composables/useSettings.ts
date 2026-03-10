import { computed, ref, type ComputedRef } from 'vue'

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
  ref: ComputedRef<boolean>
}

export interface StringSettingItem extends SettingItemBase {
  type: 'string'
  ref: ComputedRef<string>
}

export interface SelectSettingItem extends SettingItemBase {
  type: 'select'
  ref: ComputedRef<string>
  options: Array<{ label: string, value: string | number }>
}

export type SettingItem =
  | BooleanSettingItem
  | StringSettingItem
  | SelectSettingItem

export interface SettingsData {
  darkMode: boolean
  defaultMarkdownMode: boolean
  autoSubmitOnBlur: boolean
}

export type SettingKey = keyof SettingsData

export function useSettings() {
  const STORAGE_KEY = 'todotree.settings'

  const DEFAULT_SETTINGS: SettingsData = {
    darkMode: !! window.matchMedia?.('(prefers-color-scheme: dark)').matches,
    defaultMarkdownMode: false,
    autoSubmitOnBlur: true,
  }

  const readStorage = (): SettingsData => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (! raw) return DEFAULT_SETTINGS
      return JSON.parse(raw) as SettingsData
    }
    catch {
      return DEFAULT_SETTINGS
    }
  }

  const writeStorage = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsData.value))
  }

  const settingsData = ref<SettingsData>(readStorage())

  const updateSetting = <K extends SettingKey>(key: K, value: SettingsData[K]) => {
    settingsData.value[key] = value
    writeStorage()
  }

  const getSettingItemRef = <K extends SettingKey>(key: K): ComputedRef<SettingsData[K]> => computed({
    get: () => settingsData.value[key],
    set: (value) => {
      settingsData.value[key] = value
      writeStorage()
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
    }
  ]

  return {
    settingsData,
    updateSetting,
    getSections
  }
}
