import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/useProjectStore'
import { generateReview, generateDimensionSuggestions } from '@/services/aiService'
import { Sparkles, RotateCcw, Target, ArrowRight } from 'lucide-react'
import type { ReviewScores, ReviewSuggestion, ReviewModule } from '@/types'

const allDimensions = [
  { key: 'logic', label: '逻辑性', category: '基础', description: '情节因果关系是否清晰' },
  { key: 'coherence', label: '连贯性', category: '基础', description: '整体叙事是否流畅连贯' },
  { key: 'rationality', label: '合理性', category: '基础', description: '人物决策和事件发展是否合理' },
  { key: 'consistency', label: '人物一致性', category: '人物', description: '言行风格前后是否一致' },
  { key: 'depth', label: '人物深度', category: '人物', description: '人物内心刻画是否丰富' },
  { key: 'fidelity', label: '原作还原度', category: '人物', description: '人物性格、世界观是否保持原作风格', fanficOnly: true },
  { key: 'resonance', label: '共鸣', category: '情感', description: '情感表达是否能引发读者共鸣' },
  { key: 'tension', label: '张力', category: '情感', description: '冲突和悬念是否足够吸引人' },
  { key: 'pacing', label: '节奏', category: '结构', description: '叙事节奏是否合理' },
  { key: 'fanfic_coherence', label: '同人衔接', category: '结构', description: '与原作情节的衔接是否自然', fanficOnly: true },
]

const MAX = 10
const SIZE = 280
const CENTER = SIZE / 2
const RADIUS = SIZE / 2 - 40

const moduleLabels: Record<ReviewModule, string> = {
  characters: '人物管理',
  storylines: '故事线',
  scenes: '故事线',
  creation: 'AI 创作',
  settings: '基础设定',
}

const modulePaths: Record<ReviewModule, string> = {
  characters: '/characters',
  storylines: '/storylines',
  scenes: '/storylines',
  creation: '/create',
  settings: '/settings',
}

export default function Review() {
  const navigate = useNavigate()
  const project = useProjectStore((state) => state.getCurrentProject())
  const backendAvailable = useProjectStore((state) => state.backendAvailable)
  const { setReview, applyReviewSuggestion } = useProjectStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [optimizingDimension, setOptimizingDimension] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!project) return null

  const review = project.review
  const isFanfic = project.settings.fanfic?.isEnabled && project.settings.fanfic?.workName
  // 根据是否同人文模式过滤维度
  const dimensions = isFanfic
    ? allDimensions
    : allDimensions.filter((d) => !d.fanficOnly)

  const handleGenerate = async () => {
    if (backendAvailable !== true) {
      setError('后端服务未连接，无法生成复盘')
      return
    }
    setError(null)
    setIsGenerating(true)
    try {
      const result = await generateReview(project)
      setReview(result)
    } catch {
      setError('生成复盘失败，请检查后端服务')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleOptimizeDimension = async (dimension: keyof ReviewScores) => {
    if (!review) return
    if (backendAvailable !== true) {
      setError('后端服务未连接，无法生成优化建议')
      return
    }
    setError(null)
    setOptimizingDimension(dimension)
    try {
      const suggestions = await generateDimensionSuggestions(project, dimension)
      setReview({
        ...review,
        dimensionSuggestions: {
          ...(review.dimensionSuggestions || ({} as Record<keyof ReviewScores, ReviewSuggestion[]>)),
          [dimension]: suggestions,
        } as Record<keyof ReviewScores, ReviewSuggestion[]>,
      })
    } catch {
      setError('生成优化建议失败，请检查后端服务')
    } finally {
      setOptimizingDimension(null)
    }
  }

  const handleApplySuggestion = (suggestion: ReviewSuggestion) => {
    applyReviewSuggestion(suggestion.id)
    navigate(modulePaths[suggestion.module])
  }

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / dimensions.length - Math.PI / 2
    const r = (value / MAX) * RADIUS
    return {
      x: CENTER + r * Math.cos(angle),
      y: CENTER + r * Math.sin(angle),
    }
  }

  const radarPoints = review
    ? dimensions.map((d, i) => getPoint(i, review.scores[d.key as keyof typeof review.scores])).map((p) => `${p.x},${p.y}`).join(' ')
    : ''

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">AI 复盘</h1>
          <p className="text-xs text-slate-500 mt-1">从 8 个维度评估小说质量，并给出优化建议</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-60"
          >
            <Sparkles size={16} />
            {isGenerating ? '分析中...' : review ? '重新复盘' : '开始复盘'}
          </button>
          {review && (
            <button
              onClick={() => setReview(undefined)}
              className="px-5 py-2.5 rounded-lg bg-white/80 border border-indigo-500/10 text-sm font-semibold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <RotateCcw size={16} />
              清除
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          {error}
        </div>
      )}

      {!review ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <Target size={56} className="mb-4 opacity-40" />
          <p className="text-sm mb-2">暂无复盘数据</p>
          <p className="text-xs">点击「开始复盘」让 AI 从多维度评估当前作品</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
          {/* Radar Chart */}
          <div className="glass rounded-2xl p-6 glow-border flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4 w-full">
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_12px_#6366F1]" />
              <h2 className="text-base font-bold">八维度雷达图</h2>
            </div>
            <div className="relative">
              <svg width={SIZE} height={SIZE} className="overflow-visible">
                {/* Grid */}
                {[2, 4, 6, 8, 10].map((level) => (
                  <polygon
                    key={level}
                    points={dimensions
                      .map((_, i) => {
                        const p = getPoint(i, level)
                        return `${p.x},${p.y}`
                      })
                      .join(' ')}
                    fill="none"
                    stroke="rgba(99,102,241,0.15)"
                    strokeWidth="1"
                  />
                ))}
                {/* Axes */}
                {dimensions.map((_, i) => {
                  const p = getPoint(i, MAX)
                  return (
                    <line
                      key={i}
                      x1={CENTER}
                      y1={CENTER}
                      x2={p.x}
                      y2={p.y}
                      stroke="rgba(99,102,241,0.15)"
                      strokeWidth="1"
                    />
                  )
                })}
                {/* Data area */}
                <polygon
                  points={radarPoints}
                  fill="rgba(99,102,241,0.2)"
                  stroke="#6366F1"
                  strokeWidth="2"
                />
                {/* Data points */}
                {dimensions.map((d, i) => {
                  const p = getPoint(i, review.scores[d.key as keyof typeof review.scores])
                  return (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      fill="#6366F1"
                      className="drop-shadow-md"
                    />
                  )
                })}
                {/* Labels */}
                {dimensions.map((d, i) => {
                  const p = getPoint(i, MAX + 1.5)
                  return (
                    <text
                      key={`label-${i}`}
                      x={p.x}
                      y={p.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[10px] fill-slate-600 font-semibold"
                    >
                      {d.label}
                    </text>
                  )
                })}
              </svg>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-3xl font-extrabold text-indigo-600">{review.overallScore}</div>
                <div className="text-[10px] text-slate-400">综合评分</div>
              </div>
            </div>
          </div>

          {/* Scores & Optimization */}
          <div className="space-y-4">
            <div className="glass rounded-2xl p-6 glow-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#22D3EE]" />
                <h2 className="text-base font-bold">维度得分与优化</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {dimensions.map((d) => {
                  const score = review.scores[d.key as keyof typeof review.scores]
                  const suggestions = review.dimensionSuggestions?.[d.key as keyof ReviewScores] || []
                  return (
                    <div key={d.key} className="bg-white/60 rounded-xl p-3 border border-indigo-500/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500">{d.label}</span>
                        <span className="text-sm font-bold text-indigo-600">{score}</span>
                      </div>
                      <div className="h-1.5 bg-indigo-500/10 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                          style={{ width: `${(score / MAX) * 100}%` }}
                        />
                      </div>
                      <button
                        onClick={() => handleOptimizeDimension(d.key as keyof ReviewScores)}
                        disabled={optimizingDimension === d.key}
                        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 text-[10px] font-semibold hover:bg-indigo-500/20 transition-all disabled:opacity-60"
                      >
                        <Sparkles size={11} />
                        {optimizingDimension === d.key ? '生成建议中...' : '优化此维度'}
                      </button>

                      {suggestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {suggestions.map((s) => (
                            <div
                              key={s.id}
                              className={`p-2.5 rounded-lg text-[11px] border ${
                                s.applied
                                  ? 'bg-emerald-500/5 border-emerald-500/20'
                                  : 'bg-white/60 border-indigo-500/10'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {moduleLabels[s.module]}
                                </span>
                                {s.applied ? (
                                  <span className="text-emerald-600">已应用</span>
                                ) : (
                                  <button
                                    onClick={() => handleApplySuggestion(s)}
                                    className="flex items-center gap-0.5 text-indigo-600 hover:text-indigo-700"
                                  >
                                    前往优化 <ArrowRight size={11} />
                                  </button>
                                )}
                              </div>
                              <p className="text-slate-700 leading-relaxed">{s.advice}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="glass rounded-2xl p-6 glow-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_12px_#EC4899]" />
                <h2 className="text-base font-bold">总体建议</h2>
              </div>
              <ul className="space-y-3">
                {review.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
