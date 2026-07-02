/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    invoke: (channel: string, ...args: any[]) => Promise<any>
  }
}
