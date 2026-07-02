import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/useProjectStore'
import { generateOutline, generateNovelFromOutline } from '@/services/aiService'
import { Sparkles, FileText, RotateCcw, ClipboardCheck, Download, Check, GitBranch, BookOpen } from 'lucide-react'

export default function Create() {
  const navigate = useNavigate()
  const project = useProjectStore((state) => state.getCurrentProject())
  const backendAvailable = useProjectStore((state) => state.backendAvailable)
  const { updateCreation, appendCreationContent } = useProjectStore()
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false)
  const [isGeneratingContent, setIsGeneratingContent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditingOutline, setIsEditingOutline] = useState(false)
  const [outlineDraft, setOutlineDraft] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  if (!project) return null

  const { creation, storylines } = project

  const mainStorylines = useMemo(() => storylines.filter((s) => s.type === 'main'), [storylines])
  const branchStorylines = useMemo(() => storylines.filter((s) => s.type === 'branch'), [storylines])

  const selectedMain = creation.selectedMainStorylineId
    ? storylines.find((s) => s.id === creation.selectedMainStorylineId)
    : null
  const selectedBranches = storylines.filter((s) => creation.selectedBranchStorylineIds.includes(s.id))

  const allSelectedScenes = useMemo(() => {
    const scenes: { scene: typeof storylines[0]['scenes'][0]; storylineName: string }[] = []
    if (selectedMain) {
      selectedMain.scenes.forEach((scene) => {
        if (!scene.isReference) { // 过滤掉原作引用的场景
          scenes.push({ scene, storylineName: selectedMain.name })
        }
      })
    }
    selectedBranches.forEach((line) => {
      line.scenes.forEach((scene) => {
        if (!scene.isReference) { // 过滤掉原作引用的场景
          scenes.push({ scene, storylineName: line.name })
        }
      })
    })
    return scenes.sort((a, b) => a.scene.order - b.scene.order)
  }, [selectedMain, selectedBranches])

  const totalEstimatedWords = allSelectedScenes.length * 600

  const handleSelectMain = (id: string) => {
    updateCreation({ selectedMainStorylineId: id })
  }

  const handleToggleBranch = (id: string) => {
    const current = creation.selectedBranchStorylineIds
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    updateCreation({ selectedBranchStorylineIds: next })
  }

  const handleGenerateOutline = async () => {
    if (backendAvailable !== true) {
      setError('后端服务未连接，无法生成大纲')
      return
    }
    if (!creation.selectedMainStorylineId) {
      setError('请先选择主线故事线')
      return
    }
    setError(null)
    setIsGeneratingOutline(true)
    updateCreation({ outline: '', status: 'generating_outline', progress: 10 })
    let outlineText = ''
    try {
      await generateOutline(
        project,
        creation.selectedMainStorylineId,
        creation.selectedBranchStorylineIds,
        {
          onChunk: (chunk) => {
            outlineText += chunk
            updateCreation({ outline: outlineText })
          },
          onDone: () => {
            // 大纲生成完成，状态保持为idle让用户审阅和确认
            updateCreation({ status: 'idle', progress: 100 })
            setIsGeneratingOutline(false)
          },
        }
      )
    } catch {
      setError('生成大纲失败，请检查后端服务')
      setIsGeneratingOutline(false)
      updateCreation({ status: 'idle', progress: 0 })
    }
  }

  const handleEditOutline = () => {
    setOutlineDraft(creation.outline)
    setIsEditingOutline(true)
  }

  const handleSaveOutline = () => {
    updateCreation({ outline: outlineDraft })
    setIsEditingOutline(false)
  }

  const handleConfirmOutline = () => {
    updateCreation({ status: 'outline_confirmed' })
  }

  const handleGenerateContent = async () => {
    if (backendAvailable !== true) {
      setError('后端服务未连接，无法生成正文')
      return
    }
    if (!creation.selectedMainStorylineId) {
      setError('请先选择主线故事线')
      return
    }
    setError(null)
    setIsGeneratingContent(true)
    updateCreation({ content: '', status: 'generating_content', progress: 30, currentSceneIndex: 0 })
    try {
      await generateNovelFromOutline(
        project,
        creation.selectedMainStorylineId,
        creation.selectedBranchStorylineIds,
        creation.outline,
        {
          onChunk: (chunk) => {
            appendCreationContent(chunk)
            contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
          },
          onDone: () => {
            updateCreation({ status: 'done', progress: 100, currentSceneIndex: allSelectedScenes.length })
            setIsGeneratingContent(false)
          },
        }
      )
    } catch {
      setError('生成正文失败，请检查后端服务')
      setIsGeneratingContent(false)
      updateCreation({ status: 'outline_confirmed', progress: 0 })
    }
  }

  const handleExport = () => {
    const text = `# ${project.settings.name}\n\n## 故事大纲\n\n${creation.outline}\n\n## 正文\n\n${creation.content}`
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.settings.name}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    updateCreation({
      intro: '',
      outline: '',
      content: '',
      status: 'idle',
      progress: 0,
      currentSceneIndex: 0,
    })
    setIsEditingOutline(false)
    setOutlineDraft('')
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">AI 创作</h1>
          <p className="text-xs text-slate-500 mt-1">选择故事线 → 生成大纲 → 确认后生成正文</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={!creation.content}
            className="px-5 py-2.5 rounded-lg bg-white/80 border border-indigo-500/10 text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/10 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={16} />
            导出 Markdown
          </button>
          <button
            onClick={() => navigate('/review')}
            disabled={creation.status !== 'done'}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <ClipboardCheck size={16} />
            AI 复盘
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: 选择故事线 */}
      <section className="glass rounded-2xl p-6 glow-border mb-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-violet-500/30">1</div>
          <h2 className="text-base font-bold">选择故事线</h2>
          {creation.status !== 'idle' && creation.status !== 'generating_outline' && (
            <Check size={18} className="text-emerald-500 ml-2" />
          )}
        </div>

        <div className="mb-4">
          <label className="block text-xs text-slate-500 mb-2">选择主线（必选，只能选一条）</label>
          {mainStorylines.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center bg-white/40 rounded-xl border border-dashed border-indigo-500/20">
              暂无主线故事线，请先在故事线页面创建
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mainStorylines.map((line) => (
                <div
                  key={line.id}
                  onClick={() => handleSelectMain(line.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${
                    creation.selectedMainStorylineId === line.id
                      ? 'bg-gradient-to-r from-violet-500/10 to-pink-500/10 border-violet-500/40 shadow-lg shadow-violet-500/10'
                      : 'bg-white/60 border-indigo-500/10 hover:border-violet-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shadow-md"
                        style={{ backgroundColor: line.color }}
                      />
                      <p className="text-sm font-bold">{line.name}</p>
                    </div>
                    {creation.selectedMainStorylineId === line.id && (
                      <Check size={16} className="text-violet-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-2">{line.description}</p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <GitBranch size={12} />
                    <span>{line.scenes.length} 个场景</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-2">选择支线（可选，可多选）</label>
          {branchStorylines.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center bg-white/40 rounded-xl border border-dashed border-indigo-500/20">
              暂无支线故事线
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {branchStorylines.map((line) => (
                <div
                  key={line.id}
                  onClick={() => handleToggleBranch(line.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    creation.selectedBranchStorylineIds.includes(line.id)
                      ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/40 shadow-md shadow-cyan-500/10'
                      : 'bg-white/60 border-indigo-500/10 hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: line.color }}
                      />
                      <p className="text-sm font-semibold">{line.name}</p>
                    </div>
                    {creation.selectedBranchStorylineIds.includes(line.id) && (
                      <Check size={14} className="text-cyan-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{line.description}</p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                    <span>{line.scenes.length} 个场景</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {allSelectedScenes.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-violet-500/5 to-pink-500/5 border border-violet-500/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                已选择 <span className="font-bold text-violet-600">{allSelectedScenes.length}</span> 个场景
              </span>
              <span className="text-slate-500">
                预计约 <span className="font-bold text-pink-600">{totalEstimatedWords}</span> 字
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Step 2: 故事大纲 */}
      <section className="glass rounded-2xl p-6 glow-border mb-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-lg ${
              creation.status === 'idle' || creation.status === 'generating_outline'
                ? 'bg-slate-400 shadow-slate-400/30'
                : 'bg-violet-500 shadow-violet-500/30'
            }`}>2</div>
            <h2 className="text-base font-bold">故事大纲</h2>
            {creation.status !== 'idle' && creation.status !== 'generating_outline' && (
              <Check size={18} className="text-emerald-500 ml-2" />
            )}
          </div>
          <div className="flex gap-2">
            {creation.outline && !isEditingOutline && creation.status !== 'generating_content' && creation.status !== 'done' && (
              <>
                <button
                  onClick={handleEditOutline}
                  className="px-3 py-1.5 rounded-lg bg-white/60 border border-indigo-500/10 text-xs font-semibold hover:bg-white/80 transition-all flex items-center gap-1.5"
                >
                  <BookOpen size={13} />
                  编辑大纲
                </button>
              </>
            )}
            {isEditingOutline && (
              <button
                onClick={handleSaveOutline}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 hover:shadow-violet-500/30 transition-all flex items-center gap-1.5"
              >
                <Check size={13} />
                保存
              </button>
            )}
          </div>
        </div>

        {!creation.outline && !isGeneratingOutline && (
          <div className="text-center py-8">
            <button
              onClick={handleGenerateOutline}
              disabled={!creation.selectedMainStorylineId || isGeneratingOutline || isGeneratingContent}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-2 mx-auto"
            >
              <Sparkles size={16} />
              生成故事大纲
            </button>
            {!creation.selectedMainStorylineId && (
              <p className="text-xs text-slate-400 mt-3">请先选择主线故事线</p>
            )}
          </div>
        )}

        {isGeneratingOutline && (
          <div className="bg-white/60 rounded-xl p-5 border border-indigo-500/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shadow-[0_0_8px_#8B5CF6]" />
              <p className="text-sm font-semibold text-violet-600">正在生成故事大纲...</p>
            </div>
            <div className="whitespace-pre-line text-sm text-slate-600 min-h-[120px]">
              {creation.outline}
              <span className="inline-block w-0.5 h-4 bg-violet-500 ml-0.5 animate-pulse" />
            </div>
          </div>
        )}

        {creation.outline && !isGeneratingOutline && (
          <div className="bg-white/60 rounded-xl p-5 border border-indigo-500/10">
            {isEditingOutline ? (
              <textarea
                className="w-full px-4 py-3 rounded-lg bg-white border border-indigo-500/10 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all min-h-[300px] resize-y font-mono leading-relaxed"
                value={outlineDraft}
                onChange={(e) => setOutlineDraft(e.target.value)}
              />
            ) : (
              <div className="whitespace-pre-line text-sm text-slate-700 leading-relaxed">
                {creation.outline}
              </div>
            )}
          </div>
        )}

        {creation.outline && !isGeneratingOutline && !isEditingOutline && creation.status !== 'generating_content' && creation.status !== 'done' && (
          <div className="flex justify-end mt-4 gap-3">
            <button
              onClick={handleGenerateOutline}
              disabled={isGeneratingOutline || isGeneratingContent}
              className="px-4 py-2 rounded-lg bg-white/60 border border-indigo-500/10 text-sm font-semibold hover:bg-white/80 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              <RotateCcw size={14} />
              重新生成
            </button>
            <button
              onClick={handleConfirmOutline}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Check size={16} />
              确认大纲，开始创作
            </button>
          </div>
        )}
      </section>

      {/* Step 3: 正文生成 */}
      {(creation.status === 'outline_confirmed' || creation.status === 'generating_content' || creation.status === 'done') && (
        <section className="glass rounded-2xl p-6 glow-border mb-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-lg ${
                creation.status === 'outline_confirmed'
                  ? 'bg-slate-400 shadow-slate-400/30'
                  : 'bg-violet-500 shadow-violet-500/30'
              }`}>3</div>
              <h2 className="text-base font-bold">正文生成</h2>
              {creation.status === 'done' && (
                <Check size={18} className="text-emerald-500 ml-2" />
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm">
                {creation.status === 'generating_content'
                  ? '正在生成正文...'
                  : creation.status === 'done'
                  ? '创作完成'
                  : '大纲已确认，点击下方按钮开始生成正文'}
              </div>
              <div className="text-sm font-bold" style={{ color: creation.status === 'done' ? '#10B981' : creation.status === 'generating_content' ? '#8B5CF6' : '#94A3B8' }}>
                {creation.status === 'outline_confirmed' ? '等待开始' : `${creation.progress}%`}
              </div>
            </div>
            <div className="h-2 bg-indigo-500/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-500"
                style={{ width: `${creation.status === 'outline_confirmed' ? 0 : creation.progress}%` }}
              />
            </div>

            {allSelectedScenes.length > 0 && (
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5 mt-4">
                {allSelectedScenes.map((item, i) => (
                  <div
                    key={item.scene.id}
                    className={`px-1.5 py-1.5 rounded-lg text-[9px] text-center truncate border ${
                      i < creation.currentSceneIndex
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                        : i === creation.currentSceneIndex && creation.status === 'generating_content'
                        ? 'bg-violet-500/10 border-violet-500/30 text-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.15)]'
                        : 'bg-white/40 border-indigo-500/10 text-slate-500'
                    }`}
                    title={`${item.storylineName} - ${item.scene.name}`}
                  >
                    {item.scene.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {creation.status === 'outline_confirmed' && (
            <div className="text-center py-4">
              <button
                onClick={handleGenerateContent}
                disabled={isGeneratingContent}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                <FileText size={16} />
                开始生成正文
              </button>
            </div>
          )}

          {creation.content && (
            <div className="bg-white rounded-xl p-8 shadow-lg font-serif leading-loose text-slate-700">
              <h1 className="text-2xl font-bold text-center mb-6 text-slate-900">{project.settings.name}</h1>
              <div className="whitespace-pre-line text-[15px]">{creation.content}</div>
              {isGeneratingContent && (
                <span className="inline-block w-0.5 h-5 bg-violet-500 ml-1 animate-pulse" />
              )}
              <div ref={contentRef} />
            </div>
          )}

          {creation.status === 'done' && (
            <div className="flex justify-end mt-4 gap-3">
              <button
                onClick={handleGenerateContent}
                disabled={isGeneratingContent}
                className="px-4 py-2 rounded-lg bg-white/60 border border-indigo-500/10 text-sm font-semibold hover:bg-white/80 transition-all flex items-center gap-2 disabled:opacity-60"
              >
                <RotateCcw size={14} />
                重新生成
              </button>
            </div>
          )}
        </section>
      )}

      {/* Reset button */}
      {(creation.outline || creation.content) && (
        <div className="flex justify-end">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg bg-white/60 border border-indigo-500/10 text-sm text-slate-500 hover:bg-white/80 hover:text-slate-700 transition-all flex items-center gap-2"
          >
            <RotateCcw size={14} />
            重置全部
          </button>
        </div>
      )}
    </div>
  )
}
