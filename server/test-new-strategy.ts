import axios from 'axios'
import * as cheerio from 'cheerio'

async function searchBaidu(query: string, maxResults = 10) {
  try {
    const response = await axios.get('https://www.baidu.com/s', {
      params: { wd: query, rn: maxResults },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.baidu.com/',
      },
      timeout: 10000,
    })
    
    const $ = cheerio.load(response.data)
    const results: { title: string; snippet: string }[] = []
    
    $('.result').each((_, el) => {
      const $el = $(el)
      const title = $el.find('h3').text().trim() || $el.find('.t').text().trim()
      const snippet = $el.find('.c-abstract').text().trim() || $el.find('.abstract').text().trim()
      if (title) {
        results.push({ title, snippet })
      }
    })
    
    return results
  } catch (e) {
    console.error(`搜索失败: ${e}`)
    return []
  }
}

async function testNewStrategy() {
  console.log('=== 测试新的电视剧/电影检测策略 ===\n')
  
  const workName = '默读'
  const authorName = 'priest'
  
  // 1. 检测原著小说
  console.log('【原著小说检测】')
  const novelResults = await searchBaidu(`${workName} ${authorName} 小说 人物介绍`)
  const novelHasWorkName = novelResults.filter(r => 
    r.title.includes(workName) || r.snippet.includes(workName)
  )
  const novelHasTypeKeyword = novelResults.filter(r => 
    /小说|novel|原著|人物介绍|剧情简介/i.test(r.title + r.snippet)
  )
  console.log(`结果数: ${novelResults.length}, 含作品名: ${novelHasWorkName.length}, 含类型关键词: ${novelHasTypeKeyword.length}`)
  const novelAvailable = novelHasWorkName.length > 0 && novelHasTypeKeyword.length > 0
  console.log(`判定: ${novelAvailable ? '✅ 可用' : '❌ 不可用'}\n`)
  
  // 2. 检测电视剧/电影（包含改名改编检测）
  console.log('【电视剧/电影检测】')
  const tvMovieQueries = [
    `${workName} ${authorName} 电视剧`,
    `${workName} ${authorName} 电影`,
    `${workName} 改编 电视剧`,  // 检测改名改编
    `${workName} 改编 电影`,   // 检测改名改编
  ]
  
  let allTvMovieResults: { title: string; snippet: string }[] = []
  
  for (const query of tvMovieQueries) {
    console.log(`搜索: ${query}`)
    const results = await searchBaidu(query)
    console.log(`  找到 ${results.length} 个结果`)
    if (results.length > 0) {
      results.forEach((r, i) => {
        if (i < 2) console.log(`    ${i + 1}. ${r.title}`)
      })
      if (results.length > 2) console.log(`    ... 等 ${results.length - 2} 个更多`)
    }
    allTvMovieResults = [...allTvMovieResults, ...results]
  }
  
  // 去重
  const uniqueResults = allTvMovieResults.filter((r, index, self) => 
    index === self.findIndex(t => t.title === r.title)
  )
  
  // 检查是否有改编剧信息（如光·渊）
  const adaptationResults = uniqueResults.filter(r => 
    /光渊|光·渊|深渊|改编/i.test(r.title + r.snippet)
  )
  if (adaptationResults.length > 0) {
    console.log(`\n发现改编剧信息:`)
    adaptationResults.forEach(r => console.log(`  - ${r.title}`))
  }
  
  const tvMovieHasWorkName = uniqueResults.filter(r => 
    r.title.includes(workName) || r.snippet.includes(workName) ||
    r.title.includes('光渊') || r.title.includes('光·渊') || r.title.includes('深渊') ||
    r.snippet.includes('光渊') || r.snippet.includes('光·渊') || r.snippet.includes('深渊')
  )
  const tvMovieHasTypeKeyword = uniqueResults.filter(r => 
    /电视剧|电影|tv|movie|分集剧情|剧情介绍|演员表|改编/i.test(r.title + r.snippet)
  )
  console.log(`\n合并后总结果: ${uniqueResults.length}`)
  console.log(`含作品名或改编名: ${tvMovieHasWorkName.length}`)
  console.log(`含类型关键词: ${tvMovieHasTypeKeyword.length}`)
  const tvMovieAvailable = tvMovieHasWorkName.length > 0 && tvMovieHasTypeKeyword.length > 0
  console.log(`判定: ${tvMovieAvailable ? '✅ 可用' : '❌ 不可用'}\n`)
  
  // 3. 检测动漫
  console.log('【动漫检测】')
  const animeResults = await searchBaidu(`${workName} ${authorName} 动漫 动画`)
  const animeHasWorkName = animeResults.filter(r => 
    r.title.includes(workName) || r.snippet.includes(workName)
  )
  const animeHasTypeKeyword = animeResults.filter(r => 
    /动漫|动画|animation|anime/i.test(r.title + r.snippet)
  )
  console.log(`结果数: ${animeResults.length}, 含作品名: ${animeHasWorkName.length}, 含类型关键词: ${animeHasTypeKeyword.length}`)
  const animeAvailable = animeHasWorkName.length > 0 && animeHasTypeKeyword.length > 0
  console.log(`判定: ${animeAvailable ? '✅ 可用' : '❌ 不可用'}`)
}

testNewStrategy()