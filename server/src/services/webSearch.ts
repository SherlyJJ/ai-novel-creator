import axios from 'axios'
import * as cheerio from 'cheerio'

export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
}

/**
 * 使用必应搜索（国内可访问，反爬相对宽松）
 */
export async function duckduckgoSearch(query: string, maxResults = 15): Promise<SearchResult[]> {
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

/**
 * 抓取网页正文内容
 */
export async function fetchWebContent(url: string): Promise<{ title: string; content: string; url: string } | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      timeout: 15000,
      responseType: 'arraybuffer',
    })

    const contentType = String(response.headers['content-type'] || '')
    let html: string
    if (contentType.includes('charset=gbk') || contentType.includes('charset=gb2312')) {
      const decoder = new TextDecoder('gbk')
      html = decoder.decode(response.data as Buffer)
    } else {
      const decoder = new TextDecoder('utf-8')
      html = decoder.decode(response.data as Buffer)
    }

    const $ = cheerio.load(html)

    $('script, style, noscript, iframe, nav, header, footer, aside, .nav, .menu, .sidebar, .ad, .ads, .advertisement').remove()

    const pageTitle = $('title').text().trim()

    let mainContent = ''
    const selectors = [
      'article',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      '.main-content',
      '#content',
      'main',
      '.paragraph',
      '.text',
      'body',
    ]

    for (const selector of selectors) {
      const $el = $(selector)
      if ($el.length > 0) {
        const text = $el.text().trim()
        if (text.length > mainContent.length) {
          mainContent = text
        }
      }
    }

    if (!mainContent) {
      mainContent = $('body').text().trim()
    }

    mainContent = mainContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()

    return {
      title: pageTitle,
      content: mainContent,
      url,
    }
  } catch {
    return null
  }
}

/**
 * 针对百科类网站的优化抓取
 */
export async function fetchBaikeContent(url: string): Promise<{ title: string; content: string; url: string } | null> {
  try {
    const result = await fetchWebContent(url)
    if (!result) return null

    let { content } = result
    const lines = content.split(/[。！？\.]/).filter((l) => l.trim().length > 10)
    content = lines.join('。\n')

    return {
      ...result,
      content: content.slice(0, 15000),
    }
  } catch {
    return null
  }
}

/**
 * 搜索并抓取相关网页内容
 * 优先抓取百科类、知识类网站的内容
 */
export async function searchAndFetch(query: string, maxPages = 10): Promise<{ title: string; content: string; url: string }[]> {
  const searchResults = await duckduckgoSearch(query, 15)
  if (searchResults.length === 0) return []

  const priorityDomains = [
    'baike.baidu.com',
    'zh.wikipedia.org',
    'baike.com',
    'douban.com',
    'zhihu.com',
    'qidian.com',
    'jjwxc.net',
    'book.douban.com',
    'movie.douban.com',
    'baike.so.com',
    'baike.sogou.com',
    'xiaohongshu.com',
    'bilibili.com',
    'iqiyi.com',
    'youku.com',
    'qq.com/tv',
    'mgtv.com',
  ]

  const priorityUrls = searchResults
    .filter((r) => priorityDomains.some((domain) => r.url.toLowerCase().includes(domain)))

  const otherUrls = searchResults
    .filter((r) => !priorityUrls.some((p) => p.url === r.url))

  const allUrls = [...priorityUrls, ...otherUrls].slice(0, maxPages).map((r) => r.url)

  const contents: { title: string; content: string; url: string }[] = []
  for (const url of allUrls) {
    const result = await fetchBaikeContent(url)
    if (result && result.content.length > 200) {
      contents.push(result)
    }
  }

  return contents
}
