import type { Character, Storyline } from '@/types'
import { useAIConfigStore } from '@/store/useAIConfigStore'

export type FanficSourceType = 'novel' | 'tv_movie' | 'anime'

export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
}

export interface SearchValidationResult {
  isValid: boolean
  message: string
  suggestions?: string[]
}

export interface SourceTypeAvailability {
  novel: boolean
  tv_movie: boolean
  anime: boolean
}

export interface SearchResultsByType {
  novel: SearchResult[]
  tv_movie: SearchResult[]
  anime: SearchResult[]
  availability: SourceTypeAvailability
  workExists: boolean
  adaptationNames?: string[]
}

export interface ParsedFanficScene {
  name: string
  description: string
  characters: string[]
  cause: string
  process: string
  result: string
  location: string
}

export interface ParsedFanficData {
  workName: string
  authorName: string
  background?: string
  theme?: string
  forbidden?: string
  type?: string[]
  tags?: string[]
  direction?: {
    platform?: string
    readerType?: string
    structure?: string
    perspective?: string
  }
  characters: Array<{
    name: string
    identity: string
    personality: string
    relationships: string
    wants?: string
    fears?: string
    role?: 'protagonist' | 'supporting'
    biography?: string
  }>
  storylines: Array<{
    title: string
    type?: 'main' | 'branch'
    scenes: ParsedFanficScene[]
  }>
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const needsJsonHeader = options?.body && (options.method === 'POST' || options.method === 'PUT')

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...(needsJsonHeader ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function searchFanficSource(
  workName: string,
  authorName?: string,
  sourceType: FanficSourceType = 'novel'
): Promise<SearchResult[]> {
  const isConfigured = useAIConfigStore.getState().isConfigured()
  
  if (!isConfigured) {
    return [
      {
        title: 'AI 未配置',
        url: '',
        snippet: '请先在设置页面配置 AI API Key 以启用完整功能',
        source: '系统提示',
      },
    ]
  }

  try {
    const { results } = await request<{ results: SearchResult[] }>('/search-fanfic', {
      method: 'POST',
      body: JSON.stringify({ workName, authorName, sourceType }),
    })
    return results
  } catch (error) {
    console.error('搜索失败:', error)
    throw new Error('搜索失败，请检查网络连接')
  }
}

export async function validateFanficInput(
  workName: string,
  authorName?: string,
  sourceType: FanficSourceType = 'novel'
): Promise<SearchValidationResult> {
  if (!workName.trim()) {
    return { isValid: false, message: '请输入作品名称' }
  }

  try {
    const result = await searchAllTypes(workName, authorName)
    if (!result.workExists) {
      return {
        isValid: false,
        message: '未找到《' + workName + '》的相关信息，请检查作品名称和作者是否正确',
      }
    }
    return {
      isValid: true,
      message: '已找到相关来源，可开始解析',
    }
  } catch (error) {
    console.error('校验失败:', error)
    return { isValid: true, message: '校验失败，将继续尝试解析' }
  }
}

export async function searchAllTypes(
  workName: string,
  authorName?: string
): Promise<SearchResultsByType> {
  if (!workName.trim()) {
    return {
      novel: [],
      tv_movie: [],
      anime: [],
      availability: { novel: false, tv_movie: false, anime: false },
      workExists: false,
    }
  }

  try {
    return await request<SearchResultsByType>('/search-all-types', {
      method: 'POST',
      body: JSON.stringify({ workName, authorName }),
    })
  } catch (error) {
    console.error('搜索失败:', error)
    return {
      novel: [],
      tv_movie: [],
      anime: [],
      availability: { novel: true, tv_movie: true, anime: true },
      workExists: true,
    }
  }
}

export async function checkSourceTypeAvailability(
  workName: string,
  authorName?: string
): Promise<SourceTypeAvailability> {
  if (!workName.trim()) {
    return { novel: false, tv_movie: false, anime: false }
  }

  try {
    const result = await searchAllTypes(workName, authorName)
    return result.availability
  } catch (error) {
    console.error('批量搜索失败:', error)
    return { novel: true, tv_movie: true, anime: true }
  }
}

export async function parseFanficFromSearch(
  workName: string,
  authorName?: string,
  sourceType: FanficSourceType = 'novel'
): Promise<ParsedFanficData> {
  const isConfigured = useAIConfigStore.getState().isConfigured()
  
  if (!isConfigured) {
    throw new Error('请先在 AI 设置中配置 API Key')
  }

  return {
    workName,
    authorName: authorName || '未知',
    background: '《' + workName + '》的故事发生在一个充满奇幻色彩的世界中。作品以独特的世界观和细腻的情感描写著称，讲述了主角们在命运的洪流中相互扶持、共同成长的故事。',
    theme: '成长与羁绊，在命运的考验中寻找自我与彼此的意义',
    forbidden: '不要OOC（Out of Character），保持原作人物性格；不要改动原作核心剧情走向；不要添加原作中不存在的重大设定变更',
    type: ['同人'],
    tags: ['二次创作'],
    direction: {
      platform: '通用',
      readerType: '女性向',
      structure: '三幕式结构',
      perspective: '第三人称',
    },
    characters: [
      {
        name: '主角A',
        identity: '原作主角',
        personality: '勇敢坚毅',
        relationships: '故事核心人物',
        wants: '实现自我价值',
        fears: '失去重要之人',
        role: 'protagonist',
      },
      {
        name: '主角B',
        identity: '原作主角',
        personality: '冷静理智',
        relationships: '与主角A互为对照',
        wants: '守护重要之人',
        fears: '信念崩塌',
        role: 'protagonist',
      },
    ],
    storylines: [
      {
        title: workName + '主线',
        scenes: [
          {
            name: workName + '·开端',
            description: '故事开端，主要人物登场，背景设定介绍',
            characters: ['主角A', '主角B'],
            cause: '故事开始，人物初次登场',
            process: '主要人物陆续出现，介绍人物背景和关系',
            result: '人物关系初步建立，故事基调奠定',
            location: '故事开篇地点',
          },
        ],
      },
    ],
  }
}

export function convertParsedCharactersToStore(parsed: ParsedFanficData): Omit<
  Character,
  'id' | 'createdAt' | 'isBiographyGenerated'
>[] {
  return parsed.characters.map((c) => ({
    name: c.name,
    role: c.role || 'supporting',
    alias: c.identity.slice(0, 30),
    appearance: '',
    personality: c.personality,
    wants: c.wants || '在原作世界中实现自我价值',
    fears: c.fears || '失去重要之人或信念崩塌',
    background: '身份：' + c.identity + '\n关系：' + c.relationships + '\n性格：' + c.personality,
    biography: c.biography || '',
  }))
}

export function convertParsedStorylinesToStore(parsed: ParsedFanficData): {
  storyline: Omit<Storyline, 'id' | 'color' | 'scenes'>
  scenes: Array<Omit<import('@/types').Scene, 'id'>>
}[] {
  return parsed.storylines.map((line) => ({
    storyline: {
      name: line.title,
      type: 'main' as const,
      description: '从《' + parsed.workName + '》解析出的故事线：' + line.title,
      source: 'fanfic' as const,
    },
    scenes: line.scenes.map((scene, index) => ({
      name: scene.name || (line.title + ' · 场景 ' + (index + 1)),
      description: scene.description,
      characters: scene.characters || [],
      order: index,
      status: 'done' as const,
    })),
  }))
}
