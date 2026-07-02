import type { Plugin, ViteDevServer, PreviewServer } from 'vite'
import { spawn, type ChildProcess } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import process from 'process'

/**
 * Vite 插件：自动启动后端服务（server/）。
 * 在 dev 与 preview 模式下都会启动，关闭 Vite 时自动结束。
 * 启动后会轮询 /health，待后端真正可用再让 Vite 继续，避免前端初始化时连接失败。
 */
export default function startBackendPlugin(): Plugin {
  let backendProcess: ChildProcess | null = null
  let backendStarted = false

  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const serverDir = path.resolve(__dirname, 'server')
  const healthUrl = 'http://127.0.0.1:3001/health'

  const waitForBackend = async (maxWaitMs = 30000, intervalMs = 500): Promise<boolean> => {
    const start = Date.now()
    while (Date.now() - start < maxWaitMs) {
      try {
        const res = await fetch(healthUrl)
        if (res.ok) return true
      } catch {
        // 后端尚未就绪，继续等待
      }
      await new Promise((r) => setTimeout(r, intervalMs))
    }
    return false
  }

  const isBackendAlreadyRunning = async (): Promise<boolean> => {
    try {
      const res = await fetch(healthUrl)
      return res.ok
    } catch {
      return false
    }
  }

  const startBackend = async () => {
    if (backendStarted) return

    if (await isBackendAlreadyRunning()) {
      console.log('\n[Auto Backend] 检测到后端服务已在运行，无需重复启动\n')
      backendStarted = true
      return
    }

    backendStarted = true

    console.log('\n[Auto Backend] 正在启动后端服务...\n')

    backendProcess = spawn('npm run dev', {
      cwd: serverDir,
      shell: true,
      stdio: 'pipe',
    })

    backendProcess.stdout?.on('data', (data: Buffer) => {
      const line = data.toString().trim()
      if (line) console.log(`[Backend] ${line}`)
    })

    backendProcess.stderr?.on('data', (data: Buffer) => {
      const line = data.toString().trim()
      if (line) console.error(`[Backend] ${line}`)
    })

    backendProcess.on('error', (err) => {
      console.error('[Auto Backend] 启动失败:', err.message)
    })

    backendProcess.on('exit', (code) => {
      console.log(`[Auto Backend] 后端进程已退出，退出码: ${code}`)
      backendProcess = null
      backendStarted = false
    })
  }

  const stopBackend = () => {
    if (!backendProcess || backendProcess.killed) return
    console.log('\n[Auto Backend] 正在关闭后端服务...')
    const pid = backendProcess.pid
    if (pid && process.platform === 'win32') {
      // Windows 上 kill 子进程不会自动结束孙子进程，使用 taskkill 结束进程树
      try {
        spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', detached: true })
      } catch {
        backendProcess.kill('SIGTERM')
      }
    } else {
      backendProcess.kill('SIGTERM')
    }
  }

  const attachClose = (server: ViteDevServer | PreviewServer) => {
    const originalClose = server.close.bind(server)
    server.close = async () => {
      stopBackend()
      return originalClose()
    }
  }

  // Vite 异常退出时尽量清理后端进程，避免端口占用
  process.once('SIGINT', stopBackend)
  process.once('SIGTERM', stopBackend)
  process.once('exit', stopBackend)

  return {
    name: 'start-backend',
    apply: 'serve',
    async configureServer(server) {
      await startBackend()
      const ready = await waitForBackend(10000)
      if (ready) {
        console.log('\n[Auto Backend] 后端服务已就绪\n')
      } else {
        console.warn('\n[Auto Backend] 后端服务启动超时，前端将使用本地缓存数据\n')
      }
      attachClose(server)
    },
    async configurePreviewServer(server) {
      await startBackend()
      const ready = await waitForBackend(10000)
      if (ready) {
        console.log('\n[Auto Backend] 后端服务已就绪\n')
      } else {
        console.warn('\n[Auto Backend] 后端服务启动超时，前端将使用本地缓存数据\n')
      }
      attachClose(server)
    },
    closeBundle() {
      stopBackend()
    },
  }
}
