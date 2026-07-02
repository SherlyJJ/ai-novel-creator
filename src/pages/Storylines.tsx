import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/useProjectStore'
import { generateStorylineScenes, generateSceneDetail } from '@/services/aiService'
import FanficImportModal from '@/components/fanfic/FanficImportModal'
import type { Scene, Storyline, StorylineType } from '@/types'
import { Plus, X, GitBranch, Sparkles, Trash2, Edit3, ChevronDown, ChevronUp, Download, GripVertical } from 'lucide-react'

const emptyStoryline: Omit<Storyline, 'id' | 'color' | 'scenes'> = {
  name: '',
  type: 'main',
  description: '',
  parentSceneId: '',
}

const emptyScene: Omit<Scene, 'id'> = {
  name: '',
  description: '',
  characters: [],
  order: 0,
  status: 'pending',
  isReference: false,
}

export default function Storylines() {
  const navigate = useNavigate()
  const project = useProjectStore((state) => state.getCurrentProject())
  const { addStoryline, updateStoryline, deleteStoryline, addScene, insertScene, updateScene, deleteScene, reorderScenes } = useProjectStore()
  const [isStorylineModalOpen, setIsStorylineModalOpen] = useState(false)
  const [editingStorylineId, setEditingStorylineId] = useState<string | null>(null)
  const [storylineForm, setStorylineForm] = useState(emptyStoryline)
  const [expandedStorylines, setExpandedStorylines] = useState<Set<string>>(new Set())
  const [sceneModal, setSceneModal] = useState<{ storylineId: string; sceneId: string | null; insertIndex?: number } | null>(null)
  const [sceneForm, setSceneForm] = useState(emptyScene)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [ignoreClickUntil, setIgnoreClickUntil] = useState<number>(0)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [aiSceneInput, setAiSceneInput] = useState('')
  const [isGeneratingSceneDetail, setIsGeneratingSceneDetail] = useState(false)
  const lastDropTargetRef = useRef<number | null>(null)

  if (!project) return null

  const getCharacterName = (id: string) => project.characters.find((c) => c.id === id)?.name || id

  const openAddStoryline = () => {
    setEditingStorylineId(null)
    setStorylineForm(emptyStoryline)
    setIsStorylineModalOpen(true)
  }

  const openEditStoryline = (s: Storyline) => {
    setEditingStorylineId(s.id)
    setStorylineForm({
      name: s.name,
      type: s.type,
      description: s.description,
      parentSceneId: s.parentSceneId || '',
    })
    setIsStorylineModalOpen(true)
  }

  const handleSaveStoryline = () => {
    if (!storylineForm.name.trim()) return
    const data = {
      ...storylineForm,
      parentSceneId: storylineForm.parentSceneId || undefined,
    }
    if (editingStorylineId) {
      updateStoryline(editingStorylineId, data)
    } else {
      const id = addStoryline(data)
      setExpandedStorylines((prev) => new Set(prev).add(id))
    }
    setIsStorylineModalOpen(false)
  }

  const openAddScene = (storylineId: string, insertIndex?: number) => {
    setSceneModal({ storylineId, sceneId: null, insertIndex })
    setSceneForm({
      ...emptyScene,
      order: insertIndex ?? (project.storylines.find((s) => s.id === storylineId)?.scenes.length || 0),
    })
  }

  const openEditScene = (storylineId: string, scene: Scene) => {
    setSceneModal({ storylineId, sceneId: scene.id })
    setSceneForm({
      name: scene.name,
      description: scene.description,
      characters: scene.characters,
      order: scene.order,
      status: scene.status,
      isReference: scene.isReference || false,
    })
  }

  const handleGenerateSceneDetail = async () => {
    if (!aiSceneInput.trim() || !project) return
    setIsGeneratingSceneDetail(true)
    try {
      const detail = await generateSceneDetail(project, aiSceneInput.trim())
      setSceneForm((prev) => ({
        ...prev,
        name: detail.name || prev.name,
        description: detail.description || prev.description,
      }))
    } catch (err) {
      console.error('生成场景详情失败:', err)
    } finally {
      setIsGeneratingSceneDetail(false)
    }
  }

  const handleSaveScene = () => {
    if (!sceneModal || !sceneForm.name.trim()) return
    if (sceneModal.sceneId) {
      updateScene(sceneModal.storylineId, sceneModal.sceneId, sceneForm)
    } else if (typeof sceneModal.insertIndex === 'number') {
      insertScene(sceneModal.storylineId, sceneModal.insertIndex, sceneForm)
    } else {
      addScene(sceneModal.storylineId, sceneForm)
    }
    setSceneModal(null)
  }

  const handleDropScene = (storylineId: string, targetIndex: number) => {
    if (!draggedSceneId) return
    const storyline = project.storylines.find((s) => s.id === storylineId)
    if (!storyline) return
    const currentIds = storyline.scenes.slice().sort((a, b) => a.order - b.order).map((s) => s.id)
    const fromIndex = currentIds.indexOf(draggedSceneId)
    if (fromIndex === -1) return

    const next = [...currentIds]
    next.splice(fromIndex, 1)
    // targetIndex is the visual drop position in the original array (including dragged scene).
    // After removing the dragged scene, positions after fromIndex shift left by one.
    const insertAt = Math.max(0, Math.min(targetIndex > fromIndex ? targetIndex - 1 : targetIndex, next.length))
    next.splice(insertAt, 0, draggedSceneId)

    reorderScenes(storylineId, next)
    setIgnoreClickUntil(Date.now() + 300)
    setDropTargetIndex(null)
    setDraggedSceneId(null)
    lastDropTargetRef.current = null
  }

  const handleGenerateScenes = async (storyline: Storyline) => {
    if (useProjectStore.getState().backendAvailable !== true) {
      alert('后端服务未连接，无法 AI 拆解场景')
      return
    }
    setGeneratingId(storyline.id)
    try {
      const scenes = await generateStorylineScenes(project.id, storyline, project.characters, project.settings)
      scenes.forEach((scene) => addScene(storyline.id, scene))
    } catch {
      alert('AI 拆解场景失败，请检查后端服务')
    } finally {
      setGeneratingId(null)
      setExpandedStorylines((prev) => new Set(prev).add(storyline.id))
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedStorylines((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-8">
      <header className="mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">故事线画布</h1>
          <p className="text-xs text-slate-500 mt-1">用折叠长卡片梳理主线与支线，点击场景可编辑</p>
        </div>
      </header>

      {project.storylines.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <GitBranch size={48} className="mb-4 opacity-40" />
          <p className="text-sm">暂无故事线，点击「新增故事线」开始搭建</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-5xl">
          {project.storylines.map((storyline) => {
            const isExpanded = expandedStorylines.has(storyline.id)
            const allScenes = storyline.scenes.slice().sort((a, b) => a.order - b.order)
            const parentScene = project.storylines
              .flatMap((s) => s.scenes)
              .find((scene) => scene.id === storyline.parentSceneId)

            return (
              <div
                key={storyline.id}
                className="glass rounded-2xl p-5 glow-border relative overflow-hidden"
                style={{ borderLeftWidth: '4px', borderLeftColor: storyline.color }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
                      style={{ background: storyline.color }}
                    >
                      {storyline.type === 'main' ? <GitBranch size={20} /> : <Sparkles size={18} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold">{storyline.name}</h3>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full text-white font-semibold"
                          style={{ background: storyline.color }}
                        >
                          {storyline.type === 'main' ? '主线' : '支线'}
                        </span>
                        {parentScene && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/60 text-slate-600 border border-indigo-500/10">
                            从「{parentScene.name}」延伸
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{storyline.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {storyline.source !== 'fanfic' ? (
                      <button
                        onClick={() => handleGenerateScenes(storyline)}
                        disabled={generatingId === storyline.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/60 border border-indigo-500/10 text-xs font-semibold hover:bg-white/80 transition-all disabled:opacity-60"
                      >
                        <Sparkles size={13} />
                        {generatingId === storyline.id ? '拆解中...' : 'AI 拆解场景'}
                      </button>
                    ) : (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        已导入原著场景
                      </span>
                    )}
                    <button
                      onClick={() => openAddScene(storyline.id)}
                      className="p-1.5 rounded-lg bg-white/60 border border-indigo-500/10 hover:bg-white/80 transition-all"
                    >
                      <Plus size={15} />
                    </button>
                    <button
                      onClick={() => openEditStoryline(storyline)}
                      className="p-1.5 rounded-lg bg-white/60 border border-indigo-500/10 hover:bg-white/80 transition-all"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => deleteStoryline(storyline.id)}
                      className="p-1.5 rounded-lg bg-white/60 border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      onClick={() => toggleExpand(storyline.id)}
                      className="p-1.5 rounded-lg bg-white/60 border border-indigo-500/10 hover:bg-white/80 transition-all"
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="relative pl-12 pr-4 py-2">
                    {/* Left timeline */}
                    <div
                      className="absolute left-6 top-0 bottom-0 w-0.5"
                      style={{ background: `${storyline.color}40` }}
                    />

                    {allScenes.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-6">暂无场景，点击 + 添加或让 AI 拆解</p>
                    ) : (
                      <div className="space-y-0">
                        {/* Insert zone before first scene */}
                        <div
                          className={`relative flex items-center py-2 mb-2 -mx-2 rounded-lg transition-all ${
                            draggedSceneId ? 'opacity-100' : 'opacity-0 hover:opacity-100'
                          } ${dropTargetIndex === 0 ? 'bg-indigo-500/10 ring-1 ring-indigo-500/30' : 'hover:bg-indigo-500/5'}`}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onDragEnter={(e) => {
                            e.preventDefault()
                            if (lastDropTargetRef.current !== 0) {
                              lastDropTargetRef.current = 0
                              setDropTargetIndex(0)
                            }
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault()
                            if (lastDropTargetRef.current === 0) {
                              lastDropTargetRef.current = null
                              setDropTargetIndex(null)
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDropScene(storyline.id, 0)
                          }}
                        >
                          <button
                            onClick={(e) => {
                              if (Date.now() < ignoreClickUntil) {
                                e.preventDefault()
                                return
                              }
                              openAddScene(storyline.id, 0)
                            }}
                            className={`absolute left-6 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border flex items-center justify-center transition-all shadow-sm ${
                              dropTargetIndex === 0
                                ? 'border-indigo-500 bg-indigo-500 text-white scale-125'
                                : draggedSceneId
                                ? 'border-indigo-500 bg-indigo-500 text-white scale-110'
                                : 'border-indigo-500/20 text-indigo-500 hover:bg-indigo-500 hover:text-white'
                            }`}
                            title="在最前面插入场景"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {allScenes.map((scene, index) => {
                          const isDragging = draggedSceneId === scene.id
                          return (
                            <div key={scene.id}>
                              <div
                                className={`relative flex items-start transition-opacity ${isDragging ? 'opacity-40' : 'opacity-100'}`}
                                draggable
                                onDragStart={() => setDraggedSceneId(scene.id)}
                                onDragEnd={() => {
                                  setDraggedSceneId(null)
                                  setDropTargetIndex(null)
                                }}
                              >
                                {/* Timeline node */}
                                <div
                                  className="absolute left-6 top-4 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-white shadow-md z-10"
                                  style={{ borderColor: storyline.color }}
                                />

                                {/* Scene card */}
                                <div
                                  className="ml-8 flex-1 cursor-pointer"
                                  onClick={() => openEditScene(storyline.id, scene)}
                                >
                                  <div
                                    className="glass rounded-xl p-4 hover:-translate-y-0.5 transition-all duration-200 border-l-4"
                                    style={{ borderLeftColor: storyline.color }}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-1.5">
                                        <span title="按住拖拽调整顺序">
                                          <GripVertical
                                            size={13}
                                            className="text-slate-300 hover:text-indigo-500 cursor-grab active:cursor-grabbing"
                                          />
                                        </span>
                                        <span className="text-xs font-bold" style={{ color: storyline.color }}>
                                          场景 {index + 1}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {scene.isReference && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                            原作引用
                                          </span>
                                        )}
                                        <span
                                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                                            scene.status === 'done'
                                              ? 'bg-emerald-500/10 text-emerald-600'
                                              : 'bg-amber-500/10 text-amber-600'
                                          }`}
                                        >
                                          {scene.status === 'done' ? '已完成' : '待完善'}
                                        </span>
                                      </div>
                                    </div>
                                    <h4 className="text-sm font-bold mb-1">{scene.name}</h4>
                                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">{scene.description}</p>
                                    {scene.characters.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {scene.characters.map((cid) => (
                                          <span
                                            key={cid}
                                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/8 text-indigo-600"
                                          >
                                            {getCharacterName(cid)}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Insert / drop zone after each scene */}
                              <div
                                className={`relative flex items-center py-2 my-1 -mx-2 rounded-lg transition-all ${
                                  draggedSceneId ? 'opacity-100' : 'opacity-0 hover:opacity-100'
                                } ${dropTargetIndex === index + 1 ? 'bg-indigo-500/10 ring-1 ring-indigo-500/30' : 'hover:bg-indigo-500/5'}`}
                                onDragOver={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }}
                                onDragEnter={(e) => {
                                  e.preventDefault()
                                  const targetIndex = index + 1
                                  if (lastDropTargetRef.current !== targetIndex) {
                                    lastDropTargetRef.current = targetIndex
                                    setDropTargetIndex(targetIndex)
                                  }
                                }}
                                onDragLeave={(e) => {
                                  e.preventDefault()
                                  const targetIndex = index + 1
                                  if (lastDropTargetRef.current === targetIndex) {
                                    lastDropTargetRef.current = null
                                    setDropTargetIndex(null)
                                  }
                                }}
                                onDrop={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleDropScene(storyline.id, index + 1)
                                }}
                              >
                                <button
                                  onClick={(e) => {
                                    if (Date.now() < ignoreClickUntil) {
                                      e.preventDefault()
                                      return
                                    }
                                    openAddScene(storyline.id, index + 1)
                                  }}
                                  className={`absolute left-6 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border flex items-center justify-center transition-all shadow-sm ${
                                    dropTargetIndex === index + 1
                                      ? 'border-indigo-500 bg-indigo-500 text-white scale-125'
                                      : draggedSceneId
                                      ? 'border-indigo-500 bg-indigo-500 text-white scale-110'
                                      : 'border-indigo-500/20 text-indigo-500 hover:bg-indigo-500 hover:text-white'
                                  }`}
                                  title="在此插入场景"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {!isExpanded && allScenes.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 pl-2">
                    {allScenes.slice(0, 6).map((scene, i) => (
                      <div
                        key={scene.id}
                        className="flex-1 h-8 rounded-lg bg-white/40 border border-indigo-500/10 flex items-center px-2 text-[10px] text-slate-500 truncate"
                        title={scene.name}
                      >
                        {i + 1}. {scene.name}
                      </div>
                    ))}
                    {allScenes.length > 6 && (
                      <div className="text-[10px] text-slate-400 px-2">+{allScenes.length - 6}</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Storyline Modal */}
      {isStorylineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/30 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-lg glow-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{editingStorylineId ? '编辑故事线' : '新建故事线'}</h2>
              <button onClick={() => setIsStorylineModalOpen(false)} className="p-2 rounded-lg hover:bg-white/50 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">名称 *</label>
                <input
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  value={storylineForm.name}
                  onChange={(e) => setStorylineForm({ ...storylineForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">类型</label>
                <select
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  value={storylineForm.type}
                  onChange={(e) => setStorylineForm({ ...storylineForm, type: e.target.value as StorylineType })}
                >
                  <option value="main">主线</option>
                  <option value="branch">支线</option>
                </select>
              </div>
              {storylineForm.type === 'branch' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">从哪个场景延伸</label>
                  <select
                    className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    value={storylineForm.parentSceneId}
                    onChange={(e) => setStorylineForm({ ...storylineForm, parentSceneId: e.target.value })}
                  >
                    <option value="">无</option>
                    {project.storylines.flatMap((s) =>
                      s.scenes.map((scene) => (
                        <option key={scene.id} value={scene.id}>
                          {s.name} / {scene.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">故事线内容</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all min-h-[100px] resize-y"
                  value={storylineForm.description}
                  onChange={(e) => setStorylineForm({ ...storylineForm, description: e.target.value })}
                  placeholder="简要描述这条故事线的主要内容，AI 将据此拆解场景"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsStorylineModalOpen(false)}
                className="px-5 py-2.5 rounded-lg bg-white/80 border border-indigo-500/10 text-sm font-semibold hover:shadow-lg transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSaveStoryline}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fanfic Import Modal */}
      {isImportModalOpen && <FanficImportModal mode="storylines" onClose={() => setIsImportModalOpen(false)} />}

      {/* Scene Modal */}
      {sceneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/30 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-lg glow-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{sceneModal.sceneId ? '编辑场景' : '新建场景'}</h2>
              <button onClick={() => setSceneModal(null)} className="p-2 rounded-lg hover:bg-white/50 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* AI 一句话生成场景 */}
            <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-violet-50/50 to-pink-50/50 border border-violet-200/30">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-violet-500" />
                <span className="text-xs font-bold text-violet-700">AI 智能创建场景</span>
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2.5 rounded-lg bg-white/80 border border-violet-200/30 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all"
                  placeholder="用一句话描述你想创建的场景..."
                  value={aiSceneInput}
                  onChange={(e) => setAiSceneInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && aiSceneInput.trim()) {
                      e.preventDefault()
                      handleGenerateSceneDetail()
                    }
                  }}
                />
                <button
                  onClick={handleGenerateSceneDetail}
                  disabled={isGeneratingSceneDetail || !aiSceneInput.trim()}
                  className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 hover:shadow-violet-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isGeneratingSceneDetail ? (
                    <><span className="animate-spin">○</span> 生成中</>
                  ) : (
                    <><Sparkles size={12} /> 生成</>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">场景名称 *</label>
                <input
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  value={sceneForm.name}
                  onChange={(e) => setSceneForm({ ...sceneForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">场景说明</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all min-h-[100px] resize-y"
                  value={sceneForm.description}
                  onChange={(e) => setSceneForm({ ...sceneForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-2">出场人物</label>
                <div className="flex flex-wrap gap-2">
                  {project.characters.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        const next = sceneForm.characters.includes(c.id)
                          ? sceneForm.characters.filter((id) => id !== c.id)
                          : [...sceneForm.characters, c.id]
                        setSceneForm({ ...sceneForm, characters: next })
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                        sceneForm.characters.includes(c.id)
                          ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md'
                          : 'bg-white/60 border border-indigo-500/10 hover:border-indigo-500/20'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">状态</label>
                <select
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  value={sceneForm.status}
                  onChange={(e) => setSceneForm({ ...sceneForm, status: e.target.value as Scene['status'] })}
                >
                  <option value="pending">待完善</option>
                  <option value="done">已完成</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-amber-50/50 border border-amber-200/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">原作引用</span>
                  <span className="text-[10px] text-amber-600/70">开启后正文不撰写该场景，仅作为前后衔接参考</span>
                </div>
                <button
                  onClick={() => setSceneForm({ ...sceneForm, isReference: !sceneForm.isReference })}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    sceneForm.isReference
                      ? 'bg-amber-500'
                      : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${
                      sceneForm.isReference ? 'left-6' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              {sceneModal.sceneId && (
                <button
                  onClick={() => {
                    deleteScene(sceneModal.storylineId, sceneModal.sceneId!)
                    setSceneModal(null)
                  }}
                  className="px-5 py-2.5 rounded-lg bg-red-50 text-red-500 text-sm font-semibold hover:bg-red-100 transition-all flex items-center gap-2"
                >
                  <Trash2 size={15} />
                  删除
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button
                  onClick={() => setSceneModal(null)}
                  className="px-5 py-2.5 rounded-lg bg-white/80 border border-indigo-500/10 text-sm font-semibold hover:shadow-lg transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveScene}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部操作按钮 */}
      <div className="flex justify-center gap-3 mt-10 pb-8">
        <button
          onClick={() => setIsImportModalOpen(true)}
          className="px-8 py-3 rounded-xl bg-white/80 border border-indigo-500/10 text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/10 transition-all flex items-center gap-2"
        >
          <Download size={16} />
          从同人文导入
        </button>
        <button
          onClick={openAddStoryline}
          className="px-8 py-3 rounded-xl bg-white/80 border border-indigo-500/10 text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/10 transition-all flex items-center gap-2"
        >
          <Plus size={16} />
          新增故事线
        </button>
        <button
          onClick={() => navigate('/create')}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all"
        >
          下一步：AI 创作
        </button>
      </div>
    </div>
  )
}
