import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import projectsRouter from './routes/projects.js'
import aiRouter from './routes/ai.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function createServer() {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // 1x1 透明 GIF，用于前端无报错探测后端是否启动
  app.get('/health.gif', (_req, res) => {
    const gif = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )
    res.setHeader('Content-Type', 'image/gif')
    res.setHeader('Cache-Control', 'no-store')
    res.send(gif)
  })

  app.use('/api/projects', projectsRouter)
  app.use('/api/ai', aiRouter)

  // 生产环境：托管前端静态文件
  const distDir = path.join(__dirname, '../../dist')
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir))
    // SPA 回退：所有非 /api、非 /health 的请求都返回 index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'))
    })
  }

  // 全局错误处理中间件
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server error:', err)
    res.status(500).json({
      error: err.message || 'Internal Server Error',
    })
  })

  return app
}
