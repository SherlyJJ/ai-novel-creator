import { ReactNode, useEffect } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'
import BackgroundEffects from '../effects/BackgroundEffects'
import Sidebar from './Sidebar'
import { useProjectStore } from '@/store/useProjectStore'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const initialize = useProjectStore((state) => state.initialize)
  const backendAvailable = useProjectStore((state) => state.backendAvailable)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#EEF2F7] text-[#1E293B]">
      <BackgroundEffects />
      {backendAvailable === false && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm shadow-lg">
          <WifiOff size={14} />
          <span>后端服务未连接，当前使用本地缓存数据</span>
          <button
            onClick={() => initialize()}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium transition-colors"
          >
            <RefreshCw size={11} />
            重试
          </button>
        </div>
      )}
      <div className="relative z-10 flex h-screen">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
