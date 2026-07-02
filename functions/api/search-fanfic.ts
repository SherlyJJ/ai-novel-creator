interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
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

export async function onRequest(context: { request: Request }) {
  const { request } = context

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: { workName?: string; authorName?: string; sourceType?: string }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { workName, authorName, sourceType = 'novel' } = body

  if (!workName) {
    return new Response(JSON.stringify({ error: 'workName is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const typeLabels: Record<string, string> = {
    novel: '小说 人物介绍 剧情简介 主要角色 人物关系',
    tv_movie: '电视剧 电影 分集剧情 角色介绍 人物关系',
    anime: '动漫 动画 角色介绍 剧情',
  }

  const query = authorName
    ? `${workName} ${authorName} ${typeLabels[sourceType] || ''}`
    : `${workName} ${typeLabels[sourceType] || ''}`

  try {
    const bingResponse = await fetch(
      `https://cn.bing.com/search?q=${encodeURIComponent(query)}&count=15`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      }
    )

    if (!bingResponse.ok) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const html = await bingResponse.text()
    const results = extractSearchResults(html, 15)

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}