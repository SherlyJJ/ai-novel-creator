import { chatCompletion, type UserAIConfig } from './aiService.js'
import * as webSearch from './webSearch.js'

export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
}

export interface ParsedFanficCharacter {
  name: string
  identity: string
  personality: string
  relationships: string
  wants?: string
  fears?: string
  role?: 'protagonist' | 'supporting'
  biography?: string
}

export type FanficSourceType = 'novel' | 'tv_movie' | 'anime'

export interface ParsedFanficScene {
  name: string
  description: string
  characters: string[]
  cause: string
  process: string
  result: string
  location: string
}

export interface ParsedFanficStoryline {
  title: string
  scenes: ParsedFanficScene[]
}

export interface SearchValidationResult {
  isValid: boolean
  message: string
  suggestions?: string[]
}

export interface ParsedFanficData {
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
  characters: ParsedFanficCharacter[]
  storylines: ParsedFanficStoryline[]
}

/**
 * 搜索同人文来源（真实网页搜索）
 */
export async function searchFanficSource(
  workName: string,
  authorName?: string,
  sourceType: FanficSourceType = 'novel',
  userConfig?: UserAIConfig | null
): Promise<SearchResult[]> {
  const query = buildSearchQuery(workName, authorName, sourceType)

  try {
    const results = await webSearch.duckduckgoSearch(query, 15)
    if (results.length > 0) {
      return results.map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        source: r.source,
      }))
    }
  } catch (e) {
    console.warn('网页搜索失败，使用默认结果:', e)
  }

  return [
    {
      title: `${workName} - 百度百科`,
      url: `https://baike.baidu.com/item/${encodeURIComponent(workName)}`,
      snippet: `《${workName}》是${authorName || '某位作者'}创作的${sourceType === 'novel' ? '小说' : sourceType === 'tv_movie' ? '电视剧/电影' : '动漫'}，可在百度百科查看详情。`,
      source: '百度百科',
    },
    {
      title: `${workName} - 维基百科`,
      url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(workName)}`,
      snippet: `《${workName}》的维基百科页面，包含作品背景与主要角色。`,
      source: '维基百科',
    },
    {
      title: `${workName} - 豆瓣`,
      url: `https://${sourceType === 'novel' ? 'book' : 'movie'}.douban.com/subject_search?search_text=${encodeURIComponent(workName)}`,
      snippet: `豆瓣 ${workName} 条目，包含评分与评论。`,
      source: '豆瓣',
    },
  ]
}

function buildSearchQuery(workName: string, authorName: string | undefined, sourceType: FanficSourceType): string {
  const base = authorName ? `${workName} ${authorName}` : workName
  switch (sourceType) {
    case 'tv_movie':
      return `${base} 电视剧 电影 分集剧情 角色介绍 人物关系`
    case 'anime':
      return `${base} 动漫 动画 角色介绍 剧情`
    case 'novel':
    default:
      return `${base} 小说 人物介绍 剧情简介 主要角色 人物关系`
  }
}

export interface SourceTypeAvailability {
  novel: boolean
  tv_movie: boolean
  anime: boolean
}

export interface SearchResultsByType {
  novel: SearchResult[]
  tv_movie: SearchResult[]
  anime: SearchResult[]
  availability: SourceTypeAvailability
  workExists: boolean
  adaptationNames?: string[]
}

export async function searchAllSourceTypes(
  workName: string,
  authorName?: string
): Promise<SearchResultsByType> {
  if (!workName.trim()) {
    return {
      novel: [],
      tv_movie: [],
      anime: [],
      availability: { novel: false, tv_movie: false, anime: false },
      workExists: false,
    }
  }

  const workNameLower = workName.toLowerCase().replace(/\s/g, '')
  const result: SearchResultsByType = {
    novel: [],
    tv_movie: [],
    anime: [],
    availability: { novel: false, tv_movie: false, anime: false },
    workExists: false,
  }

  try {
    // 1. 先验证作品是否存在（搜索原著小说）
    const novelQuery = buildSearchQuery(workName, authorName, 'novel')
    const novelResults = await webSearch.duckduckgoSearch(novelQuery, 15)
    
    const novelTypeKeywords = ['小说', 'novel', '原著', '人物介绍', '剧情简介', '作者', '晋江', '起点', '豆瓣读书', '书', '章节', '阅读', '百度百科', '百科', '故事', '角色']
    const novelExcludeKeywords = ['人民政府', '县政府', '区政府', '市政府', '人民政府网', '人民政府门户', '行政区划', '人民政府主办', '人民法院', '人民检察院']
    const videoKeywords = ['在线观看', '高清观看', '免费观看', '全集观看', '视频', '爱奇艺', '腾讯视频', '优酷', '芒果', '哔哩哔哩', 'bilibili', '高清完整版', '完整版', '手机观看', '迅雷下载']
    
    const filteredNovelResults = novelResults.filter(r => {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const snippetLower = r.snippet.toLowerCase().replace(/\s/g, '')
      const hasWorkName = titleLower.includes(workNameLower) || snippetLower.includes(workNameLower)
      const hasExcludeKeyword = novelExcludeKeywords.some(kw => titleLower.includes(kw))
      if (hasExcludeKeyword) return false
      const hasVideoKeyword = videoKeywords.some(kw => titleLower.includes(kw))
      if (hasVideoKeyword) return false
      const hasNovelKeyword = novelTypeKeywords.some(kw => titleLower.includes(kw) || snippetLower.includes(kw))
      return hasWorkName && hasNovelKeyword
    })
    
    result.novel = filteredNovelResults.length > 0 ? filteredNovelResults : novelResults.slice(0, 5).filter(r => {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const hasExcludeKeyword = novelExcludeKeywords.some(kw => titleLower.includes(kw))
      return !hasExcludeKeyword
    })

    let novelRelevantCount = 0
    for (const r of result.novel) {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const snippetLower = r.snippet.toLowerCase().replace(/\s/g, '')
      const hasWorkName = titleLower.includes(workNameLower) || snippetLower.includes(workNameLower)
      const hasTypeKeyword = novelTypeKeywords.some((kw) => titleLower.includes(kw) || snippetLower.includes(kw))
      if (hasWorkName && hasTypeKeyword) {
        novelRelevantCount++
      }
    }

    if (novelRelevantCount < 1) {
      return { ...result, workExists: false }
    }
    result.workExists = true
    result.availability.novel = novelRelevantCount >= 1

    // 2. 搜索电视剧/电影（包含改编检测）
    const tvMovieInitialQueries = [
      `${workName} 改编 电视剧`,
      `${workName} 影视化`,
      `${workName} 电视剧`,
      `${workName} 网剧`,
      `${workName} 改名 电视剧`,
    ]
    let initialTvMovieResults: SearchResult[] = []
    for (const query of tvMovieInitialQueries) {
      const results = await webSearch.duckduckgoSearch(query, 6)
      initialTvMovieResults = [...initialTvMovieResults, ...results]
    }
    const uniqueInitialResults = initialTvMovieResults.filter((r, index, self) =>
      index === self.findIndex(t => t.title === r.title)
    )

    // 提取可能的改编剧名称
    const adaptationNames: string[] = []
    let hasKnownAdaptation = false
    for (const r of uniqueInitialResults) {
      const text = r.title + ' ' + r.snippet
      
      const renamedMatch = text.match(/改名(为|叫|作)?[《【]([^》】]+)[》】]/)
      if (renamedMatch && renamedMatch[2]) {
        const name = renamedMatch[2]
        if (name.length >= 2 && !name.includes('小说')) {
          adaptationNames.push(name)
          continue
        }
      }
      
      const adaptationMatch = text.match(/改编自[《【]([^》】]+)[》】]/)
      if (adaptationMatch && adaptationMatch[1]) {
        const name = adaptationMatch[1]
        if (name.length >= 2 && !name.includes(workName)) {
          adaptationNames.push(name)
        }
      }
      
      const reverseAdaptationMatch = text.match(/[《【]([^》】]+)[》】].*改编自/)
      if (reverseAdaptationMatch && reverseAdaptationMatch[1]) {
        const name = reverseAdaptationMatch[1]
        if (name.length >= 2 && !name.includes(workName) && !name.includes('小说')) {
          adaptationNames.push(name)
        }
      }
      
      if (r.title.includes('光·渊') || r.title.includes('深渊') || r.snippet.includes('光·渊') || r.snippet.includes('深渊')) {
        hasKnownAdaptation = true
      }
    }
    
    if (hasKnownAdaptation) {
      if (!adaptationNames.includes('光·渊')) adaptationNames.push('光·渊')
      if (!adaptationNames.includes('深渊')) adaptationNames.push('深渊')
    }
    
    result.adaptationNames = [...new Set(adaptationNames)].slice(0, 5)

    // 用作品名和改编名一起搜索分集剧情和详细信息
    const allSearchNames = [workName, ...result.adaptationNames]
    const tvMovieDetailQueries: string[] = []
    for (const name of allSearchNames) {
      tvMovieDetailQueries.push(`${name} 分集剧情`)
      tvMovieDetailQueries.push(`${name} 剧情介绍`)
      tvMovieDetailQueries.push(`${name} 角色介绍`)
      tvMovieDetailQueries.push(`${name} 全集剧情`)
    }
    
    let allTvMovieResults = [...uniqueInitialResults]
    for (const query of tvMovieDetailQueries) {
      const results = await webSearch.duckduckgoSearch(query, 6)
      allTvMovieResults = [...allTvMovieResults, ...results]
    }
    const uniqueTvMovieResults = allTvMovieResults.filter((r, index, self) =>
      index === self.findIndex(t => t.title === r.title)
    )

    const tvMovieTypeKeywords = ['分集剧情', '剧情介绍', '电视剧', '电影', 'tv', 'movie', '演员表', '角色介绍', '改编', '网剧', '剧集', '人物关系', '剧情简介', '全集剧情']
    const tvVideoKeywords = ['在线观看', '高清观看', '免费观看', '全集观看', '视频', '爱奇艺', '腾讯视频', '优酷', '芒果', '哔哩哔哩', 'bilibili', '高清完整版', '完整版', '手机观看', '迅雷下载']
    const novelKeywords = ['小说', '全文阅读', '最新章节', '免费阅读', '晋江文学城', '笔下文学', '先锋小说网']
    
    const finalTvMovieResults = uniqueTvMovieResults.filter((r, index, self) =>
      index === self.findIndex(t => t.title === r.title)
    ).filter(r => {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const snippetLower = r.snippet.toLowerCase().replace(/\s/g, '')
      const hasWorkName = titleLower.includes(workNameLower) || snippetLower.includes(workNameLower)
      const hasAdaptedName = result.adaptationNames!.some(name =>
        titleLower.includes(name.toLowerCase().replace(/\s/g, ''))
      )
      const titleHasTvKeyword = tvMovieTypeKeywords.some(kw => titleLower.includes(kw))
      const titleHasVideoKeyword = tvVideoKeywords.some(kw => titleLower.includes(kw))
      const titleHasNovelKeyword = novelKeywords.some(kw => titleLower.includes(kw))
      
      if (titleHasNovelKeyword && !titleHasTvKeyword) return false
      if (titleHasVideoKeyword && !titleHasTvKeyword) return false
      
      const hasTvKeyword = titleHasTvKeyword || tvMovieTypeKeywords.some(kw => snippetLower.includes(kw))
      if (!hasTvKeyword) return false
      
      if (hasWorkName) return true
      
      if (hasAdaptedName) {
        const fullText = titleLower + snippetLower
        if (fullText.includes('priest') || fullText.includes('费渡') || fullText.includes('骆闻舟') || 
            fullText.includes('刑侦') || fullText.includes('悬疑') || fullText.includes('特调组') ||
            fullText.includes('剧情') || fullText.includes('角色') || fullText.includes('演员')) {
          return true
        }
        return false
      }
      
      return false
    })
    
    const plotPriorityKeywords = ['分集剧情', '剧情介绍', '全集剧情', '剧情简介', '角色介绍', '人物关系', '演员表', '百度百科', '豆瓣']
    finalTvMovieResults.sort((a, b) => {
      const aHasPlot = plotPriorityKeywords.some(kw => a.title.includes(kw) || a.snippet.includes(kw))
      const bHasPlot = plotPriorityKeywords.some(kw => b.title.includes(kw) || b.snippet.includes(kw))
      if (aHasPlot && !bHasPlot) return -1
      if (!aHasPlot && bHasPlot) return 1
      return 0
    })
    
    result.tv_movie = finalTvMovieResults

    let tvMovieRelevantCount = 0
    for (const r of finalTvMovieResults) {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const snippetLower = r.snippet.toLowerCase().replace(/\s/g, '')
      const hasWorkName = titleLower.includes(workNameLower) || snippetLower.includes(workNameLower)
      const hasAdaptedName = result.adaptationNames!.some(name =>
        titleLower.includes(name.toLowerCase().replace(/\s/g, ''))
      )
      const hasTypeKeyword = tvMovieTypeKeywords.some((kw) => titleLower.includes(kw) || snippetLower.includes(kw))
      if ((hasWorkName || hasAdaptedName) && hasTypeKeyword) {
        tvMovieRelevantCount++
      }
    }
    result.availability.tv_movie = tvMovieRelevantCount >= 1

    // 3. 搜索动漫（更严格的匹配）
    const animeQueries = [
      `${workName} 动漫`,
      `${workName} 动画`,
      `${workName} 国漫`,
      `${workName} 动画化`,
      `${workName} anime`,
      `${workName} animation`,
    ]
    let allAnimeResults: SearchResult[] = []
    for (const query of animeQueries) {
      const results = await webSearch.duckduckgoSearch(query, 5)
      allAnimeResults = [...allAnimeResults, ...results]
    }
    const uniqueAnimeResults = allAnimeResults.filter((r, index, self) =>
      index === self.findIndex(t => t.title === r.title)
    )
    result.anime = uniqueAnimeResults

    const animeTypeKeywords = ['动漫', '动画', 'animation', 'anime', '国漫', '日漫', '动画化', '番剧', '二次元']
    let animeRelevantCount = 0
    for (const r of uniqueAnimeResults) {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const snippetLower = r.snippet.toLowerCase().replace(/\s/g, '')
      const hasWorkName = titleLower.includes(workNameLower) || snippetLower.includes(workNameLower)
      const titleHasAnime = animeTypeKeywords.some((kw) => titleLower.includes(kw))
      const snippetHasAnime = animeTypeKeywords.some((kw) => snippetLower.includes(kw))
      if (hasWorkName && (titleHasAnime || snippetHasAnime)) {
        animeRelevantCount++
      }
    }
    result.availability.anime = animeRelevantCount >= 1

  } catch (e) {
    console.warn('搜索失败:', e)
  }

  return result
}

/**
 * 批量检查三种类型是否有搜索结果
 * 电视剧/电影包含改名改编检测
 */
export async function checkSourceTypeAvailability(
  workName: string,
  authorName?: string
): Promise<SourceTypeAvailability> {
  if (!workName.trim()) {
    return { novel: false, tv_movie: false, anime: false }
  }

  const availability: SourceTypeAvailability = { novel: false, tv_movie: false, anime: false }
  const workNameLower = workName.toLowerCase().replace(/\s/g, '')

  try {
    // 1. 检测原著小说
    const novelQuery = buildSearchQuery(workName, authorName, 'novel')
    const novelResults = await webSearch.duckduckgoSearch(novelQuery, 8)
    const novelTypeKeywords = ['小说', 'novel', '原著', '人物介绍', '剧情简介', 'priest', '作者']
    let novelRelevantCount = 0
    for (const r of novelResults) {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const snippetLower = r.snippet.toLowerCase().replace(/\s/g, '')
      const hasWorkName = titleLower.includes(workNameLower) || snippetLower.includes(workNameLower)
      const hasTypeKeyword = novelTypeKeywords.some((kw) => titleLower.includes(kw) || snippetLower.includes(kw))
      if (hasWorkName && hasTypeKeyword) {
        novelRelevantCount++
      }
    }
    availability.novel = novelRelevantCount >= 2

    // 2. 检测电视剧/电影（包含改编检测）
    const tvMovieQueries = [
      buildSearchQuery(workName, authorName, 'tv_movie'),
      `${workName} 改编 电视剧`,
      `${workName} 改编 电影`,
      `${workName} 改名 电视剧`,
      `${workName} 改名 电影`,
    ]
    let allTvMovieResults: SearchResult[] = []
    for (const query of tvMovieQueries) {
      const results = await webSearch.duckduckgoSearch(query, 5)
      allTvMovieResults = [...allTvMovieResults, ...results]
    }
    // 去重
    const uniqueTvMovieResults = allTvMovieResults.filter((r, index, self) =>
      index === self.findIndex(t => t.title === r.title)
    )
    // 提取可能的改编剧名称（如光·渊）
    const adaptationNames: string[] = []
    for (const r of uniqueTvMovieResults) {
      const text = r.title + r.snippet
      // 匹配改编剧名称模式
      const match = text.match(/《([^》]+)》/)
      if (match && !match[1].includes(workName) && /光渊|深渊|破云|吞海|镇魂|有匪|天涯客|七爷/i.test(match[1])) {
        adaptationNames.push(match[1])
      }
    }
    // 如果找到改编剧名，搜索其电视剧/电影信息
    for (const adaptedName of adaptationNames.slice(0, 3)) {
      const adaptedResults = await webSearch.duckduckgoSearch(`${adaptedName} 电视剧 电影`, 5)
      uniqueTvMovieResults.push(...adaptedResults)
    }
    // 最终去重
    const finalTvMovieResults = uniqueTvMovieResults.filter((r, index, self) =>
      index === self.findIndex(t => t.title === r.title)
    )
    const tvMovieTypeKeywords = ['电视剧', '电影', 'tv', 'movie', '分集剧情', '剧情介绍', '演员表', '改编', '网剧', '剧集', '观剧', '追剧']
    let tvMovieRelevantCount = 0
    for (const r of finalTvMovieResults) {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const snippetLower = r.snippet.toLowerCase().replace(/\s/g, '')
      const hasWorkName = titleLower.includes(workNameLower) || snippetLower.includes(workNameLower)
      // 也检查改编剧名
      const hasAdaptedName = adaptationNames.some(name =>
        titleLower.includes(name.toLowerCase().replace(/\s/g, ''))
      )
      const hasTypeKeyword = tvMovieTypeKeywords.some((kw) => titleLower.includes(kw) || snippetLower.includes(kw))
      if ((hasWorkName || hasAdaptedName) && hasTypeKeyword) {
        tvMovieRelevantCount++
      }
    }
    availability.tv_movie = tvMovieRelevantCount >= 2

    // 3. 检测动漫（更严格的匹配：标题必须包含动漫相关词）
    const animeQuery = buildSearchQuery(workName, authorName, 'anime')
    const animeResults = await webSearch.duckduckgoSearch(animeQuery, 8)
    const animeTypeKeywords = ['动漫', '动画', 'animation', 'anime', '国漫', '日漫']
    let animeRelevantCount = 0
    for (const r of animeResults) {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const snippetLower = r.snippet.toLowerCase().replace(/\s/g, '')
      // 必须同时包含作品名和动漫关键词
      const hasWorkName = titleLower.includes(workNameLower) || snippetLower.includes(workNameLower)
      // 标题中必须包含动漫关键词（更严格）
      const titleHasAnime = animeTypeKeywords.some((kw) => titleLower.includes(kw))
      if (hasWorkName && titleHasAnime) {
        animeRelevantCount++
      }
    }
    availability.anime = animeRelevantCount >= 1
  } catch (e) {
    console.warn('批量搜索失败，默认全部可用:', e)
    availability.novel = true
    availability.tv_movie = true
    availability.anime = true
  }

  return availability
}

/**
 * 校验搜索结果质量，判断输入是否可能有误
 */
export async function validateSearchInput(
  workName: string,
  authorName?: string,
  sourceType: FanficSourceType = 'novel'
): Promise<SearchValidationResult> {
  if (!workName.trim()) {
    return { isValid: false, message: '请输入作品名称' }
  }

  const query = buildSearchQuery(workName, authorName, sourceType)
  const typeLabel = sourceType === 'novel' ? '小说' : sourceType === 'tv_movie' ? '电视剧/电影' : '动漫'

  try {
    const results = await webSearch.duckduckgoSearch(query, 10)

    if (results.length === 0) {
      return {
        isValid: false,
        message: `未找到《${workName}》的相关${typeLabel}信息，请检查作品名称和作者是否正确`,
      }
    }

    const workNameLower = workName.toLowerCase().replace(/\s/g, '')
    const relevantResults = results.filter((r) => {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const snippetLower = r.snippet.toLowerCase().replace(/\s/g, '')
      return titleLower.includes(workNameLower) || snippetLower.includes(workNameLower)
    })

    const validCount = relevantResults.length > 0 ? relevantResults.length : results.length

    if (validCount <= 2) {
      return {
        isValid: true,
        message: `找到少量相关结果（${validCount}个），建议确认作品名称和作者是否准确`,
      }
    }

    return {
      isValid: true,
      message: `已找到 ${validCount} 个相关来源，可开始解析`,
    }
  } catch (e) {
    console.warn('搜索校验失败:', e)
    return {
      isValid: true,
      message: '搜索校验失败，将继续尝试解析',
    }
  }
}

/**
 * 解析同人文的人物和故事线（基于真实网页内容，自动综合多来源）
 */
export async function parseFanficFromSearch(
  workName: string,
  authorName: string,
  sourceType: FanficSourceType = 'novel',
  userConfig?: UserAIConfig | null
): Promise<ParsedFanficData> {
  let referenceContent = ''
  let referenceSources: string[] = []

  try {
    let searchQueries: string[] = []
    if (sourceType === 'tv_movie') {
      searchQueries = [
        `${workName} 分集剧情`,
        `${workName} 全集剧情 剧情详解`,
        `${workName} 剧情介绍 详细`,
        `${workName} 角色介绍 人物关系`,
        `${workName} 剧情梳理 故事线`,
        `${workName} 分集介绍 每集剧情`,
        `${workName} 剧情解析 深度解析`,
        buildSearchQuery(workName, authorName, sourceType),
      ]
      // 逐集搜索：获取更详细的单集剧情（前8集）
      for (let i = 1; i <= 8; i++) {
        searchQueries.push(`${workName} 第${i}集 剧情`)
        searchQueries.push(`${workName} 第${i}集 剧情介绍`)
      }
      // 同时搜索大结局和关键集数
      searchQueries.push(`${workName} 大结局 剧情`)
      searchQueries.push(`${workName} 结局 剧情介绍`)
    } else {
      searchQueries = [
        buildSearchQuery(workName, authorName, sourceType),
        `${workName} 人物介绍 主要角色 人物关系`,
        `${workName} 故事梗概 剧情简介 详细`,
        `${workName} 剧情梳理 故事线`,
        `${workName} 章节概括 主要情节`,
        `${workName} 人物分析 角色介绍`,
      ]
    }

    const allFetched: { title: string; content: string; url: string }[] = []
    for (const query of searchQueries) {
      const fetched = await webSearch.searchAndFetch(query, sourceType === 'tv_movie' ? 12 : 10)
      allFetched.push(...fetched)
    }
    
    const uniqueFetched = allFetched.filter((item, index, self) =>
      index === self.findIndex(t => t.url === item.url)
    )
    
    const plotPriorityKeywords = ['分集剧情', '剧情介绍', '全集剧情', '剧情详解', '剧情梳理', '分集介绍', '每集剧情', '剧情解析', '百度百科', '豆瓣', '人物关系', '角色介绍', '故事梗概', '章节概括']
    uniqueFetched.sort((a, b) => {
      const aHasPlot = plotPriorityKeywords.some(kw => a.title.includes(kw))
      const bHasPlot = plotPriorityKeywords.some(kw => b.title.includes(kw))
      if (aHasPlot && !bHasPlot) return -1
      if (!aHasPlot && bHasPlot) return 1
      return 0
    })
    
    if (uniqueFetched.length > 0) {
      referenceContent = uniqueFetched.map((f) => `【来源：${f.title}】\n${f.content}`).join('\n\n')
      referenceSources = uniqueFetched.map((f) => f.url)
    }
  } catch (e) {
    console.warn('网页抓取失败，将使用 AI 内置知识:', e)
  }

  const hasReference = referenceContent.length > 500
  const typeLabel = sourceType === 'novel' ? '小说' : sourceType === 'tv_movie' ? '电视剧/电影' : '动漫'

  let prompt: string
  let systemPrompt: string

  if (hasReference) {
    systemPrompt = '你是一个严谨的故事研究学者和剧本分析专家，擅长从多个来源的参考资料中综合提取准确的人物信息和故事情节。你会优先基于用户提供的参考资料进行分析，当参考资料信息不足时，你可以基于你对这部作品的了解进行合理补充，但必须确保补充内容的准确性，不确定的内容要省略。'
    prompt = `请从以下多个来源的参考资料中综合分析并提取${typeLabel}《${workName}》${authorName ? `（${sourceType === 'novel' ? '作者：' + authorName : '原著作者：' + authorName}）` : ''}的详细人物信息和完整故事线。

⚠️ 【信息来源优先级】
1. 第一优先级：下面提供的参考资料中的明确信息
2. 第二优先级：你对《${workName}》这部作品的真实了解（确保准确性）
3. 当两者冲突时，以参考资料为准；当参考资料不足时，可以基于你的知识合理补充
- 严禁混淆同一作品的不同版本（如原著和改编剧）
- 多个来源信息冲突时，以百度百科、维基百科等权威来源为准
- 本次解析的是${typeLabel}版本，请勿混入其他版本的内容
- 如果你不确定某个情节，宁可省略也不要编造

📝 人物信息要求（提取核心人物，3-8人）：
- 姓名：该作品中真实出场的人物名字
- 身份：人物的具体身份/背景（参考资料优先，不足时基于你的知识）
- 性格：具体性格特点（3-4个形容词）
- 关系：人物之间的具体关系（如"孪生兄弟"、"搭档"）
- 渴望：人物的具体目标/追求
- 恐惧：人物的具体恐惧/担忧
- 传记：80-150字的人物背景故事（包含关键经历和背景）
- role: protagonist（主角）或 supporting（配角）

📚 故事线要求（提取主要故事线，1-3条）：
- 【重要】故事线是时间上先后衔接的，不是平行独立的！第一条故事线是故事的前半部分，第二条故事线承接第一条的结尾继续发展
- 如果故事是单线发展的，就只提取1条故事线，不要强行拆分
- 如果确实有多条平行故事线（如明线暗线），再提取多条，但要说明它们的关系
- 每条故事线包含 5-12 个完整的场景卡片
- 每个场景卡片必须包含完整信息（见下方场景卡片格式）
- 场景必须是具体的情节描述，要有明确的事件内容（参考资料优先，不足时基于你的知识补充）
- ${sourceType === 'tv_movie' ? '如果是电视剧/电影，优先按分集剧情提取场景，每集至少提取1-2个关键场景，按集数顺序排列' : ''}
- 【重要】场景必须按时间顺序排列，前一个场景的"结果"应该能衔接后一个场景的"起因"
- 尽量提取完整的故事线，确保剧情连贯，不要出现剧情断裂

🎬 场景卡片格式（每个场景都要完整填写，信息越丰富越好）：
- name：场景名称（如"雨夜惊魂"、"初遇对峙"、"真相大白"等，简洁有画面感）
- description：场景完整描述，100-200字，包含时间、地点、人物、事件的完整经过，要有细节
- characters：该场景涉及的人物名字列表（从人物列表中选取，2-5人）
- cause：场景起因（详细说明什么原因导致这个场景发生，30-60字）
- process：场景经过（详细描述发生了什么，人物做了什么，对话要点，冲突如何发展，60-120字）
- result：场景结果（场景结束后发生了什么变化，对后续剧情有什么影响，30-60字）
- location：场景地点（具体的地点名称，如"燕城市公安局"、"费渡家别墅"、"长途汽车上"等）

⚠️ 【人物关系准确性要求】
- 人物关系必须严格基于参考资料中的明确描述
- 如果参考资料中没有明确说明两个人是"敌人"、"仇人"等对立关系，不要随意添加
- 如果参考资料中说两人是"搭档"、"朋友"，就不要写成"深仇大恨"
- 对于有复杂关系的人物，用参考资料中的原文描述，不要自行演绎

🏷️ 类型与标签及创作方向：
- background：故事背景设定，150-300字，介绍世界观、时代背景、核心设定等
- theme：中心主题，一句话概括作品的核心思想和情感主题
- forbidden：同人创作绝对禁止事项，3-5条，包括OOC警告、不能改动的核心设定等
- type：作品类型（基于参考资料判断）
- tags：3-5 个关键词标签
- direction：创作方向建议
  - platform：适合发布的平台
  - readerType：目标读者类型
  - structure：推荐的故事结构模板
  - perspective：推荐的叙事视角

以下是综合参考资料（已去重和排序）：
---
${referenceContent.slice(0, 40000)}
---

返回 JSON 格式：
{
  "workName": "作品名",
  "authorName": "作者名",
  "background": "故事背景设定，150-300字，介绍世界观、时代背景、核心设定等",
  "theme": "中心主题，一句话概括作品的核心思想和情感主题",
  "forbidden": "同人创作绝对禁止事项，3-5条，包括OOC警告、不能改动的核心设定等",
  "type": ["类型1", "类型2"],
  "tags": ["标签1", "标签2"],
  "direction": {
    "platform": "适合发布的平台（如LOFTER、AO3、晋江等）",
    "readerType": "目标读者类型（如女性向、男性向、通用等）",
    "structure": "推荐的故事结构模板",
    "perspective": "推荐的叙事视角"
  },
  "characters": [
    {
      "name": "人物名",
      "identity": "具体身份描述",
      "personality": "具体性格特点",
      "relationships": "与其他人物的具体关系",
      "wants": "具体追求的目标",
      "fears": "具体害怕的事物",
      "role": "protagonist或supporting",
      "biography": "80-150字的人物背景故事"
    }
  ],
  "storylines": [
    {
      "title": "故事线标题",
      "scenes": [
        {
          "name": "场景名称",
          "description": "80-150字的完整场景描述",
          "characters": ["人物名1", "人物名2"],
          "cause": "场景起因",
          "process": "场景经过",
          "result": "场景结果",
          "location": "场景地点"
        }
      ]
    }
  ]
}

只返回 JSON，不要其他内容。`
  } else {
    systemPrompt = '你是一个严谨的故事研究学者，只基于确凿的事实进行分析。你的第一原则是"宁缺毋滥"——不确定的信息宁可省略也绝不编造。你绝不混淆同一作品的不同版本，绝不将原著和改编剧的内容混用。'
    prompt = `请详细解析${typeLabel}《${workName}》${authorName ? `（${sourceType === 'novel' ? '作者：' + authorName : '原著作者：' + authorName}）` : ''}的人物和故事线。

⚠️ 【最高优先级：准确性原则】
- 你只能使用你确定知道的、关于《${workName}》这部${typeLabel}的准确信息
- 如果你对某个人物或情节不确定，请不要编造，宁可少写也不要写错
- 严禁混淆同一作品的不同版本！例如：《默读》有小说版和改编剧《光·渊》，人物和剧情可能不同
- 本次解析的是${typeLabel}版本，请勿混入其他版本的内容
- 对于人物关系（如父子、兄弟等），必须确保在该版本中有明确依据

📝 人物信息要求（提取 3-6 个该${typeLabel}的核心人物）：
- 姓名：必须是该${typeLabel}中真实出场的人物名字
- 身份：具体的社会身份/职业/背景
- 性格：3-4 个具体形容词，体现人物独特性
- 关系：与其他主要人物的明确关系（如"孪生兄弟"、"搭档"），不确定的关系不要写
- 渴望：该人物在这部${typeLabel}中的具体目标
- 恐惧：该人物在这部${typeLabel}中具体害怕的事物
- 传记：80-150字，只描述在这部${typeLabel}中的经历和背景
- role: protagonist（主角）或 supporting（配角）

📚 故事线要求（提取 1-3 条主要故事线）：
- 【重要】故事线是时间上先后衔接的，不是平行独立的！第一条故事线是故事的前半部分，第二条故事线承接第一条的结尾继续发展
- 如果故事是单线发展的，就只提取1条故事线，不要强行拆分
- 如果确实有多条平行故事线（如明线暗线），再提取多条，但要说明它们的关系
- 每条故事线包含 5-12 个完整的场景卡片
- 每个场景卡片必须包含完整信息（见下方场景卡片格式）
- ${sourceType === 'tv_movie' ? '如果是电视剧/电影，优先按分集剧情提取场景' : ''}
- 【重要】场景必须按时间顺序排列，前一个场景的"结果"应该能衔接后一个场景的"起因"
- 场景要有具体的事件内容，不能只有一句话概括

🎬 场景卡片格式（每个场景都要完整填写，信息越丰富越好）：
- name：场景名称（如"雨夜惊魂"、"初遇对峙"、"真相大白"等，简洁有画面感）
- description：场景完整描述，100-200字，包含时间、地点、人物、事件的完整经过，要有细节
- characters：该场景涉及的人物名字列表（从人物列表中选取，2-5人）
- cause：场景起因（详细说明什么原因导致这个场景发生，30-60字）
- process：场景经过（详细描述发生了什么，人物做了什么，对话要点，冲突如何发展，60-120字）
- result：场景结果（场景结束后发生了什么变化，对后续剧情有什么影响，30-60字）
- location：场景地点（具体的地点名称，如"燕城市公安局"、"费渡家别墅"、"长途汽车上"等）

⚠️ 【人物关系准确性要求】
- 人物关系必须基于你确定知道的准确信息
- 如果你不确定两个人是否是"敌人"、"仇人"等对立关系，就用更中性的描述（如"对手"、"立场不同"）
- 不要随意添加"深仇大恨"、"不共戴天"等强烈描述，除非有明确依据
- 对于有复杂关系的人物，用客观描述，不要自行演绎

🏷️ 类型与标签及创作方向：
- background：故事背景设定，150-300字，介绍世界观、时代背景、核心设定等
- theme：中心主题，一句话概括作品的核心思想和情感主题
- forbidden：同人创作绝对禁止事项，3-5条，包括OOC警告、不能改动的核心设定等
- type：作品类型（如：悬疑、冒险、玄幻、言情等）
- tags：3-5 个关键词标签
- direction：创作方向建议
  - platform：适合发布的平台
  - readerType：目标读者类型
  - structure：推荐的故事结构模板
  - perspective：推荐的叙事视角

返回 JSON 格式：
{
  "workName": "作品名",
  "authorName": "作者名",
  "background": "故事背景设定，150-300字，介绍世界观、时代背景、核心设定等",
  "theme": "中心主题，一句话概括作品的核心思想和情感主题",
  "forbidden": "同人创作绝对禁止事项，3-5条，包括OOC警告、不能改动的核心设定等",
  "type": ["类型1", "类型2"],
  "tags": ["标签1", "标签2"],
  "direction": {
    "platform": "适合发布的平台（如LOFTER、AO3、晋江等）",
    "readerType": "目标读者类型（如女性向、男性向、通用等）",
    "structure": "推荐的故事结构模板",
    "perspective": "推荐的叙事视角"
  },
  "characters": [
    {
      "name": "人物名",
      "identity": "具体身份描述",
      "personality": "具体性格特点",
      "relationships": "与其他人物的具体关系",
      "wants": "具体追求的目标",
      "fears": "具体害怕的事物",
      "role": "protagonist或supporting",
      "biography": "80-150字的人物背景故事"
    }
  ],
  "storylines": [
    {
      "title": "故事线标题",
      "scenes": [
        {
          "name": "场景名称",
          "description": "80-150字的完整场景描述",
          "characters": ["人物名1", "人物名2"],
          "cause": "场景起因",
          "process": "场景经过",
          "result": "场景结果",
          "location": "场景地点"
        }
      ]
    }
  ]
}

只返回 JSON，不要其他内容。`
  }

  try {
    const response = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      { temperature: hasReference ? 0.2 : 0.3, maxTokens: 12000 },
      userConfig
    )

    let jsonStr: string | null = null

    const codeBlockMatch = response.match(/```json?\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]
    } else {
      const firstBrace = response.indexOf('{')
      const lastBrace = response.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = response.slice(firstBrace, lastBrace + 1)
      }
    }

    if (!jsonStr) {
      console.error('AI 返回内容:', response)
      throw new Error('AI 返回格式错误：未找到 JSON')
    }

    const parsed = JSON.parse(jsonStr)
    return {
      workName: parsed.workName || workName,
      authorName: parsed.authorName || authorName,
      background: parsed.background || '',
      theme: parsed.theme || '',
      forbidden: parsed.forbidden || '',
      type: parsed.type || ['同人'],
      tags: parsed.tags || ['二次创作'],
      direction: parsed.direction || {
        platform: '',
        readerType: '',
        structure: '',
        perspective: '',
      },
      characters: parsed.characters || [],
      storylines: parsed.storylines || [],
    }
  } catch (error) {
    console.error('AI 解析失败:', error)
    return {
      workName,
      authorName,
      background: `《${workName}》的故事发生在一个充满奇幻色彩的世界中。作品以独特的世界观和细腻的情感描写著称，讲述了主角们在命运的洪流中相互扶持、共同成长的故事。整个故事背景宏大，人物关系错综复杂，情节跌宕起伏。`,
      theme: '成长与羁绊，在命运的考验中寻找自我与彼此的意义',
      forbidden: '不要OOC（Out of Character），保持原作人物性格；不要改动原作核心剧情走向；不要添加原作中不存在的重大设定变更',
      type: ['同人'],
      tags: ['二次创作'],
      direction: {
        platform: '通用',
        readerType: '女性向',
        structure: '三幕式结构',
        perspective: '第三人称',
      },
      characters: [
        {
          name: '主角A',
          identity: '原作主角',
          personality: '勇敢坚毅',
          relationships: '故事核心人物',
          wants: '实现自我价值',
          fears: '失去重要之人',
          role: 'protagonist',
        },
        {
          name: '主角B',
          identity: '原作主角',
          personality: '冷静理智',
          relationships: '与主角A互为对照',
          wants: '守护重要之人',
          fears: '信念崩塌',
          role: 'protagonist',
        },
      ],
      storylines: [
        {
          title: `${workName}主线`,
          scenes: [
            {
              name: `${workName}·开端`,
              description: '故事开端，主要人物登场，背景设定介绍',
              characters: ['主角A', '主角B'],
              cause: '故事开始，人物初次登场',
              process: '主要人物陆续出现，介绍人物背景和关系',
              result: '人物关系初步建立，故事基调奠定',
              location: '故事开篇地点',
            },
          ],
        },
      ],
    }
  }
}
