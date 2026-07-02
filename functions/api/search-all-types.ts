interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
}

interface SourceTypeAvailability {
  novel: boolean
  tv_movie: boolean
  anime: boolean
}

interface SearchResultsByType {
  novel: SearchResult[]
  tv_movie: SearchResult[]
  anime: SearchResult[]
  availability: SourceTypeAvailability
  workExists: boolean
  adaptationNames?: string[]
}

function extractSearchResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = []

  const blocks = html.split(/<li class="b_algo"/g).slice(1)
  if (blocks.length === 0) {
    const altBlocks = html.split(/class="b_algo"/g).slice(1)
    for (const block of altBlocks) {
      if (results.length >= maxResults) break
      const titleMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : ''
      const urlMatch = block.match(/href="(https?:\/\/[^"]+)"/i)
      const url = urlMatch ? urlMatch[1] : ''
      const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : ''
      if (title && url) results.push({ title, url, snippet, source: '必应' })
    }
    return results
  }

  for (const block of blocks) {
    if (results.length >= maxResults) break
    const titleMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : ''
    const urlMatch = block.match(/href="(https?:\/\/[^"]+)"/i)
    const url = urlMatch ? urlMatch[1] : ''
    const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
    const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : ''
    if (title && url) results.push({ title, url, snippet, source: '必应' })
  }

  return results
}

async function bingSearch(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `https://cn.bing.com/search?q=${encodeURIComponent(query)}&count=${maxResults}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      }
    )
    if (!response.ok) return []
    const html = await response.text()
    return extractSearchResults(html, maxResults)
  } catch {
    return []
  }
}

function dedupeResults(results: SearchResult[]): SearchResult[] {
  return results.filter((r, i, arr) => arr.findIndex((t) => t.title === r.title) === i)
}

export async function onRequest(context: { request: Request }) {
  const { request } = context

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: { workName?: string; authorName?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { workName, authorName } = body

  if (!workName) {
    return new Response(JSON.stringify({ error: 'workName is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const workNameLower = workName.toLowerCase().replace(/\s/g, '')

  try {
    // 搜索原著小说
    const novelQuery = authorName
      ? `${workName} ${authorName} 小说 人物介绍 剧情简介 主要角色 人物关系`
      : `${workName} 小说 人物介绍 剧情简介 主要角色 人物关系`

    const novelResults = await bingSearch(novelQuery, 15)

    const novelTypeKeywords = ['小说', '人物介绍', '剧情简介', '作者', '晋江', '起点', '豆瓣读书', '书', '章节', '阅读', '百度百科', '百科', '故事', '角色']
    const novelExcludeKeywords = ['人民政府', '县政府', '区政府', '市政府', '人民法院', '人民检察院']
    const videoKeywords = ['在线观看', '高清观看', '免费观看', '全集观看', '视频', '爱奇艺', '腾讯视频', '优酷', '芒果', '哔哩哔哩', 'bilibili', '高清完整版', '完整版', '手机观看', '迅雷下载']

    const filteredNovelResults = novelResults.filter((r) => {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const snippetLower = r.snippet.toLowerCase().replace(/\s/g, '')
      const hasWorkName = titleLower.includes(workNameLower) || snippetLower.includes(workNameLower)
      const hasExcludeKeyword = novelExcludeKeywords.some((kw) => titleLower.includes(kw))
      if (hasExcludeKeyword) return false
      const hasVideoKeyword = videoKeywords.some((kw) => titleLower.includes(kw))
      if (hasVideoKeyword) return false
      const hasNovelKeyword = novelTypeKeywords.some((kw) => titleLower.includes(kw) || snippetLower.includes(kw))
      return hasWorkName && hasNovelKeyword
    })

    const novel = filteredNovelResults.length > 0
      ? filteredNovelResults
      : novelResults.slice(0, 5).filter((r) => {
          const titleLower = r.title.toLowerCase().replace(/\s/g, '')
          const hasExcludeKeyword = novelExcludeKeywords.some((kw) => titleLower.includes(kw))
          return !hasExcludeKeyword
        })

    let novelRelevantCount = 0
    for (const r of novel) {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const snippetLower = r.snippet.toLowerCase().replace(/\s/g, '')
      const hasWorkName = titleLower.includes(workNameLower) || snippetLower.includes(workNameLower)
      const hasTypeKeyword = novelTypeKeywords.some((kw) => titleLower.includes(kw) || snippetLower.includes(kw))
      if (hasWorkName && hasTypeKeyword) novelRelevantCount++
    }

    if (novelRelevantCount < 1) {
      return new Response(
        JSON.stringify({
          novel: [],
          tv_movie: [],
          anime: [],
          availability: { novel: false, tv_movie: false, anime: false },
          workExists: false,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 搜索电视剧/电影
    const tvMovieQueries = [
      `${workName} 改编 电视剧`,
      `${workName} 影视化`,
      `${workName} 电视剧`,
      `${workName} 网剧`,
    ]
    let allTvMovieResults: SearchResult[] = []
    for (const query of tvMovieQueries) {
      const results = await bingSearch(query, 6)
      allTvMovieResults = [...allTvMovieResults, ...results]
    }
    const uniqueTvMovieResults = dedupeResults(allTvMovieResults)

    // 提取改编剧名称
    const adaptationNames: string[] = []
    for (const r of uniqueTvMovieResults) {
      const text = r.title + ' ' + r.snippet
      const renamedMatch = text.match(/改名(?:为|叫|作)?[《【]([^》】]+)[》】]/)
      if (renamedMatch && renamedMatch[1]) {
        const name = renamedMatch[1]
        if (name.length >= 2 && !name.includes('小说')) {
          adaptationNames.push(name)
        }
      }
    }
    const uniqueAdaptationNames = [...new Set(adaptationNames)].slice(0, 5)

    // 搜索分集剧情
    const allSearchNames = [workName, ...uniqueAdaptationNames]
    const tvMovieDetailQueries: string[] = []
    for (const name of allSearchNames) {
      tvMovieDetailQueries.push(`${name} 分集剧情`)
      tvMovieDetailQueries.push(`${name} 剧情介绍`)
      tvMovieDetailQueries.push(`${name} 角色介绍`)
    }

    for (const query of tvMovieDetailQueries) {
      const results = await bingSearch(query, 6)
      allTvMovieResults = [...allTvMovieResults, ...results]
    }
    const uniqueAllTvMovieResults = dedupeResults(allTvMovieResults)

    const tvMovieTypeKeywords = ['分集剧情', '剧情介绍', '电视剧', '电影', '演员表', '角色介绍', '改编', '网剧', '剧集', '人物关系', '剧情简介', '全集剧情']
    const tvVideoKeywords = ['在线观看', '高清观看', '免费观看', '全集观看', '视频', '爱奇艺', '腾讯视频', '优酷', '芒果', '哔哩哔哩', 'bilibili']
    const novelKeywords = ['小说', '全文阅读', '最新章节', '免费阅读', '晋江文学城']

    const finalTvMovieResults = uniqueAllTvMovieResults.filter((r) => {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const snippetLower = r.snippet.toLowerCase().replace(/\s/g, '')
      const hasWorkName = titleLower.includes(workNameLower) || snippetLower.includes(workNameLower)
      const hasAdaptedName = uniqueAdaptationNames.some((name) =>
        titleLower.includes(name.toLowerCase().replace(/\s/g, ''))
      )
      const titleHasTvKeyword = tvMovieTypeKeywords.some((kw) => titleLower.includes(kw))
      const titleHasVideoKeyword = tvVideoKeywords.some((kw) => titleLower.includes(kw))
      const titleHasNovelKeyword = novelKeywords.some((kw) => titleLower.includes(kw))

      if (titleHasNovelKeyword && !titleHasTvKeyword) return false
      if (titleHasVideoKeyword && !titleHasTvKeyword) return false

      const hasTvKeyword = titleHasTvKeyword || tvMovieTypeKeywords.some((kw) => snippetLower.includes(kw))
      if (!hasTvKeyword) return false

      if (hasWorkName) return true
      if (hasAdaptedName) return true
      return false
    })

    let tvMovieRelevantCount = 0
    for (const r of finalTvMovieResults) {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const snippetLower = r.snippet.toLowerCase().replace(/\s/g, '')
      const hasWorkName = titleLower.includes(workNameLower) || snippetLower.includes(workNameLower)
      const hasAdaptedName = uniqueAdaptationNames.some((name) =>
        titleLower.includes(name.toLowerCase().replace(/\s/g, ''))
      )
      const hasTypeKeyword = tvMovieTypeKeywords.some((kw) => titleLower.includes(kw) || snippetLower.includes(kw))
      if ((hasWorkName || hasAdaptedName) && hasTypeKeyword) tvMovieRelevantCount++
    }

    // 搜索动漫
    const animeQueries = [
      `${workName} 动漫`,
      `${workName} 动画`,
      `${workName} 国漫`,
      `${workName} 动画化`,
    ]
    let allAnimeResults: SearchResult[] = []
    for (const query of animeQueries) {
      const results = await bingSearch(query, 5)
      allAnimeResults = [...allAnimeResults, ...results]
    }
    const uniqueAnimeResults = dedupeResults(allAnimeResults)

    const animeTypeKeywords = ['动漫', '动画', '国漫', '日漫', '动画化', '番剧', '二次元']
    let animeRelevantCount = 0
    for (const r of uniqueAnimeResults) {
      const titleLower = r.title.toLowerCase().replace(/\s/g, '')
      const snippetLower = r.snippet.toLowerCase().replace(/\s/g, '')
      const hasWorkName = titleLower.includes(workNameLower) || snippetLower.includes(workNameLower)
      const titleHasAnime = animeTypeKeywords.some((kw) => titleLower.includes(kw))
      const snippetHasAnime = animeTypeKeywords.some((kw) => snippetLower.includes(kw))
      if (hasWorkName && (titleHasAnime || snippetHasAnime)) animeRelevantCount++
    }

    return new Response(
      JSON.stringify({
        novel,
        tv_movie: finalTvMovieResults,
        anime: uniqueAnimeResults,
        availability: {
          novel: novelRelevantCount >= 1,
          tv_movie: tvMovieRelevantCount >= 1,
          anime: animeRelevantCount >= 1,
        },
        workExists: true,
        adaptationNames: uniqueAdaptationNames,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch {
    return new Response(
      JSON.stringify({
        novel: [],
        tv_movie: [],
        anime: [],
        availability: { novel: true, tv_movie: true, anime: true },
        workExists: true,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }
}