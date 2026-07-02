import type { Project, ReviewSuggestion } from '@/types'
import { useAIConfigStore } from '@/store/useAIConfigStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const needsJsonHeader = options?.body && (options.method === 'POST' || options.method === 'PUT')

  // 获取 AI 配置并添加到请求头
  const aiConfig = useAIConfigStore.getState().getConfig()
  const aiHeaders: Record<string, string> = {}
  if (aiConfig.apiKey) {
    aiHeaders['X-AI-API-Key'] = aiConfig.apiKey
    aiHeaders['X-AI-API-URL'] = aiConfig.apiUrl
    aiHeaders['X-AI-Model'] = aiConfig.model
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...(needsJsonHeader ? { 'Content-Type': 'application/json' } : {}),
      ...aiHeaders,
      ...options?.headers,
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

export const api = {
  testAIConnection: () => request<{ success: boolean; message: string }>('/ai/test-connection', { method: 'POST' }),

  listProjects: () => request<{ projects: Array<{ id: string; name: string; createdAt: number; updatedAt: number }> }>('/projects'),
  getProject: (id: string) => request<{ project: Project }>(`/projects/${id}`),
  createProject: (project: Project) => request<{ project: Project }>('/projects', { method: 'POST', body: JSON.stringify(project) }),
  updateProject: (id: string, updates: Partial<Project>) => request<{ project: Project }>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  saveProject: (project: Project) => request<{ project: Project }>(`/projects/${project.id}/save`, { method: 'POST', body: JSON.stringify(project) }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),

  searchFanfic: (workName: string, authorName?: string, sourceType?: 'novel' | 'tv_movie' | 'anime') => request<{ results: Array<{ title: string; url: string; snippet: string; source: string }> }>('/ai/search-fanfic', { method: 'POST', body: JSON.stringify({ workName, authorName, sourceType }) }),
  searchAllTypes: (workName: string, authorName?: string) =>
    request<import('./searchService').SearchResultsByType>('/ai/search-all-types', { method: 'POST', body: JSON.stringify({ workName, authorName }) }),
  validateFanfic: (workName: string, authorName?: string, sourceType?: 'novel' | 'tv_movie' | 'anime') =>
    request<import('./searchService').SearchValidationResult>('/ai/validate-fanfic', { method: 'POST', body: JSON.stringify({ workName, authorName, sourceType }) }),
  parseFanfic: (workName: string, authorName?: string, sourceType?: 'novel' | 'tv_movie' | 'anime') =>
    request<{ data: import('./searchService').ParsedFanficData }>('/ai/parse-fanfic', { method: 'POST', body: JSON.stringify({ workName, authorName, sourceType }) }),
  generateIntro: (projectId: string) => request<{ intro: string }>('/ai/generate-intro', { method: 'POST', body: JSON.stringify({ projectId }) }),
  generateScene: (projectId: string, sceneId: string) => request<{ content: string }>('/ai/generate-scene', { method: 'POST', body: JSON.stringify({ projectId, sceneId }) }),
  generateStorylineScenes: (projectId: string, description: string) => request<{ scenes: Array<{ name: string; description: string }> }>('/ai/generate-storyline-scenes', { method: 'POST', body: JSON.stringify({ projectId, description }) }),
  generateSceneDetail: (projectId: string, description: string) =>
    request<{ detail: { name: string; description: string; cause: string; process: string; result: string; location: string } }>('/ai/generate-scene-detail', { method: 'POST', body: JSON.stringify({ projectId, description }) }),
  generateBiography: (character: { name: string; background?: string; personality?: string; wants?: string; fears?: string }) =>
    request<{ biography: string }>('/ai/generate-biography', { method: 'POST', body: JSON.stringify({ character }) }),
  review: (projectId: string) => request<{ review: Project['review'] }>('/ai/review', { method: 'POST', body: JSON.stringify({ projectId }) }),
  reviewDimension: (projectId: string, dimension: keyof NonNullable<Project['review']>['scores']) =>
    request<{ suggestions: ReviewSuggestion[] }>('/ai/review-dimension', { method: 'POST', body: JSON.stringify({ projectId, dimension }) }),
}
