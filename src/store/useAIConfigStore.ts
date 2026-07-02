import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AIConfig {
  apiUrl: string
  apiKey: string
  model: string
}

interface AIConfigState extends AIConfig {
  isConfigured: () => boolean
  setConfig: (config: Partial<AIConfig>) => void
  getConfig: () => AIConfig
}

export const useAIConfigStore = create<AIConfigState>()(
  persist(
    (set, get) => ({
      apiUrl: 'https://api.deepseek.com/v1/chat/completions',
      apiKey: '',
      model: 'deepseek-chat',

      isConfigured: () => {
        const { apiUrl, apiKey } = get()
        return Boolean(apiUrl && apiKey)
      },

      setConfig: (config) => {
        set(config)
      },

      getConfig: () => {
        const { apiUrl, apiKey, model } = get()
        return { apiUrl, apiKey, model }
      },
    }),
    {
      name: 'ai-novel-creator-ai-config',
    }
  )
)
