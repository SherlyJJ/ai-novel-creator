import type { Project, Review, ReviewSuggestion, ReviewScores, Character, Scene } from '@/types'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIOptions {
  temperature?: number
  maxTokens?: number
}

export interface UserAIConfig {
  apiUrl: string
  apiKey: string
  model: string
}

async function chatCompletion(
  messages: AIMessage[],
  options: AIOptions = {},
  config: UserAIConfig
): Promise<string> {
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`AI API error: ${response.status} ${errorText}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content || ''
}

export function buildNovelContext(project: Project): string {
  const { settings } = project
  const isFanfic = settings.fanfic?.isEnabled && settings.fanfic?.workName

  if (isFanfic) {
    const fanfic = settings.fanfic
    return `【创作模式】同人文
【原作名称】《${fanfic.workName}》${fanfic.authorName ? `\n【原作作者】${fanfic.authorName}` : ''}
【同人作品名】${settings.name}
【同人主题】${settings.theme}
${fanfic.characters ? `【原作主要人物】\n${fanfic.characters}` : ''}
${fanfic.plot ? `【原作故事梗概】\n${fanfic.plot}` : ''}
【创作方向】${settings.direction.perspective} · 目标读者：${settings.direction.readerType}
【作品类型】${settings.type.join('、')}
【禁忌要求】${settings.forbidden || '无'}`
  }

  return `【创作模式】原创
【作品名称】${settings.name}
【故事背景】${settings.background}
【主题立意】${settings.theme}
【创作方向】${settings.direction.perspective} · 目标读者：${settings.direction.readerType}
【作品类型】${settings.type.join('、')}
【标签】${settings.tags.join('、')}
【禁忌要求】${settings.forbidden || '无'}`
}

export async function generateSceneContent(
  project: Project,
  sceneName: string,
  sceneDescription: string,
  suggestedWordCount: number,
  previousSceneContent: string,
  config: UserAIConfig
): Promise<string> {
  const { settings, characters } = project
  const context = buildNovelContext(project)

  const characterInfo = characters
    .map((c) => `- ${c.name}（${c.role === 'protagonist' ? '主角' : '配角'}：${c.personality}；渴望：${c.wants}；恐惧：${c.fears}`)
    .join('\n')

  const systemPrompt = `你是一位文笔细腻、擅长人物塑造的小说作家，专门创作同人文短篇小说。你深谙原作人物性格，能够精准把握人物语气和情感发展，写出的文字流畅自然，有画面感和情感张力。

写作要求：
1. 严格保持原作人物性格，绝对不能OOC
2. 用场景化描写代替直白叙述
3. 注重人物心理活动和情感变化
4. 对话符合人物身份和性格
5. 每段文字要有细节和画面感
6. 字数约 ${suggestedWordCount} 字
7. 直接输出正文内容，不要任何标题、说明、解释等
8. 采用${settings.direction.perspective}叙事`

  const userPrompt = `${context}

【出场人物】
${characterInfo}

【当前场景】
场景名称：${sceneName}
场景梗概：${sceneDescription}

【前情回顾】
${previousSceneContent || '（故事刚开始）'}

请基于以上设定，创作这个场景的正文内容，字数约 ${suggestedWordCount} 字。要求：
- 直接输出正文，不要标题，不要任何说明文字
- 用生动的场景描写和人物对话
- 体现人物性格和情感发展
- 自然流畅，有画面感
- 与前后文衔接自然`

  const response = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.8, maxTokens: Math.max(suggestedWordCount * 2, 2000) },
    config
  )

  return response.trim()
}

export async function generateSceneDetail(
  project: Project,
  briefDescription: string,
  config: UserAIConfig
): Promise<{
  name: string
  description: string
  cause: string
  process: string
  result: string
  location: string
}> {
  const { settings, characters } = project
  const context = buildNovelContext(project)

  const characterList = characters.map((c) => `${c.name}（${c.role === 'protagonist' ? '主角' : '配角'}）`).join('、')

  const systemPrompt = `你是一位擅长拆解故事场景的编剧。你能根据用户的一句话描述，拆解出完整的场景卡片，包含场景名称、描述、起因、经过、结果、地点等全部要素。
要求：
1. 场景名称简洁有画面感（4-8字）
2. 场景描述80-150字，包含时间、地点、人物、事件的完整要素
3. 起因30-60字，说明什么原因导致这个场景发生
4. 经过60-120字，详细描述发生了什么，人物做了什么，对话要点，冲突如何发展
5. 结果30-60字，场景结束后发生了什么变化，对后续剧情有什么影响
6. 地点要具体，符合原作世界观
7. 人物尽量从给定的人物列表中选择
8. 严格保持原作人物性格`

  const userPrompt = `${context}

【可选用人物】
${characterList}

【用户一句话描述】
${briefDescription}

请根据以上设定，将这句话拆解为完整的场景卡。返回 JSON 格式：
{
  "name": "场景名称",
  "description": "场景完整描述，80-150字",
  "cause": "场景起因，30-60字",
  "process": "场景经过，60-120字",
  "result": "场景结果，30-60字",
  "location": "具体地点名称"
}

只返回 JSON，不要其他内容。`

  const response = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7, maxTokens: 1500 },
    config
  )

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.warn('解析场景详情JSON失败:', e)
  }

  return {
    name: briefDescription.slice(0, 8),
    description: briefDescription,
    cause: '故事推进到当前阶段',
    process: briefDescription,
    result: '为后续情节埋下伏笔',
    location: '原作世界中的某地',
  }
}

export async function generateStorylineScenes(
  project: Project,
  description: string,
  config: UserAIConfig
): Promise<{ name: string; description: string }[]> {
  const context = buildNovelContext(project)

  const systemPrompt = `你是一位擅长故事构思的编剧。根据用户的一句话描述，拆解出5-8个按时间顺序排列的场景，每个场景有名称和简短描述。场景之间要有逻辑衔接，前一个场景的结果是后一个场景的起因。`

  const userPrompt = `${context}

【故事线描述】
${description}

请拆解为5-8个按时间顺序排列的场景，返回 JSON 格式：
{
  "scenes": [
    { "name": "场景名称", "description": "场景简短描述（30-50字）" }
  ]
}

只返回 JSON，不要其他内容。`

  const response = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7, maxTokens: 2000 },
    config
  )

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.scenes || []
    }
  } catch (e) {
    console.warn('解析故事线场景JSON失败:', e)
  }

  return [
    { name: '开端', description: `故事开始：${description.slice(0, 40)}` },
    { name: '发展', description: '矛盾逐渐展开，人物关系发生变化。' },
    { name: '转折', description: '关键事件出现，局势发生逆转。' },
    { name: '高潮', description: '冲突达到顶点，人物做出重大选择。' },
    { name: '结局', description: '故事收束，悬念得到解答。' },
  ]
}

export async function generateCharacterBiography(
  character: Character,
  project: Project,
  config: UserAIConfig
): Promise<string> {
  const context = buildNovelContext(project)

  const systemPrompt = `你是一位擅长人物塑造的作家。根据人物的基本信息，撰写一段80-150字的人物传记，包含人物背景、性格特点、核心动机等。要生动有画面感，不要干巴巴的列表。`

  const userPrompt = `${context}

【人物信息】
姓名：${character.name}
身份/背景：${character.background || '未知'}
性格：${character.personality || '未知'}
渴望：${character.wants || '未知'}
恐惧：${character.fears || '未知'}

请为这个人物撰写一段80-150字的传记。直接输出传记内容，不要任何标题或说明。`

  const response = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7, maxTokens: 800 },
    config
  )

  return response.trim()
}

export async function generateNovelIntro(
  project: Project,
  config: UserAIConfig
): Promise<string> {
  const { settings, storylines, characters } = project
  const mainScenes = storylines.find((s) => s.type === 'main')?.scenes || []
  const isFanfic = settings.fanfic?.isEnabled && settings.fanfic?.workName

  const context = buildNovelContext(project)
  const characterList = characters.map((c) => c.name).join('、')
  const sceneList = mainScenes.map((s) => `「${s.name}」`).join('、')

  const systemPrompt = `你是一位擅长写故事简介的编辑。根据给定的设定，撰写一段150-250字的故事大纲/简介，要吸引人，有悬念，能勾起读者兴趣。`

  const userPrompt = `${context}

【主要人物】${characterList}
【关键情节】${sceneList}

请撰写一段150-250字的故事大纲/简介。直接输出简介内容，不要任何标题或说明。`

  const response = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7, maxTokens: 1500 },
    config
  )

  return response.trim()
}

export async function generateReview(
  project: Project,
  config: UserAIConfig
): Promise<Review> {
  const isFanfic = project.settings.fanfic?.isEnabled && project.settings.fanfic?.workName
  const context = buildNovelContext(project)

  const creationContent = project.creation?.content || '（暂无正文内容）'

  const systemPrompt = `你是一位专业的小说评鉴师，擅长从多个维度评估小说质量，并给出具体的改进建议。评分采用10分制。`

  const fanficDimensions = isFanfic
    ? `
- fidelity（原作还原度）：人物性格、世界观设定是否与原作一致，有没有OOC
- fanfic_coherence（同人衔接）：同人创作与原作情节的衔接是否自然合理`
    : ''

  const userPrompt = `${context}

【待评鉴正文】
${creationContent.slice(0, 8000)}

请从以下维度进行评鉴（每项1-10分）：
- logic（逻辑严谨性）：情节逻辑是否自洽，有没有BUG
- coherence（连贯性）：前后文衔接是否流畅，场景过渡是否自然
- rationality（合理性）：人物行为动机是否合理，情节发展是否符合人设
- consistency（一致性）：人物言行前后是否一致，设定有没有前后矛盾
- depth（深度）：人物刻画、主题表达有没有深度
- resonance（情感共鸣）：能不能打动读者，有没有代入感
- tension（张力）：冲突够不够强烈，有没有悬念感
- pacing（节奏）：叙事节奏是否得当，有没有拖沓或仓促${fanficDimensions}

返回 JSON 格式：
{
  "scores": {
    "logic": 7,
    "coherence": 7,
    "rationality": 7,
    "consistency": 7,
    "depth": 7,
    "fidelity": 7,
    "resonance": 7,
    "tension": 7,
    "pacing": 7,
    "fanfic_coherence": 7
  },
  "suggestions": ["建议1", "建议2", "建议3"],
  "dimensionSuggestions": {
    "logic": [{ "issue": "问题描述", "advice": "具体建议" }],
    "coherence": [{ "issue": "问题描述", "advice": "具体建议" }]
  }
}

只返回 JSON，不要其他内容。每个维度至少1条具体建议。`

  const response = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.5, maxTokens: 4000 },
    config
  )

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const scores = parsed.scores as ReviewScores

      const activeScoreKeys = isFanfic
        ? Object.keys(scores)
        : (Object.keys(scores) as (keyof ReviewScores)[]).filter(
            (k) => k !== 'fidelity' && k !== 'fanfic_coherence'
          )
      const overallScore = Math.round(
        activeScoreKeys.reduce((sum, key) => sum + (scores[key] || 0), 0) / activeScoreKeys.length
      )

      return {
        scores,
        overallScore,
        suggestions: parsed.suggestions || [],
        dimensionSuggestions: parsed.dimensionSuggestions || {},
        generatedAt: Date.now(),
      }
    }
  } catch (e) {
    console.warn('解析评鉴JSON失败:', e)
  }

  const scores: ReviewScores = {
    logic: 7,
    coherence: 7,
    rationality: 7,
    consistency: 7,
    depth: 7,
    fidelity: isFanfic ? 7 : 0,
    resonance: 7,
    tension: 7,
    pacing: 7,
    fanfic_coherence: isFanfic ? 7 : 0,
  }

  const scoreKeys = Object.keys(scores) as (keyof ReviewScores)[]
  const activeScores = isFanfic
    ? Object.values(scores)
    : scoreKeys.filter((k) => k !== 'fidelity' && k !== 'fanfic_coherence').map((k) => scores[k])
  const overallScore = Math.round(activeScores.reduce((a, b) => a + b, 0) / activeScores.length)

  return {
    scores,
    overallScore,
    suggestions: ['建议增加更多心理描写', '建议优化场景过渡', '建议加强冲突张力'],
    dimensionSuggestions: {},
    generatedAt: Date.now(),
  }
}

export async function generateDimensionSuggestions(
  project: Project,
  dimension: keyof ReviewScores,
  config: UserAIConfig
): Promise<ReviewSuggestion[]> {
  const review = await generateReview(project, config)
  return review.dimensionSuggestions?.[dimension] || []
}
