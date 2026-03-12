import type { InjectionKey, Ref } from 'vue'
import type { SettingsData } from '@/composables/useSettings'

export const settingsDataInjectionKey: InjectionKey<Ref<SettingsData>> = Symbol('settingsData')
