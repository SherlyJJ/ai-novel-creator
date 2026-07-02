import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/useProjectStore'
import { generateCharacterBiography } from '@/services/aiService'
import FanficImportModal from '@/components/fanfic/FanficImportModal'
import type { Character, CharacterRole } from '@/types'
import { Plus, X, Sparkles, User, Users, Trash2, Edit3, Download } from 'lucide-react'

const emptyCharacter: Omit<Character, 'id' | 'createdAt' | 'isBiographyGenerated'> = {
  name: '',
  role: 'protagonist',
  alias: '',
  appearance: '',
  personality: '',
  wants: '',
  fears: '',
  background: '',
  biography: '',
}

export default function Characters() {
  const navigate = useNavigate()
  const project = useProjectStore((state) => state.getCurrentProject())
  const { addCharacter, updateCharacter, deleteCharacter, setCharacterBiography } = useProjectStore()
  const [filter, setFilter] = useState<CharacterRole | 'all'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyCharacter)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  if (!project) return null

  const filtered = project.characters.filter((c) => (filter === 'all' ? true : c.role === filter))

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyCharacter)
    setIsModalOpen(true)
  }

  const openEdit = (c: Character) => {
    setEditingId(c.id)
    setForm({
      name: c.name,
      role: c.role,
      alias: c.alias || '',
      appearance: c.appearance || '',
      personality: c.personality || '',
      wants: c.wants,
      fears: c.fears,
      background: c.background || '',
      biography: c.biography || '',
    })
    setIsModalOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    if (editingId) {
      updateCharacter(editingId, form)
    } else {
      addCharacter(form)
    }
    setIsModalOpen(false)
  }

  const handleGenerateBiography = async (c: Character) => {
    if (useProjectStore.getState().backendAvailable !== true) {
      alert('后端服务未连接，无法生成人物小传')
      return
    }
    setGeneratingId(c.id)
    try {
      const bio = await generateCharacterBiography(c, project.settings)
      setCharacterBiography(c.id, bio)
    } catch {
      alert('生成人物小传失败，请检查后端服务')
    } finally {
      setGeneratingId(null)
    }
  }

  const detailCharacter = project.characters.find((c) => c.id === detailId)

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">人物管理</h1>
          <p className="text-xs text-slate-500 mt-1">点击卡片查看档案，AI 将根据人物卡生成立体小传</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-5 py-2.5 rounded-lg bg-white/80 border border-indigo-500/10 text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/10 transition-all flex items-center gap-2"
          >
            <Download size={16} />
            从同人文导入
          </button>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 rounded-lg bg-white/80 border border-indigo-500/10 text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/10 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            添加人物
          </button>
          <button
            onClick={() => navigate('/storylines')}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all"
          >
            下一步：故事线
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2 mb-5">
        {[
          { key: 'all', label: '全部' },
          { key: 'protagonist', label: '核心主角' },
          { key: 'supporting', label: '关键配角' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key as CharacterRole | 'all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filter === t.key
                ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white/60 border border-indigo-500/10 hover:border-indigo-500/20'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <Users size={48} className="mb-4 opacity-40" />
          <p className="text-sm">暂无人物，点击「添加人物」开始创建角色卡</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => setDetailId(c.id)}
              className="group glass rounded-2xl p-5 glow-border hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 w-full h-1 transition-transform duration-700 -translate-x-full group-hover:translate-x-full"
                style={{
                  background: `linear-gradient(90deg, transparent, ${c.role === 'protagonist' ? '#6366F1' : '#EC4899'}, transparent)`,
                }}
              />
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${
                    c.role === 'protagonist'
                      ? 'bg-gradient-to-br from-indigo-500 to-cyan-400'
                      : 'bg-gradient-to-br from-pink-500 to-violet-500'
                  }`}
                >
                  <User size={22} />
                </div>
                <span
                  className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                    c.role === 'protagonist'
                      ? 'bg-indigo-500/10 text-indigo-600'
                      : 'bg-pink-500/10 text-pink-600'
                  }`}
                >
                  {c.role === 'protagonist' ? '核心主角' : '关键配角'}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-1">{c.name}</h3>
              {c.alias && <p className="text-xs text-slate-500 mb-3">{c.alias}</p>}
              <div className="space-y-2 mb-4">
                <div className="text-xs">
                  <span className="text-slate-400">渴望：</span>
                  <span className="text-slate-700 line-clamp-1">{c.wants || '未填写'}</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400">恐惧：</span>
                  <span className="text-slate-700 line-clamp-1">{c.fears || '未填写'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.isBiographyGenerated ? (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">
                    小传已生成
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-500 font-semibold">
                    小传待生成
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/30 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto glow-border">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{editingId ? '编辑人物卡' : '新建人物卡'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg hover:bg-white/50 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">姓名 *</label>
                <input
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">身份</label>
                <select
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as CharacterRole })}
                >
                  <option value="protagonist">核心主角</option>
                  <option value="supporting">关键配角</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">别名 / 称号</label>
                <input
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  value={form.alias}
                  onChange={(e) => setForm({ ...form, alias: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">外貌特征</label>
                <input
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  value={form.appearance}
                  onChange={(e) => setForm({ ...form, appearance: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1.5">性格</label>
                <input
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  value={form.personality}
                  onChange={(e) => setForm({ ...form, personality: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">最渴望 *</label>
                <input
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  value={form.wants}
                  onChange={(e) => setForm({ ...form, wants: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">最恐惧 *</label>
                <input
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  value={form.fears}
                  onChange={(e) => setForm({ ...form, fears: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1.5">背景故事</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all min-h-[80px] resize-y"
                  value={form.background}
                  onChange={(e) => setForm({ ...form, background: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-lg bg-white/80 border border-indigo-500/10 text-sm font-semibold hover:shadow-lg transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fanfic Import Modal */}
      {isImportModalOpen && <FanficImportModal mode="characters" onClose={() => setIsImportModalOpen(false)} />}

      {/* Detail Modal */}
      {detailCharacter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/30 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto glow-border">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${
                    detailCharacter.role === 'protagonist'
                      ? 'bg-gradient-to-br from-indigo-500 to-cyan-400'
                      : 'bg-gradient-to-br from-pink-500 to-violet-500'
                  }`}
                >
                  <User size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{detailCharacter.name}</h2>
                  {detailCharacter.alias && <p className="text-xs text-slate-500">{detailCharacter.alias}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setDetailId(null)
                    openEdit(detailCharacter)
                  }}
                  className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                  title="编辑"
                >
                  <Edit3 size={18} />
                </button>
                <button
                  onClick={() => {
                    deleteCharacter(detailCharacter.id)
                    setDetailId(null)
                  }}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  title="删除"
                >
                  <Trash2 size={18} />
                </button>
                <button onClick={() => setDetailId(null)} className="p-2 rounded-lg hover:bg-white/50 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">最渴望</p>
                <p className="text-sm font-semibold text-indigo-600">{detailCharacter.wants}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">最恐惧</p>
                <p className="text-sm font-semibold text-pink-600">{detailCharacter.fears}</p>
              </div>
              {detailCharacter.appearance && (
                <div className="glass rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">外貌</p>
                  <p className="text-sm text-slate-700">{detailCharacter.appearance}</p>
                </div>
              )}
              {detailCharacter.personality && (
                <div className="glass rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">性格</p>
                  <p className="text-sm text-slate-700">{detailCharacter.personality}</p>
                </div>
              )}
            </div>

            {detailCharacter.background && (
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-2">背景故事</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{detailCharacter.background}</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">AI 人物小传</h3>
                {detailCharacter.biography ? (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    已导入小传
                  </span>
                ) : (
                  <button
                    onClick={() => handleGenerateBiography(detailCharacter)}
                    disabled={generatingId === detailCharacter.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-60"
                  >
                    <Sparkles size={13} />
                    {generatingId === detailCharacter.id ? '生成中...' : '生成小传'}
                  </button>
                )}
              </div>
              <div className="bg-white/60 rounded-xl p-4 border border-indigo-500/10">
                {detailCharacter.biography ? (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{detailCharacter.biography}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">点击上方按钮，AI 将根据人物卡生成立体小传。</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
