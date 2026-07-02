import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/useProjectStore'
import { NOVEL_TYPES, NOVEL_TAGS, PLATFORM_OPTIONS, READER_TYPE_OPTIONS, STRUCTURE_OPTIONS, PERSPECTIVE_OPTIONS } from '@/types'
import { BookOpen, Users, GitBranch, Check, Loader2, Search, Sparkles } from 'lucide-react'
import {
  searchAllTypes,
  parseFanficFromSearch,
  convertParsedCharactersToStore,
  convertParsedStorylinesToStore,
  type ParsedFanficData,
  type FanficSourceType,
  type SearchResultsByType,
} from '@/services/searchService'

export default function Settings() {
  const navigate = useNavigate()
  const project = useProjectStore((state) => state.getCurrentProject())
  const updateSettings = useProjectStore((state) => state.updateSettings)
  const importCharacters = useProjectStore((state) => state.importCharacters)
  const importStorylines = useProjectStore((state) => state.importStorylines)
  const clearCharacters = useProjectStore((state) => state.clearCharacters)
  const clearStorylines = useProjectStore((state) => state.clearStorylines)
  const resetFromFanfic = useProjectStore((state) => state.resetFromFanfic)

  const [saved, setSaved] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResultsByType | null>(null)
  const [parsedData, setParsedData] = useState<ParsedFanficData | null>(null)
  const [sourceType, setSourceType] = useState<FanficSourceType>('novel')
  const [imported, setImported] = useState<{ characters: boolean; storylines: boolean }>({
    characters: false,
    storylines: false,
  })

  // 从store恢复保存的搜索结果和解析数据
  useEffect(() => {
    const savedSearchResults = project?.settings?.fanfic?.searchResults
    if (savedSearchResults) {
      setSearchResults(savedSearchResults)
      // 恢复sourceType
      if (savedSearchResults.availability) {
        const availableTypes: FanficSourceType[] = []
        if (savedSearchResults.availability.novel) availableTypes.push('novel')
        if (savedSearchResults.availability.tv_movie) availableTypes.push('tv_movie')
        if (savedSearchResults.availability.anime) availableTypes.push('anime')
        if (availableTypes.length > 0) {
          setSourceType(availableTypes[0])
        }
      }
    }
    const savedParsedData = project?.settings?.fanfic?.parsedData
    if (savedParsedData) {
      // 从store恢复parsedData时，需要构造完整的ParsedFanficData结构
      setParsedData({
        workName: project.settings.fanfic.workName,
        authorName: project.settings.fanfic.authorName,
        background: savedParsedData.background,
        theme: savedParsedData.theme,
        forbidden: savedParsedData.forbidden,
        type: savedParsedData.type,
        tags: savedParsedData.tags,
        direction: savedParsedData.direction,
        characters: [],
        storylines: [],
      })
    }
  }, [project?.id])

  if (!project) return null
  const { settings } = project

  const handleChange = (field: string, value: unknown) => {
    updateSettings({ [field]: value } as Partial<typeof settings>)
    setSaved(false)
  }

  const handleDirectionChange = (field: keyof typeof settings.direction, value: string) => {
    updateSettings({
      direction: { ...settings.direction, [field]: value },
    })
    setSaved(false)
  }

  const toggleTag = (tag: string, list: 'type' | 'tags') => {
    const current = settings[list]
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    updateSettings({ [list]: next } as Partial<typeof settings>)
    setSaved(false)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleSearch = async () => {
    if (!settings.fanfic.workName.trim()) return
    setIsSearching(true)
    setSearchResults(null)
    setParsedData(null)
    setImported({ characters: false, storylines: false })
    try {
      const results = await searchAllTypes(settings.fanfic.workName, settings.fanfic.authorName)
      setSearchResults(results)
      // 保存搜索结果到store
      updateSettings({
        fanfic: {
          ...settings.fanfic,
          searchResults: results,
          parsedData: undefined, // 清除旧的解析数据
        },
      })
      if (results.workExists) {
        const availableTypes: FanficSourceType[] = []
        if (results.availability.novel) availableTypes.push('novel')
        if (results.availability.tv_movie) availableTypes.push('tv_movie')
        if (results.availability.anime) availableTypes.push('anime')
        if (availableTypes.length > 0) {
          setSourceType(availableTypes[0])
        }
      }
    } finally {
      setIsSearching(false)
    }
  }

  const handleParse = async () => {
    if (!settings.fanfic.workName.trim()) return
    setIsParsing(true)
    setParsedData(null)
    setImported({ characters: false, storylines: false })
    try {
      const data = await parseFanficFromSearch(settings.fanfic.workName, settings.fanfic.authorName, sourceType)
      setParsedData(data)
      resetFromFanfic({
        workName: data.workName,
        authorName: data.authorName,
        background: data.background,
        theme: data.theme,
        forbidden: data.forbidden,
        type: data.type,
        tags: data.tags,
        direction: data.direction,
      })
      // 保存解析数据到store
      const parsedDataForStore = {
        background: data.background,
        theme: data.theme,
        forbidden: data.forbidden,
        type: data.type,
        tags: data.tags,
        direction: data.direction,
      }
      updateSettings({
        fanfic: {
          ...settings.fanfic,
          workName: data.workName,
          authorName: data.authorName,
          characters: data.characters.map((c) => `${c.name}：${c.identity}`).join('\n'),
          plot: data.storylines.map((s) => `【${s.title}】\n${s.scenes.map((scene) => scene.name).join('\n')}`).join('\n\n'),
          isEnabled: true,
          parsedData: parsedDataForStore,
        },
      })
    } finally {
      setIsParsing(false)
    }
  }

  const handleImportCharacters = () => {
    if (!parsedData) return
    clearCharacters()
    importCharacters(convertParsedCharactersToStore(parsedData))
    setImported((prev) => ({ ...prev, characters: true }))
  }

  const handleImportStorylines = () => {
    if (!parsedData) return
    clearStorylines()
    importStorylines(convertParsedStorylinesToStore(parsedData))
    setImported((prev) => ({ ...prev, storylines: true }))
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-8">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">基础设定</h1>
      </header>

      <div className="space-y-5 max-w-5xl">
        <section className="glass rounded-2xl p-6 glow-border">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_12px_#8B5CF6]" />
            <h2 className="text-base font-bold">原作搜索</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">输入原作信息，系统自动联网搜索并解析人物、故事线与基础设定。</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">作品名称</label>
              <input
                className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all"
                value={settings.fanfic.workName}
                onChange={(e) => {
                  updateSettings({ fanfic: { ...settings.fanfic, workName: e.target.value } })
                  setSearchResults(null)
                  setParsedData(null)
                }}
                placeholder="例如：默读"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">作者 / 编剧 / 导演 / 制作人</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all"
                  value={settings.fanfic.authorName}
                  onChange={(e) => {
                    updateSettings({ fanfic: { ...settings.fanfic, authorName: e.target.value } })
                  }}
                  placeholder="例如：Priest / 周杰伦"
                />
                <button
                  onClick={handleSearch}
                  disabled={!settings.fanfic.workName.trim() || isSearching}
                  className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-semibold shadow-md shadow-violet-500/20 hover:shadow-violet-500/30 transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isSearching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                  {isSearching ? '查询中...' : '查询'}
                </button>
              </div>
            </div>
          </div>

          {isSearching && (
            <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20">
              <div className="flex items-center gap-3">
                <Loader2 size={20} className="animate-spin text-violet-500" />
                <div className="text-sm">
                  <p className="font-semibold text-violet-600">正在验证作品并搜索各类型资源...</p>
                  <p className="text-slate-500 text-xs mt-0.5">将自动抓取百科、豆瓣、知乎等权威来源进行交叉验证</p>
                </div>
              </div>
            </div>
          )}

          {searchResults && !searchResults.workExists && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <p className="font-semibold">未找到《{settings.fanfic.workName}》的相关作品信息，请检查作品名称和作者是否正确</p>
            </div>
          )}

          {searchResults && searchResults.workExists && (
            <>
              {searchResults.adaptationNames && searchResults.adaptationNames.length > 0 && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-700">
                    已检测到改名改编作品：
                    {searchResults.adaptationNames.map((name, i) => (
                      <span key={i} className="font-semibold mx-1">{name}</span>
                    ))}
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs text-slate-500 mb-2">选择解析类型</label>
                <div className="flex gap-2">
                  {[
                    { value: 'novel', label: '原著小说', desc: '基于小说原文解析', count: searchResults.novel.length },
                    { value: 'tv_movie', label: '电视剧/电影', desc: '基于剧集剧情解析', count: searchResults.tv_movie.length },
                    { value: 'anime', label: '动漫', desc: '基于动画剧情解析', count: searchResults.anime.length },
                  ].map((option) => {
                    const available = searchResults.availability[option.value as FanficSourceType]
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          if (available) {
                            setSourceType(option.value as FanficSourceType)
                          }
                        }}
                        disabled={!available}
                        className={`flex-1 py-3 px-4 rounded-xl text-left transition-all ${
                          !available
                            ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                            : sourceType === option.value
                              ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-md shadow-violet-500/20'
                              : 'bg-white/60 border border-indigo-500/10 hover:border-violet-500/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold">{option.label}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            !available ? 'bg-slate-200 text-slate-400' : sourceType === option.value ? 'bg-white/20 text-white/80' : 'bg-violet-500/10 text-violet-500'
                          }`}>
                            {option.count} 条结果
                          </span>
                        </div>
                        <p className={`text-[10px] mt-0.5 ${
                          !available ? 'text-slate-400' : sourceType === option.value ? 'text-white/80' : 'text-slate-500'
                        }`}>
                          {available ? option.desc : '未搜索到相关内容'}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-slate-500 mb-2">
                  {sourceType === 'novel' ? '原著小说' : sourceType === 'tv_movie' ? '电视剧/电影' : '动漫'}搜索结果
                </label>
                <div className="max-h-40 overflow-y-auto bg-white/40 rounded-xl p-3 border border-indigo-500/10">
                  {searchResults[sourceType].length > 0 ? (
                    <div className="space-y-2">
                      {searchResults[sourceType].slice(0, 15).map((result, i) => (
                        <a
                          key={i}
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-3 py-2 rounded-lg bg-white/60 hover:bg-white/80 transition-all text-xs text-slate-600 hover:text-violet-600"
                        >
                          <p className="font-semibold line-clamp-1">{result.title}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{result.snippet}</p>
                        </a>
                      ))}
                      {searchResults[sourceType].length > 15 && (
                        <p className="text-center text-xs text-slate-500 py-2">
                          仅显示前15条结果，共{searchResults[sourceType].length}条
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-xs text-slate-400 py-4">暂无搜索结果</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleParse}
                disabled={!searchResults.availability[sourceType] || isParsing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-semibold shadow-md shadow-violet-500/20 hover:shadow-violet-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isParsing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {isParsing ? '解析中...' : '解析并填入基础设定'}
              </button>
            </>
          )}

          {isParsing && parsedData === null && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20">
              <div className="flex items-center gap-3">
                <Loader2 size={20} className="animate-spin text-violet-500" />
                <div className="text-sm">
                  <p className="font-semibold text-violet-600">正在综合分析{sourceType === 'novel' ? '原著小说' : sourceType === 'tv_movie' ? '电视剧/电影' : '动漫'}来源...</p>
                  <p className="text-slate-500 text-xs mt-0.5">将提取人物、故事线、背景、主题等完整设定</p>
                </div>
              </div>
            </div>
          )}

          {parsedData && (
            <div className="space-y-4 mt-5">
              <div className="bg-white/60 rounded-xl p-4 border border-violet-500/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-violet-500" />
                    <h3 className="text-sm font-bold">解析到的人物（{parsedData.characters.length}）</h3>
                  </div>
                  <button
                    onClick={handleImportCharacters}
                    disabled={imported.characters}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-600 text-xs font-semibold hover:bg-violet-500/20 transition-all disabled:opacity-60"
                  >
                    {imported.characters ? <Check size={13} /> : <BookOpen size={13} />}
                    {imported.characters ? '已导入人物管理' : '导入人物管理'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {parsedData.characters.map((c, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-white/60 border border-violet-500/10">
                      <p className="text-sm font-bold">{c.name}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-2">{c.identity}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/60 rounded-xl p-4 border border-pink-500/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GitBranch size={16} className="text-pink-500" />
                    <h3 className="text-sm font-bold">解析到的故事线（{parsedData.storylines.length}）</h3>
                  </div>
                  <button
                    onClick={handleImportStorylines}
                    disabled={imported.storylines}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/10 text-pink-600 text-xs font-semibold hover:bg-pink-500/20 transition-all disabled:opacity-60"
                  >
                    {imported.storylines ? <Check size={13} /> : <BookOpen size={13} />}
                    {imported.storylines ? '已导入故事线画布' : '导入故事线画布'}
                  </button>
                </div>
                <div className="space-y-3">
                  {parsedData.storylines.map((line, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/60 border border-indigo-500/10">
                      <p className="text-sm font-bold mb-2">{line.title}</p>
                      <div className="space-y-2">
                        {line.scenes.map((scene, j) => (
                          <div key={j} className="p-2 rounded-lg bg-white/80">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-violet-600">{scene.name}</p>
                              {scene.location && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                  {scene.location}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2">{scene.description}</p>
                            {scene.characters.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {scene.characters.map((char, k) => (
                                  <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-500">
                                    {char}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="glass rounded-2xl p-6 glow-border">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_12px_#6366F1]" />
            <h2 className="text-base font-bold">同人作品基础信息</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">同人作品名称</label>
              <input
                className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                value={settings.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">故事背景</label>
              <input
                className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                value={settings.background}
                onChange={(e) => handleChange('background', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1.5">中心主题</label>
              <textarea
                className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all min-h-[80px] resize-y"
                value={settings.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1.5">绝对禁止</label>
              <textarea
                className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all min-h-[80px] resize-y"
                value={settings.forbidden}
                onChange={(e) => handleChange('forbidden', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl p-6 glow-border">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_12px_#22D3EE]" />
            <h2 className="text-base font-bold">类型与标签</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-2">作品类型</label>
              <div className="flex flex-wrap gap-2">
                {NOVEL_TYPES.map((tag) => (
                  <span
                    key={tag}
                    onClick={() => toggleTag(tag, 'type')}
                    className={`px-3 py-1.5 rounded-full text-xs cursor-pointer transition-all ${
                      settings.type.includes(tag)
                        ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-md shadow-violet-500/20'
                        : 'bg-indigo-500/8 border border-indigo-500/10 hover:border-violet-500/20'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-2">故事标签</label>
              <div className="flex flex-wrap gap-2">
                {NOVEL_TAGS.map((tag) => (
                  <span
                    key={tag}
                    onClick={() => toggleTag(tag, 'tags')}
                    className={`px-3 py-1.5 rounded-full text-xs cursor-pointer transition-all ${
                      settings.tags.includes(tag)
                        ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-md shadow-violet-500/20'
                        : 'bg-indigo-500/8 border border-indigo-500/10 hover:border-violet-500/20'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl p-6 glow-border">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_12px_#EC4899]" />
            <h2 className="text-base font-bold">创作方向</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">以下设定将影响 AI 生成正文的提示词与行文风格。</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'platform', label: '目标平台', options: PLATFORM_OPTIONS },
              { key: 'readerType', label: '读者类型', options: READER_TYPE_OPTIONS },
              { key: 'structure', label: '结构模板', options: STRUCTURE_OPTIONS },
              { key: 'perspective', label: '叙事视角', options: PERSPECTIVE_OPTIONS },
            ].map((item) => (
              <div key={item.key}>
                <label className="block text-xs text-slate-500 mb-1.5">{item.label}</label>
                <select
                  className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all"
                  value={settings.direction[item.key as keyof typeof settings.direction]}
                  onChange={(e) => handleDirectionChange(item.key as keyof typeof settings.direction, e.target.value)}
                >
                  {item.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-2xl p-6 glow-border">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_12px_#F59E0B]" />
            <h2 className="text-base font-bold">原作信息（可手动修正）</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">原作主要人物</label>
              <textarea
                className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all min-h-[100px] resize-y"
                value={settings.fanfic.characters}
                onChange={(e) =>
                  updateSettings({ fanfic: { ...settings.fanfic, characters: e.target.value } })
                }
                placeholder="列出原作中的主要人物及关系"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">原作故事梗概</label>
              <textarea
                className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all min-h-[100px] resize-y"
                value={settings.fanfic.plot}
                onChange={(e) =>
                  updateSettings({ fanfic: { ...settings.fanfic, plot: e.target.value } })
                }
                placeholder="简要描述原作已发生的关键情节"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="flex justify-center gap-3 mt-10 pb-8">
        <button
          onClick={handleSave}
          className="px-8 py-3 rounded-xl bg-white/80 border border-indigo-500/10 text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/10 transition-all flex items-center gap-2"
        >
          {saved ? '已保存' : '保存设定'}
        </button>
        <button
          onClick={() => navigate('/characters')}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          下一步：人物管理
        </button>
      </div>
    </div>
  )
}
