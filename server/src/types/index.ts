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
  content: string
  status: 'idle' | 'generating_intro' | 'generating_content' | 'done'
  progress: number
  currentSceneIndex: number
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

export interface ProjectMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}
