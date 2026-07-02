import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { Settings, Users, GitBranch, Sparkles, ClipboardCheck, Plus, ChevronDown, FolderOpen, Trash2, Key } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/store/useProjectStore'

const navItems = [
  { path: '/ai-config', label: 'AI 配置', icon: Key },
  { path: '/settings', label: '基础设定', icon: Settings },
  { path: '/characters', label: '人物管理', icon: Users },
  { path: '/storylines', label: '故事线', icon: GitBranch },
  { path: '/create', label: 'AI 创作', icon: Sparkles },
  { path: '/review', label: 'AI 复盘', icon: ClipboardCheck },
]

export default function Sidebar() {
  const createProject = useProjectStore((state) => state.createProject)
  const deleteProject = useProjectStore((state) => state.deleteProject)
  const { projects, currentProjectId } = useProjectStore()
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject)
  const navigate = useNavigate()
  const location = useLocation()
  const [projectsOpen, setProjectsOpen] = useState(true)

  const handleNewProject = () => {
    createProject()
    navigate('/settings')
  }

  const handleSwitchProject = (id: string) => {
    setCurrentProject(id)
    if (location.pathname === '/') {
      navigate('/settings', { replace: true })
    }
  }

  return (
    <aside className="w-[280px] glass border-r border-indigo-500/10 flex flex-col p-7">
      <Link
        to="/"
        className="flex items-center gap-3 mb-10 hover:opacity-80 transition-opacity"
      >
        <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/30" />
        <span className="text-xl font-extrabold tracking-wide">同人创作空间</span>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        <div className="pt-1 pb-1">
          <button
            onClick={() => setProjectsOpen((v) => !v)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
              projectsOpen
                ? 'bg-indigo-500/10 text-indigo-600'
                : 'text-slate-600 hover:bg-indigo-500/5 hover:text-indigo-600'
            )}
          >
            <span className="flex items-center gap-3">
              <FolderOpen size={18} />
              项目列表
            </span>
            <ChevronDown size={14} className={cn('transition-transform duration-200', projectsOpen && 'rotate-180')} />
          </button>

          {projectsOpen && (
            <div className="mt-1 space-y-1 pl-4">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    'group flex items-center justify-between px-4 py-2.5 rounded-xl text-sm cursor-pointer transition-all',
                    p.id === currentProjectId
                      ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                      : 'text-slate-600 hover:bg-indigo-500/5 hover:text-indigo-600'
                  )}
                >
                  <button
                    onClick={() => handleSwitchProject(p.id)}
                    className="flex items-center gap-2.5 flex-1 text-left min-w-0"
                  >
                    <span className="truncate">{p.settings.name || p.name}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteProject(p.id)
                    }}
                    className="ml-1 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                    title="删除项目"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-px bg-indigo-500/10 my-2" />

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.12)]'
                  : 'text-slate-600 hover:bg-indigo-500/5 hover:text-indigo-600'
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={handleNewProject}
        className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-dashed border-indigo-400/30 text-indigo-600 text-sm font-semibold hover:bg-indigo-500/5 hover:border-indigo-400/50 transition-all"
      >
        <Plus size={16} />
        新建项目
      </button>
    </aside>
  )
}
