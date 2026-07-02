import { Link, useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/useProjectStore'
import { Sparkles, Users, GitBranch, ClipboardCheck, Settings, Plus } from 'lucide-react'

const quickActions = [
  { label: '基础设定', path: '/settings', icon: Settings, color: 'from-indigo-500 to-indigo-400' },
  { label: '人物管理', path: '/characters', icon: Users, color: 'from-cyan-500 to-cyan-400' },
  { label: '故事线', path: '/storylines', icon: GitBranch, color: 'from-pink-500 to-pink-400' },
  { label: 'AI 创作', path: '/create', icon: Sparkles, color: 'from-violet-500 to-violet-400' },
  { label: 'AI 复盘', path: '/review', icon: ClipboardCheck, color: 'from-emerald-500 to-emerald-400' },
]

export default function Home() {
  const project = useProjectStore((state) => state.getCurrentProject())
  const { projects, createProject } = useProjectStore()
  const navigate = useNavigate()

  const handleNewProject = () => {
    createProject()
    navigate('/settings')
  }

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-slate-400">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-5">
          <Plus size={28} />
        </div>
        <p className="text-base font-semibold text-slate-600 mb-1">暂无项目</p>
        <p className="text-xs mb-5">创建一个新项目开始你的创作</p>
        <button
          onClick={handleNewProject}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          <Plus size={16} />
          新建项目
        </button>
      </div>
    )
  }

  const totalScenes = project.storylines.reduce((sum, s) => sum + s.scenes.length, 0)
  const mainScenes = project.storylines.find((s) => s.type === 'main')?.scenes.length || 0
  const branchScenes = totalScenes - mainScenes
  const protagonistCount = project.characters.filter((c) => c.role === 'protagonist').length
  const supportingCount = project.characters.filter((c) => c.role === 'supporting').length
  const estimatedWords = totalScenes * 800

  const completionSteps = [
    project.settings.name && project.settings.theme,
    project.characters.length > 0,
    project.storylines.length > 0 && totalScenes > 0,
    project.creation.status === 'done',
  ]
  const completion = Math.round((completionSteps.filter(Boolean).length / completionSteps.length) * 100)

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">{project.name}</h1>
          <p className="text-xs text-slate-500 mt-1">欢迎回来，继续你的创作旅程 · 已自动保存</p>
        </div>
        <Link
          to="/create"
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all"
        >
          开始创作
        </Link>
      </header>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 glass rounded-2xl p-6 glow-border hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_12px_#6366F1]" />
            <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/30 to-transparent" />
          </div>
          <p className="text-xs text-slate-500 mb-2">当前项目</p>
          <h2 className="text-4xl font-extrabold mb-3">{project.settings.name}</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">{project.settings.theme}</p>
          <div className="flex flex-wrap gap-2">
            {[...project.settings.type, ...project.settings.tags].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-indigo-500/8 border border-indigo-500/10 text-xs text-slate-700">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="col-span-4 glass rounded-2xl p-6 glow-border hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#22D3EE]" />
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-400/30 to-transparent" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">完成度</p>
              <p className="text-4xl font-extrabold">{completion}%</p>
            </div>
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="4" />
              <circle
                cx="30"
                cy="30"
                r="24"
                fill="none"
                stroke="url(#progressGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="150.8"
                strokeDashoffset={150.8 * (1 - completion / 100)}
              />
              <defs>
                <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            {completion === 100 ? '全部完成，可以导出或复盘' : '继续完善设定、人物与故事线'}
          </p>
        </div>

        {[
          { label: '人物卡', value: `${project.characters.length}`, desc: `主角 ${protagonistCount} · 配角 ${supportingCount}`, color: 'bg-pink-500' },
          { label: '场景卡', value: `${totalScenes}`, desc: `主线 ${mainScenes} · 支线 ${branchScenes}`, color: 'bg-indigo-500' },
          { label: '预估字数', value: estimatedWords >= 1000 ? `${(estimatedWords / 1000).toFixed(1)}k` : `${estimatedWords}`, desc: `约 ${estimatedWords} 字`, color: 'bg-cyan-400' },
        ].map((item) => (
          <div key={item.label} className="col-span-4 glass rounded-2xl p-6 glow-border hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${item.color} shadow-[0_0_12px_currentColor]`} />
              <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/30 to-transparent" />
            </div>
            <p className="text-xs text-slate-500 mb-1">{item.label}</p>
            <p className="text-3xl font-extrabold mb-1">{item.value}</p>
            <p className="text-xs text-slate-500">{item.desc}</p>
          </div>
        ))}

        <div className="col-span-6 glass rounded-2xl p-6 glow-border hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_12px_#6366F1]" />
            <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/30 to-transparent" />
          </div>
          <p className="text-xs text-slate-500 mb-2">最近动态</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {project.characters.length > 0
              ? `${project.characters.filter((c) => c.isBiographyGenerated).length} 个人物小传已生成`
              : '尚未创建人物'}
            {project.storylines.length > 0 && ` · ${project.storylines.length} 条故事线已搭建`}
            {project.review && ` · AI 复盘综合评分 ${project.review.overallScore}`}
          </p>
        </div>

        <div className="col-span-6 glass rounded-2xl p-6 glow-border hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_12px_#EC4899]" />
            <div className="h-px flex-1 bg-gradient-to-r from-pink-500/30 to-transparent" />
          </div>
          <p className="text-xs text-slate-500 mb-2">AI 复盘建议</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {project.review?.suggestions[0] || '完成创作后可查看 AI 复盘建议'}
          </p>
        </div>

        <div className="col-span-12 glass rounded-2xl p-6 glow-border">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#22D3EE]" />
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-400/30 to-transparent" />
          </div>
          <p className="text-xs text-slate-500 mb-3">快速入口</p>
          <div className="grid grid-cols-5 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.path}
                to={action.path}
                className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl bg-white/60 border border-indigo-500/8 hover:bg-gradient-to-br hover:from-indigo-500/10 hover:to-cyan-500/5 hover:border-indigo-500/20 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200"
              >
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-lg`}>
                  <action.icon size={18} />
                </div>
                <span className="text-sm font-semibold">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-auto h-9 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span>{projects.length} PROJECTS</span>
        <span>{projects.reduce((sum, p) => sum + (p.creation.content.length || 0), 0).toLocaleString()} WORDS TOTAL</span>
      </footer>
    </div>
  )
}
