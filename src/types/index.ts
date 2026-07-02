export type CharacterRole = 'protagonist' | 'supporting'

export interface Character {
  id: string
  name: string
  role: CharacterRole
  alias?: string
  appearance?: string
  personality?: string
  wants: string
  fears: string
  background?: string
  biography?: string
  isBiographyGenerated: boolean
  createdAt: number
}

export type StorylineType = 'main' | 'branch'

export interface Scene {
  id: string
  name: string
  description: string
  characters: string[] // character ids
  order: number
  status: 'pending' | 'done'
  isReference?: boolean // 原作引用开关，打开时正文不撰写该场景，只作为前后衔接
}

export interface Storyline {
  id: string
  name: string
  type: StorylineType
  description: string
  parentSceneId?: string // for branch storylines, which scene it branches from
  color: string
  scenes: Scene[]
  source?: 'fanfic' | 'manual'
}

export interface Direction {
  platform: string
  readerType: string
  structure: string
  perspective: string
}

export interface FanficSource {
  workName: string
  authorName: string
  characters: string
  plot: string
  isEnabled: boolean
  // 保存搜索结果和解析数据
  searchResults?: {
    novel: SearchResult[]
    tv_movie: SearchResult[]
    anime: SearchResult[]
    availability: {
      novel: boolean
      tv_movie: boolean
      anime: boolean
    }
    workExists: boolean
    adaptationNames?: string[]
  }
  parsedData?: {
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
  }
}

// 搜索结果类型
export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
}

export interface NovelSettings {
  name: string
  background: string
  theme: string
  forbidden: string
  type: string[]
  tags: string[]
  direction: Direction
  fanfic: FanficSource
}

export interface ReviewScores {
  // 基础维度
  logic: number // 逻辑性：情节因果关系是否清晰
  coherence: number // 连贯性：整体叙事是否流畅连贯
  rationality: number // 合理性：人物决策和事件发展是否合理
  // 人物维度
  consistency: number // 人物一致性：言行风格前后是否一致
  depth: number // 人物深度：人物内心刻画是否丰富
  fidelity: number // 原作还原度：人物性格、世界观是否保持原作风格（同人文专用）
  // 情感维度
  resonance: number // 共鸣：情感表达是否能引发读者共鸣
  tension: number // 张力：冲突和悬念是否足够吸引人
  // 结构维度
  pacing: number // 节奏：叙事节奏是否合理
  fanfic_coherence: number // 同人衔接：与原作情节的衔接是否自然（同人文专用）
}

export type ReviewModule = 'characters' | 'storylines' | 'scenes' | 'creation' | 'settings'

export interface ReviewSuggestion {
  id: string
  dimension: keyof ReviewScores
  module: ReviewModule
  targetId?: string
  targetName?: string
  issue: string
  advice: string
  applied: boolean
  generatedAt: number
}

export interface Review {
  scores: ReviewScores
  overallScore: number
  suggestions: string[]
  dimensionSuggestions?: Record<keyof ReviewScores, ReviewSuggestion[]>
  generatedAt?: number
}

export interface Creation {
  intro: string
  outline: string
  content: string
  status: 'idle' | 'selecting' | 'generating_outline' | 'outline_confirmed' | 'generating_content' | 'done'
  progress: number
  currentSceneIndex: number
  selectedMainStorylineId: string | null
  selectedBranchStorylineIds: string[]
}

export interface Project {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  settings: NovelSettings
  characters: Character[]
  storylines: Storyline[]
  creation: Creation
  review?: Review
}

export const DEFAULT_SETTINGS: NovelSettings = {
  name: '同人作品',
  background: '原作世界观',
  theme: '基于原作的同人二次创作',
  forbidden: '不出现OOC（人物崩坏）；不涉及血腥暴力描写；保持原作人物性格基调。',
  type: [],
  tags: [],
  direction: {
    platform: 'LOFTER',
    readerType: '女性向',
    structure: '起承转合',
    perspective: '第三人称有限',
  },
  fanfic: {
    workName: '',
    authorName: '',
    characters: '',
    plot: '',
    isEnabled: true,
  },
}

export const DEFAULT_CREATION: Creation = {
  intro: '',
  outline: '',
  content: '',
  status: 'idle',
  progress: 0,
  currentSceneIndex: 0,
  selectedMainStorylineId: null,
  selectedBranchStorylineIds: [],
}

export const STORYLINE_COLORS = [
  '#6366F1', // indigo
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#8B5CF6', // violet
  '#F59E0B', // amber
  '#10B981', // emerald
]

export const NOVEL_TYPES = ['古风', '现代', '科幻', '悬疑', '言情', '玄幻', '武侠', '都市', '青春', '奇幻', '仙侠', '历史']
export const NOVEL_TAGS = ['女性向', '男性向', '朝堂', '复仇', '甜宠', '虐恋', '权谋', '江湖', '校园', '职场', '克苏鲁', '无限流', '穿越', '重生', '双男主', '双女主', '群像']

export const PLATFORM_OPTIONS = ['知乎', '小红书', '晋江', '起点', 'LOFTER', '豆瓣阅读', '番茄小说', '个人/其他']
export const READER_TYPE_OPTIONS = ['女性向', '男性向', '全年龄', '青少年', '耽美向', '言情向', '悬疑向']
export const STRUCTURE_OPTIONS = ['三幕式', '起承转合', '英雄之旅', 'Freytag 金字塔', '自由结构']
export const PERSPECTIVE_OPTIONS = ['第一人称', '第三人称有限', '第三人称全知', '多视角交替']
