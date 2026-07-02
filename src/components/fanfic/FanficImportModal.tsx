import { useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  searchAllTypes,
  parseFanficFromSearch,
  convertParsedCharactersToStore,
  convertParsedStorylinesToStore,
  type ParsedFanficData,
  type FanficSourceType,
  type SearchResultsByType,
} from '@/services/searchService'
import { X, Download, Users, GitBranch, Loader2, BookOpen, Search, Check } from 'lucide-react'

interface FanficImportModalProps {
  mode: 'characters' | 'storylines' | 'all'
  onClose: () => void
}

export default function FanficImportModal({ mode, onClose }: FanficImportModalProps) {
  const project = useProjectStore((state) => state.getCurrentProject())
  const updateSettings = useProjectStore((state) => state.updateSettings)
  const importCharacters = useProjectStore((state) => state.importCharacters)
  const importStorylines = useProjectStore((state) => state.importStorylines)
  const clearCharacters = useProjectStore((state) => state.clearCharacters)
  const clearStorylines = useProjectStore((state) => state.clearStorylines)
  const resetFromFanfic = useProjectStore((state) => state.resetFromFanfic)

  const settings = project?.settings

  const [workName, setWorkName] = useState(settings?.fanfic.workName || '')
  const [authorName, setAuthorName] = useState(settings?.fanfic.authorName || '')
  const [sourceType, setSourceType] = useState<FanficSourceType>('novel')
  const [isParsing, setIsParsing] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResultsByType | null>(null)
  const [parsedData, setParsedData] = useState<ParsedFanficData | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [imported, setImported] = useState<{ characters: boolean; storylines: boolean }>({
    characters: false,
    storylines: false,
  })

  const showCharacters = mode === 'characters' || mode === 'all'
  const showStorylines = mode === 'storylines' || mode === 'all'

  const handleSearch = async () => {
    if (!workName.trim()) return
    setIsSearching(true)
    setSearchResults(null)
    setParsedData(null)
    setImported({ characters: false, storylines: false })
    setNotice(null)
    try {
      const results = await searchAllTypes(workName, authorName)
      setSearchResults(results)
      if (results.workExists) {
        const availableTypes: FanficSourceType[] = []
        if (results.availability.novel) availableTypes.push('novel')
        if (results.availability.tv_movie) availableTypes.push('tv_movie')
        if (results.availability.anime) availableTypes.push('anime')
        if (availableTypes.length > 0) {
          setSourceType(availableTypes[0])
        }
      }
    } catch {
      setNotice('搜索失败，请稍后重试')
    } finally {
      setIsSearching(false)
    }
  }

  const handleParse = async () => {
    if (!workName.trim()) return
    setIsParsing(true)
    setParsedData(null)
    setImported({ characters: false, storylines: false })
    setNotice(null)
    try {
      const data = await parseFanficFromSearch(workName, authorName, sourceType)
      setParsedData(data)
      resetFromFanfic({
        workName: data.workName,
        authorName: data.authorName,
      })
      updateSettings({
        fanfic: {
          ...(settings?.fanfic || {
            workName: '',
            authorName: '',
            characters: '',
            plot: '',
            isEnabled: true,
          }),
          workName,
          authorName,
          isEnabled: true,
          characters: data.characters.map((c) => `${c.name}：${c.identity}`).join('\n'),
          plot: data.storylines.map((s) => `【${s.title}】\n${s.scenes.map((scene) => scene.name).join('\n')}`).join('\n\n'),
        },
      })
    } catch {
      setNotice('解析失败，请稍后重试')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/30 backdrop-blur-sm">
      <div className="glass rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto glow-border">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">
            {mode === 'characters' && '从同人文导入人物'}
            {mode === 'storylines' && '从同人文导入故事线'}
            {mode === 'all' && '从同人文导入'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/50 transition-colors">
            <X size={18} />
          </button>
        </div>

        {notice && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
            {notice}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">原作名称</label>
            <input
              className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              value={workName}
              onChange={(e) => {
                setWorkName(e.target.value)
                setSearchResults(null)
                setParsedData(null)
              }}
              placeholder="例如：默读"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">作者名</label>
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="例如：Priest"
              />
              <button
                onClick={handleSearch}
                disabled={!workName.trim() || isSearching}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-60 flex items-center gap-1.5"
              >
                {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                {isSearching ? '查询中...' : '查询'}
              </button>
            </div>
          </div>
        </div>

        {isSearching && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20">
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
            <p className="font-semibold">未找到《{workName}》的相关作品信息，请检查作品名称和作者是否正确</p>
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
                            ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/20'
                            : 'bg-white/60 border border-indigo-500/10 hover:border-indigo-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold">{option.label}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          !available ? 'bg-slate-200 text-slate-400' : sourceType === option.value ? 'bg-white/20 text-white/80' : 'bg-indigo-500/10 text-indigo-500'
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
              <div className="max-h-32 overflow-y-auto bg-white/40 rounded-xl p-3 border border-indigo-500/10">
                {searchResults[sourceType].length > 0 ? (
                  <div className="space-y-2">
                    {searchResults[sourceType].slice(0, 10).map((result, i) => (
                      <a
                        key={i}
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-3 py-2 rounded-lg bg-white/60 hover:bg-white/80 transition-all text-xs text-slate-600 hover:text-indigo-600"
                      >
                        <p className="font-semibold line-clamp-1">{result.title}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{result.snippet}</p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-400 py-4">暂无搜索结果</p>
                )}
              </div>
            </div>

            <button
              onClick={handleParse}
              disabled={!searchResults.availability[sourceType] || isParsing}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-bold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isParsing ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
              {isParsing ? '解析中...' : '解析当前分类内容'}
            </button>
          </>
        )}

        {isParsing && parsedData === null && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20">
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-violet-500" />
              <div className="text-sm">
                <p className="font-semibold text-violet-600">正在综合分析{sourceType === 'novel' ? '原著小说' : sourceType === 'tv_movie' ? '电视剧/电影' : '动漫'}来源...</p>
                <p className="text-slate-500 text-xs mt-0.5">将提取人物信息和故事线场景</p>
              </div>
            </div>
          </div>
        )}

        {parsedData && (
          <div className="space-y-4 mt-5">
            {showCharacters && (
              <div className="bg-white/60 rounded-xl p-4 border border-indigo-500/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-indigo-500" />
                    <h3 className="text-sm font-bold">解析到的人物（{parsedData.characters.length}）</h3>
                  </div>
                  <button
                    onClick={handleImportCharacters}
                    disabled={imported.characters}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 text-xs font-semibold hover:bg-indigo-500/20 transition-all disabled:opacity-60"
                  >
                    {imported.characters ? <Check size={13} /> : <Download size={13} />}
                    {imported.characters ? '已导入' : '导入人物'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto">
                  {parsedData.characters.map((c, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-white/60 border border-indigo-500/10">
                      <p className="text-sm font-bold">{c.name}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-2">{c.identity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showStorylines && (
              <div className="bg-white/60 rounded-xl p-4 border border-indigo-500/10">
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
                    {imported.storylines ? <Check size={13} /> : <Download size={13} />}
                    {imported.storylines ? '已导入' : '导入故事线'}
                  </button>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {parsedData.storylines.map((line, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/60 border border-indigo-500/10">
                      <p className="text-sm font-bold mb-2">{line.title}</p>
                      <div className="space-y-2">
                        {line.scenes.map((scene, j) => (
                          <div key={j} className="p-2 rounded-lg bg-white/80">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-indigo-600">{scene.name}</p>
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
                                  <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500">
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
            )}
          </div>
        )}

        <p className="text-[10px] text-slate-400 mt-4">
          输入作品名称后，点击查询按钮，系统会自动检测哪些类型有相关内容，无结果的类型将被禁用。
        </p>
      </div>
    </div>
  )}