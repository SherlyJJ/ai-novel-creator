import type { VercelRequest, VercelResponse } from '@vercel/node'
import axios from 'axios'
import * as cheerio from 'cheerio'

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

async function bingSearch(query: string, maxResults = 15): Promise<SearchResult[]> {
  try {
    const response = await axios.get('https://cn.bing.com/search', {
      params: {
        q: query,
        count: maxResults,
        first: 1,
        form: 'QBLH',
        sp: '-1',
        pq: query,
        sc: '0-10',
        sk: '',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://cn.bing.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      timeout: 15000,
    })

    const $ = cheerio.load(response.data)
    const results: SearchResult[] = []

    $('#b_results .b_algo').each((_, el) => {
      if (results.length >= maxResults) return
      const $el = $(el)
      
      const title = $el.find('h2').text().trim() || $el.find('a').first().text().trim()
      const url = $el.find('a').first().attr('href') || ''
      const snippet = $el.find('.b_caption p').text().trim() || $el.find('.b_snippet').text().trim()

      if (title && url) {
        results.push({
          title,
          url,
          snippet,
          source: '必应',
        })
      }
    })

    if (results.length === 0) {
      $('.b_algo').each((_, el) => {
        if (results.length >= maxResults) return
        const $el = $(el)
        const title = $el.find('h2').text().trim() || $el.find('a').first().text().trim()
        const url = $el.find('a').first().attr('href') || ''
        const snippet = $el.find('.b_caption p').text().trim() || $el.find('.b_snippet').text().trim()

        if (title && url) {
          results.push({
            title,
            url,
            snippet,
            source: '必应',
          })
        }
      })
    }

    return results
  } catch (e) {
    console.warn('必应搜索失败:', e)
    return []
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { workName, authorName } = req.body

  if (!workName) {
    return res.status(400).json({ error: 'workName is required' })
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
    // 搜索原著小说
    const novelQuery = authorName 
      ? `${workName} ${authorName} 小说 人物介绍 剧情简介 主要角色 人物关系`
      : `${workName} 小说 人物介绍 剧情简介 主要角色 人物关系`
    
    const novelResults = await bingSearch(novelQuery, 15)
    
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
      return res.status(200).json({ ...result, workExists: false })
    }
    result.workExists = true
    result.availability.novel = novelRelevantCount >= 1

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
    const uniqueTvMovieResults = allTvMovieResults.filter((r, index, self) =>
      index === self.findIndex(t => t.title === r.title)
    )

    // 提取改编剧名称
    const adaptationNames: string[] = []
    for (const r of uniqueTvMovieResults) {
      const text = r.title + ' ' + r.snippet
      const renamedMatch = text.match(/改名(为|叫|作)?[《【]([^》】]+)[》】]/)
      if (renamedMatch && renamedMatch[2]) {
        const name = renamedMatch[2]
        if (name.length >= 2 && !name.includes('小说')) {
          adaptationNames.push(name)
        }
      }
    }
    
    result.adaptationNames = [...new Set(adaptationNames)].slice(0, 5)

    // 搜索分集剧情
    const allSearchNames = [workName, ...result.adaptationNames]
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
    const uniqueAllTvMovieResults = allTvMovieResults.filter((r, index, self) =>
      index === self.findIndex(t => t.title === r.title)
    )

    const tvMovieTypeKeywords = ['分集剧情', '剧情介绍', '电视剧', '电影', 'tv', 'movie', '演员表', '角色介绍', '改编', '网剧', '剧集', '人物关系', '剧情简介', '全集剧情']
    const tvVideoKeywords = ['在线观看', '高清观看', '免费观看', '全集观看', '视频', '爱奇艺', '腾讯视频', '优酷', '芒果', '哔哩哔哩', 'bilibili']
    const novelKeywords = ['小说', '全文阅读', '最新章节', '免费阅读', '晋江文学城']
    
    const finalTvMovieResults = uniqueAllTvMovieResults.filter(r => {
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
      if (hasAdaptedName) return true
      return false
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

    return res.status(200).json(result)
  } catch (error) {
    console.error('搜索失败:', error)
    return res.status(200).json({
      novel: [],
      tv_movie: [],
      anime: [],
      availability: { novel: true, tv_movie: true, anime: true },
      workExists: true,
    })
  }
}
