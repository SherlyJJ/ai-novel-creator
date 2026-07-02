import { Router, type Request, type Response, type NextFunction } from 'express'
import * as aiService from '../services/aiService.js'
import * as searchService from '../services/searchService.js'
import * as projectService from '../services/projectService.js'
import type { Project, ReviewScores } from '../types/index.js'

const router = Router()

// 封装异步路由处理器，自动捕获错误并传给 next
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }

router.post('/test-connection', asyncHandler(async (req, res) => {
  const userConfig = aiService.extractAIConfigFromHeaders(req)
  if (!userConfig) {
    res.status(400).json({ error: '未配置 AI API Key' })
    return
  }
  const result = await aiService.chatCompletion(
    [
      { role: 'system', content: '你是一个测试助手。' },
      { role: 'user', content: '请回复"连接成功"三个字。' },
    ],
    { temperature: 0, maxTokens: 50 },
    userConfig
  )
  res.json({ success: true, message: result.trim() })
}))

router.post('/search-fanfic', asyncHandler(async (req, res) => {
  const { workName, authorName, sourceType } = req.body as { workName: string; authorName?: string; sourceType?: 'novel' | 'tv_movie' | 'anime' }
  const userConfig = aiService.extractAIConfigFromHeaders(req)
  const results = await searchService.searchFanficSource(workName, authorName, sourceType || 'novel', userConfig)
  res.json({ results })
}))

router.post('/search-all-types', asyncHandler(async (req, res) => {
  const { workName, authorName } = req.body as { workName: string; authorName?: string }
  const results = await searchService.searchAllSourceTypes(workName, authorName)
  res.json(results)
}))

router.post('/validate-fanfic', asyncHandler(async (req, res) => {
  const { workName, authorName, sourceType } = req.body as { workName: string; authorName?: string; sourceType?: 'novel' | 'tv_movie' | 'anime' }
  const result = await searchService.validateSearchInput(workName, authorName, sourceType || 'novel')
  res.json(result)
}))

router.post('/parse-fanfic', asyncHandler(async (req, res) => {
  const { workName, authorName, sourceType } = req.body as {
    workName: string
    authorName?: string
    sourceType?: 'novel' | 'tv_movie' | 'anime'
  }
  const userConfig = aiService.extractAIConfigFromHeaders(req)
  const data = await searchService.parseFanficFromSearch(workName, authorName || '', sourceType || 'novel', userConfig)
  res.json({ data })
}))

router.post('/generate-intro', asyncHandler(async (req, res) => {
  const { projectId } = req.body as { projectId: string }
  const project = await projectService.getProject(projectId)
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  const userConfig = aiService.extractAIConfigFromHeaders(req)
  const intro = aiService.isAIConfigured(userConfig)
    ? await aiService.generateNovelIntroMock(project)
    : await aiService.generateNovelIntroMock(project)
  res.json({ intro })
}))

router.post('/generate-scene', asyncHandler(async (req, res) => {
  const { projectId, sceneId } = req.body as { projectId: string; sceneId: string }
  const project = await projectService.getProject(projectId)
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  const scene = project.storylines.flatMap((s) => s.scenes).find((s) => s.id === sceneId)
  if (!scene) {
    res.status(404).json({ error: 'Scene not found' })
    return
  }
  const userConfig = aiService.extractAIConfigFromHeaders(req)
  const content = aiService.isAIConfigured(userConfig)
    ? await aiService.generateSceneContent(project, scene.name, scene.description, 1000, '', userConfig)
    : await aiService.generateSceneContentMock(project, scene.name, scene.description, 1000)
  res.json({ content })
}))

router.post('/generate-storyline-scenes', asyncHandler(async (req, res) => {
  const { projectId, description } = req.body as { projectId: string; description: string }
  const project = await projectService.getProject(projectId)
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  const userConfig = aiService.extractAIConfigFromHeaders(req)
  const scenes = await aiService.generateStorylineScenesMock(project, description)
  res.json({ scenes })
}))

router.post('/generate-scene-detail', asyncHandler(async (req, res) => {
  const { projectId, description } = req.body as { projectId: string; description: string }
  const project = await projectService.getProject(projectId)
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  const userConfig = aiService.extractAIConfigFromHeaders(req)
  const detail = aiService.isAIConfigured(userConfig)
    ? await aiService.generateSceneDetail(project, description, userConfig)
    : await aiService.generateSceneDetailMock(project, description)
  res.json({ detail })
}))

router.post('/generate-biography', asyncHandler(async (req, res) => {
  const { character } = req.body as { character: { name: string; background?: string; personality?: string; wants?: string; fears?: string } }
  const userConfig = aiService.extractAIConfigFromHeaders(req)
  const biography = await aiService.generateCharacterBiographyMock(character)
  res.json({ biography })
}))

router.post('/review', asyncHandler(async (req, res) => {
  const { projectId } = req.body as { projectId: string }
  const project = await projectService.getProject(projectId)
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  const userConfig = aiService.extractAIConfigFromHeaders(req)
  const review = await aiService.generateReviewMock(project)
  res.json({ review })
}))

router.post('/review-dimension', asyncHandler(async (req, res) => {
  const { projectId, dimension } = req.body as { projectId: string; dimension: keyof ReviewScores }
  const project = await projectService.getProject(projectId)
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  const userConfig = aiService.extractAIConfigFromHeaders(req)
  const suggestions = await aiService.generateDimensionSuggestionsMock(project, dimension)
  res.json({ suggestions })
}))

export default router
