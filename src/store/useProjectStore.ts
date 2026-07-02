import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Project,
  NovelSettings,
  Character,
  Storyline,
  Scene,
  Creation,
  Review,
} from '@/types'
import {
  DEFAULT_SETTINGS,
  DEFAULT_CREATION,
  STORYLINE_COLORS,
} from '@/types'
import { nanoid } from '@/lib/utils'

interface ProjectState {
  projects: Project[]
  currentProjectId: string | null
  lastSavedAt: number | null
  backendAvailable: boolean
}

interface ProjectActions {
  createProject: (name?: string) => string
  deleteProject: (id: string) => void
  setCurrentProject: (id: string) => void
  getCurrentProject: () => Project | undefined
  saveCurrentProject: () => void
  initialize: () => void

  updateSettings: (settings: Partial<NovelSettings>) => void

  addCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'isBiographyGenerated'>) => void
  updateCharacter: (id: string, updates: Partial<Character>) => void
  deleteCharacter: (id: string) => void
  setCharacterBiography: (id: string, biography: string) => void

  addStoryline: (storyline: Omit<Storyline, 'id' | 'color' | 'scenes'>) => string
  updateStoryline: (id: string, updates: Partial<Storyline>) => void
  deleteStoryline: (id: string) => void
  addScene: (storylineId: string, scene: Omit<Scene, 'id'>) => void
  insertScene: (storylineId: string, index: number, scene: Omit<Scene, 'id'>) => void
  updateScene: (storylineId: string, sceneId: string, updates: Partial<Scene>) => void
  deleteScene: (storylineId: string, sceneId: string) => void
  reorderScenes: (storylineId: string, sceneIds: string[]) => void

  updateCreation: (updates: Partial<Creation>) => void
  appendCreationContent: (text: string) => void

  setReview: (review: Review | undefined) => void
  applyReviewSuggestion: (suggestionId: string) => void

  importCharacters: (characters: Omit<Character, 'id' | 'createdAt' | 'isBiographyGenerated'>[]) => void
  importStorylines: (
    items: {
      storyline: Omit<Storyline, 'id' | 'color' | 'scenes'>
      scenes: Array<Omit<Scene, 'id'>>
    }[]
  ) => void
  clearCharacters: () => void
  clearStorylines: () => void
  resetFromFanfic: (fanficData: {
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
  }) => void
}

const createDefaultProject = (name = '长安夜雨'): Project => {
  const char1: Character = {
    id: nanoid(),
    name: '沈清辞',
    role: 'protagonist',
    alias: '江南沈氏独女',
    appearance: '眉目清冷，一双眼睛沉静如深潭',
    personality: '坚韧隐忍，外柔内刚',
    wants: '查清父亲冤案，为家族正名',
    fears: '真相被权力永远掩埋',
    background: '本是江南富商沈家独女，父亲含冤入狱自缢，她化名舞姬入长安查案。',
    biography: '',
    isBiographyGenerated: false,
    createdAt: Date.now(),
  }

  const char2: Character = {
    id: nanoid(),
    name: '萧景珩',
    role: 'protagonist',
    alias: '大理寺卿',
    appearance: '身姿挺拔，眉目冷峻，常年一袭玄衣',
    personality: '心思缜密，表面冷傲内心正义',
    wants: '查清三年前旧案，还公道于人',
    fears: '在权势面前无能为力',
    background: '出身将门，少年入仕，因旧友案卷对朝堂暗流心存警惕。',
    biography: '',
    isBiographyGenerated: false,
    createdAt: Date.now() + 1,
  }

  const char3: Character = {
    id: nanoid(),
    name: '顾长风',
    role: 'supporting',
    alias: '江湖游侠',
    appearance: '腰悬长剑，笑容爽朗',
    personality: '豪爽仗义，粗中有细',
    wants: '报答沈家昔日恩情',
    fears: '连累无辜之人',
    background: '早年受沈家恩惠，得知沈家变故后暗中护沈清辞入长安。',
    biography: '',
    isBiographyGenerated: false,
    createdAt: Date.now() + 2,
  }

  const mainLine: Storyline = {
    id: nanoid(),
    name: '主线',
    type: 'main',
    description: '沈清辞化名入长安，与萧景珩从互相试探到联手，揭开朝堂与江湖交织的阴谋。',
    color: STORYLINE_COLORS[0],
    scenes: [
      {
        id: nanoid(),
        name: '雨夜惊变',
        description: '沈清辞收到父亲绝笔，连夜赶往长安。',
        characters: [char1.id],
        order: 0,
        status: 'done',
      },
      {
        id: nanoid(),
        name: '化名入府',
        description: '以舞姬身份进入权贵府邸，暗中搜集证据。',
        characters: [char1.id, char2.id],
        order: 1,
        status: 'done',
      },
      {
        id: nanoid(),
        name: '宴会交锋',
        description: '萧景珩在宴会上试探沈清辞，两人第一次正面交锋。',
        characters: [char1.id, char2.id],
        order: 2,
        status: 'pending',
      },
    ],
  }

  return {
    id: nanoid(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: { ...DEFAULT_SETTINGS, name },
    characters: [char1, char2, char3],
    storylines: [mainLine],
    creation: { ...DEFAULT_CREATION },
  }
}

export const useProjectStore = create<ProjectState & ProjectActions>()(
  persist(
    (set, get) => ({
      projects: [createDefaultProject()],
      currentProjectId: null,
      lastSavedAt: Date.now(),
      backendAvailable: true,

      createProject: (name) => {
        const project = createDefaultProject(name || `新建项目 ${get().projects.length + 1}`)
        set((state) => ({
          projects: [project, ...state.projects],
          currentProjectId: project.id,
          lastSavedAt: Date.now(),
        }))
        return project.id
      },

      deleteProject: (id) => {
        set((state) => {
          const projects = state.projects.filter((p) => p.id !== id)
          return {
            projects,
            currentProjectId:
              state.currentProjectId === id
                ? projects[0]?.id || null
                : state.currentProjectId,
            lastSavedAt: Date.now(),
          }
        })
      },

      setCurrentProject: (id) => {
        set({ currentProjectId: id })
      },

      getCurrentProject: () => {
        const { projects, currentProjectId } = get()
        return projects.find((p) => p.id === currentProjectId) || projects[0]
      },

      saveCurrentProject: () => {
        set({ lastSavedAt: Date.now() })
      },

      initialize: () => {
        set({ backendAvailable: true })
      },

      updateSettings: (settings) => {
        set((state) => {
          const project = state.projects.find((p) => p.id === state.currentProjectId) || state.projects[0]
          if (!project) return state
          const updated = {
            ...project,
            updatedAt: Date.now(),
            settings: { ...project.settings, ...settings },
            name: settings.name || project.settings.name || project.name,
          }
          return {
            projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
            lastSavedAt: Date.now(),
          }
        })
      },

      addCharacter: (character) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          characters: [
            ...project.characters,
            {
              ...character,
              id: nanoid(),
              createdAt: Date.now(),
              isBiographyGenerated: false,
            },
          ],
        })))
      },

      updateCharacter: (id, updates) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          characters: project.characters.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })))
      },

      deleteCharacter: (id) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          characters: project.characters.filter((c) => c.id !== id),
        })))
      },

      setCharacterBiography: (id, biography) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          characters: project.characters.map((c) =>
            c.id === id ? { ...c, biography, isBiographyGenerated: true } : c
          ),
        })))
      },

      addStoryline: (storyline) => {
        const id = nanoid()
        set((state) => {
          const project = state.projects.find((p) => p.id === state.currentProjectId) || state.projects[0]
          if (!project) return state
          const colorIndex = project.storylines.length % STORYLINE_COLORS.length
          const updated = {
            ...project,
            updatedAt: Date.now(),
            storylines: [
              ...project.storylines,
              {
                ...storyline,
                id,
                color: STORYLINE_COLORS[colorIndex],
                scenes: [],
              },
            ],
          }
          return {
            projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
            lastSavedAt: Date.now(),
          }
        })
        return id
      },

      updateStoryline: (id, updates) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          storylines: project.storylines.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })))
      },

      deleteStoryline: (id) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          storylines: project.storylines.filter((s) => s.id !== id),
        })))
      },

      addScene: (storylineId, scene) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          storylines: project.storylines.map((s) =>
            s.id === storylineId
              ? {
                  ...s,
                  scenes: [
                    ...s.scenes,
                    {
                      ...scene,
                      id: nanoid(),
                    },
                  ],
                }
              : s
          ),
        })))
      },

      insertScene: (storylineId, index, scene) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          storylines: project.storylines.map((s) => {
            if (s.id !== storylineId) return s
            const sorted = s.scenes.slice().sort((a, b) => a.order - b.order)
            const clamped = Math.max(0, Math.min(index, sorted.length))
            const inserted = {
              ...scene,
              id: nanoid(),
              order: clamped,
            }
            const next = [...sorted.slice(0, clamped), inserted, ...sorted.slice(clamped)].map((sc, i) => ({
              ...sc,
              order: i,
            }))
            return { ...s, scenes: next }
          }),
        })))
      },

      updateScene: (storylineId, sceneId, updates) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          storylines: project.storylines.map((s) =>
            s.id === storylineId
              ? {
                  ...s,
                  scenes: s.scenes.map((scene) =>
                    scene.id === sceneId ? { ...scene, ...updates } : scene
                  ),
                }
              : s
          ),
        })))
      },

      deleteScene: (storylineId, sceneId) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          storylines: project.storylines.map((s) =>
            s.id === storylineId
              ? { ...s, scenes: s.scenes.filter((scene) => scene.id !== sceneId) }
              : s
          ),
        })))
      },

      reorderScenes: (storylineId, sceneIds) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          storylines: project.storylines.map((s) => {
            if (s.id !== storylineId) return s
            const sceneMap = new Map(s.scenes.map((scene) => [scene.id, scene]))
            return {
              ...s,
              scenes: sceneIds
                .map((id) => sceneMap.get(id))
                .filter((scene): scene is Scene => Boolean(scene))
                .map((scene, index) => ({ ...scene, order: index })),
            }
          }),
        })))
      },

      updateCreation: (updates) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          creation: { ...project.creation, ...updates },
        })))
      },

      appendCreationContent: (text) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          creation: {
            ...project.creation,
            content: project.creation.content + text,
          },
        })))
      },

      setReview: (review) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          review,
        })))
      },

      applyReviewSuggestion: (suggestionId) => {
        set((state) => updateProjectInState(state, (project) => {
          if (!project.review?.dimensionSuggestions) return project
          const next: Record<keyof import('@/types').ReviewScores, import('@/types').ReviewSuggestion[]> = { ...project.review.dimensionSuggestions }
          Object.keys(next).forEach((key) => {
            const k = key as keyof import('@/types').ReviewScores
            next[k] = next[k].map((s) => (s.id === suggestionId ? { ...s, applied: true } : s))
          })
          return {
            ...project,
            review: {
              ...project.review,
              dimensionSuggestions: next,
            },
          }
        }))
      },

      importCharacters: (characters) => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          characters: [
            ...project.characters,
            ...characters.map((c) => ({
              ...c,
              id: nanoid(),
              createdAt: Date.now(),
              isBiographyGenerated: Boolean(c.biography && c.biography.trim()),
            })),
          ],
        })))
      },

      importStorylines: (items) => {
        set((state) => {
          const project = state.projects.find((p) => p.id === state.currentProjectId) || state.projects[0]
          if (!project) return state
          let colorIndex = project.storylines.length % STORYLINE_COLORS.length
          const newStorylines = items.map((item) => {
            const storyline: Storyline = {
              ...item.storyline,
              id: nanoid(),
              color: STORYLINE_COLORS[colorIndex % STORYLINE_COLORS.length],
              scenes: item.scenes.map((scene) => ({ ...scene, id: nanoid() })),
            }
            colorIndex += 1
            return storyline
          })
          const updated = {
            ...project,
            updatedAt: Date.now(),
            storylines: [...project.storylines, ...newStorylines],
          }
          return {
            projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
            lastSavedAt: Date.now(),
          }
        })
      },

      clearCharacters: () => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          characters: [],
        })))
      },

      clearStorylines: () => {
        set((state) => updateProjectInState(state, (project) => ({
          ...project,
          storylines: [],
        })))
      },

      resetFromFanfic: ({ workName, authorName, background, theme, forbidden, type, tags, direction }) => {
        set((state) => updateProjectInState(state, (project) => {
          const nextType = type && type.length > 0 ? type : project.settings.type
          const nextTags = tags && tags.length > 0 ? tags : project.settings.tags
          return {
            ...project,
            name: `${workName}·同人`,
            settings: {
              ...project.settings,
              name: `${workName}·同人`,
              background: background || project.settings.background,
              theme: theme || `基于《${workName}》的同人二次创作`,
              forbidden: forbidden || project.settings.forbidden,
              type: nextType,
              tags: nextTags,
              direction: {
                ...project.settings.direction,
                ...(direction || {}),
              },
              fanfic: {
                ...project.settings.fanfic,
                workName,
                authorName,
                isEnabled: true,
              },
            },
          }
        }))
      },
    }),
    {
      name: 'ai-novel-creator-storage',
      version: 1,
      partialize: (state) => {
        const { lastSavedAt, ...persisted } = state as ProjectState
        return persisted
      },
    }
  )
)

function updateProjectInState(
  state: ProjectState,
  updater: (project: Project) => Project
) {
  const project = state.projects.find((p) => p.id === state.currentProjectId) || state.projects[0]
  if (!project) return state
  const updated = {
    ...updater(project),
    updatedAt: Date.now(),
  }
  return {
    projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    lastSavedAt: Date.now(),
  }
}
