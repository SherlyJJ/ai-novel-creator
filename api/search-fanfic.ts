import type { VercelRequest, VercelResponse } from '@vercel/node'
import axios from 'axios'
import * as cheerio from 'cheerio'

interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
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

  const { workName, authorName, sourceType = 'novel' } = req.body

  if (!workName) {
    return res.status(400).json({ error: 'workName is required' })
  }

  try {
    const typeLabels: Record<string, string> = {
      novel: '小说 人物介绍 剧情简介 主要角色 人物关系',
      tv_movie: '电视剧 电影 分集剧情 角色介绍 人物关系',
      anime: '动漫 动画 角色介绍 剧情',
    }

    const query = authorName 
      ? `${workName} ${authorName} ${typeLabels[sourceType] || ''}`
      : `${workName} ${typeLabels[sourceType] || ''}`

    const results = await bingSearch(query, 15)

    return res.status(200).json({ results })
  } catch (error) {
    console.error('搜索失败:', error)
    return res.status(500).json({ error: '搜索失败，请稍后重试' })
  }
}
