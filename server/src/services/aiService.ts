import type { Project, Review, ReviewSuggestion, ReviewScores } from '../types/index.js'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIOptions {
  temperature?: number
  maxTokens?: number
}

// 服务端环境变量（作为默认/回退配置）
const SERVER_AI_API_URL = process.env.AI_API_URL
const SERVER_AI_API_KEY = process.env.AI_API_KEY
const SERVER_AI_MODEL = process.env.AI_MODEL || 'deepseek-chat'

/**
 * 用户级 AI 配置（从请求头中获取）
 */
export interface UserAIConfig {
  apiUrl: string
  apiKey: string
  model: string
}

/**
 * 从 Express 请求头中提取用户的 AI 配置
 */
export function extractAIConfigFromHeaders(req: { headers: Record<string, string | string[] | undefined> }): UserAIConfig | null {
  const apiKey = req.headers['x-ai-api-key']
  const apiUrl = req.headers['x-ai-api-url']
  const model = req.headers['x-ai-model']

  if (typeof apiKey === 'string' && apiKey) {
    return {
      apiKey,
      apiUrl: typeof apiUrl === 'string' && apiUrl ? apiUrl : 'https://api.deepseek.com/v1/chat/completions',
      model: typeof model === 'string' && model ? model : 'deepseek-chat',
    }
  }
  return null
}

/**
 * 调用 AI API（兼容 OpenAI 格式）
 * 优先使用用户配置，回退到服务端环境变量
 */
export async function chatCompletion(
  messages: AIMessage[],
  options: AIOptions = {},
  userConfig?: UserAIConfig | null
): Promise<string> {
  const apiUrl = userConfig?.apiUrl || SERVER_AI_API_URL
  const apiKey = userConfig?.apiKey || SERVER_AI_API_KEY
  const model = userConfig?.model || SERVER_AI_MODEL

  if (!apiUrl || !apiKey) {
    throw new Error('AI_API_URL and AI_API_KEY must be configured to use real AI')
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
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

/**
 * 检查 AI 是否已配置（用户级或服务端级）
 */
export function isAIConfigured(userConfig?: UserAIConfig | null): boolean {
  if (userConfig) return Boolean(userConfig.apiKey)
  return Boolean(SERVER_AI_API_URL && SERVER_AI_API_KEY)
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

// Real AI generation functions

export async function generateSceneContent(
  project: Project,
  sceneName: string,
  sceneDescription: string,
  suggestedWordCount: number,
  previousSceneContent: string,
  userConfig?: UserAIConfig | null
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
    userConfig
  )

  return response.trim()
}

export async function generateSceneDetail(
  project: Project,
  briefDescription: string,
  userConfig?: UserAIConfig | null
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
    userConfig
  )

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.warn('解析场景详情JSON失败:', e)
  }

  // fallback
  return {
    name: briefDescription.slice(0, 8),
    description: briefDescription,
    cause: '故事推进到当前阶段',
    process: briefDescription,
    result: '为后续情节埋下伏笔',
    location: '原作世界中的某地',
  }
}

// Mock implementations for development before AI is configured

export async function generateNovelIntroMock(project: Project): Promise<string> {
  const { settings, storylines, characters } = project
  const mainScenes = storylines.find((s) => s.type === 'main')?.scenes || []
  const isFanfic = settings.fanfic?.isEnabled && settings.fanfic?.workName

  if (isFanfic) {
    const fanfic = settings.fanfic
    return `《${settings.name}》是基于《${fanfic.workName}》${fanfic.authorName ? `（${fanfic.authorName} 著）` : ''}的同人文作品。${settings.theme}。故事以${settings.direction.perspective}展开，目标读者为${settings.direction.readerType}。主要人物包括${characters.map((c) => c.name).join('、')}，他们在原作世界观的基础上，经历${mainScenes.map((s) => `「${s.name}」`).join('、')}等关键情节，展开一段全新的故事。`
  }

  return `《${settings.name}》是一部${settings.type.join('、')}风格的小说。${settings.theme}。故事以${settings.direction.perspective}展开，目标读者为${settings.direction.readerType}。主要人物包括${characters.map((c) => c.name).join('、')}，他们在${settings.background}的世界中，经历${mainScenes.map((s) => `「${s.name}」`).join('、')}等关键情节，最终走向高潮与结局。`
}

export async function generateSceneContentMock(
  project: Project,
  sceneName: string,
  sceneDescription: string,
  _suggestedWordCount: number
): Promise<string> {
  const { settings } = project
  const isFanfic = settings.fanfic?.isEnabled && settings.fanfic?.workName

  if (isFanfic) {
    const fanfic = settings.fanfic
    return `（这是「${sceneName}」的 AI 生成正文占位。请在服务端配置 AI_API_URL 和 AI_API_KEY 以启用真实生成。）\n\n【同人文模式】基于原作《${fanfic.workName}》创作\n${settings.theme}\n\n场景在原作世界观中展开：${sceneDescription || '人物之间的关系逐渐紧张，冲突推向新的阶段。'}`
  }

  return `（这是「${sceneName}」的 AI 生成正文占位。请在服务端配置 AI_API_URL 和 AI_API_KEY 以启用真实生成。）\n\n${settings.theme}\n\n场景在${settings.background}中展开：${sceneDescription || '人物之间的关系逐渐紧张，冲突推向新的阶段。'}`
}

export async function generateReviewMock(project: Project): Promise<Review> {
  const isFanfic = project.settings.fanfic?.isEnabled && project.settings.fanfic?.workName

  const scores: ReviewScores = {
    logic: 7,
    coherence: 7,
    rationality: 7,
    consistency: 7,
    depth: 7,
    fidelity: isFanfic ? 7 : 0, // 同人文专用维度
    resonance: 7,
    tension: 7,
    pacing: 7,
    fanfic_coherence: isFanfic ? 7 : 0, // 同人文专用维度
  }

  // 计算总分时排除同人专用维度（如果不是同人文）
  const scoreKeys = Object.keys(scores) as (keyof ReviewScores)[]
  const activeScores = isFanfic
    ? Object.values(scores)
    : scoreKeys.filter((k) => k !== 'fidelity' && k !== 'fanfic_coherence').map((k) => scores[k])
  const overallScore = Math.round(activeScores.reduce((a, b) => a + b, 0) / activeScores.length)

  const dimensionSuggestions: Record<keyof ReviewScores, ReviewSuggestion[]> = {
    logic: [{
      id: 'mock-logic-1',
      dimension: 'logic',
      module: 'storylines',
      targetId: project.storylines[0]?.id,
      targetName: project.storylines[0]?.name,
      issue: '故事线逻辑存在可优化空间。',
      advice: '检查主线场景之间的因果关系，确保每个转折都有充分铺垫。',
      applied: false,
      generatedAt: Date.now(),
    }],
    coherence: [{
      id: 'mock-coherence-1',
      dimension: 'coherence',
      module: 'scenes',
      issue: '部分场景过渡可更自然。',
      advice: '在场景切换时增加情绪或动作承接。',
      applied: false,
      generatedAt: Date.now(),
    }],
    rationality: [{
      id: 'mock-rationality-1',
      dimension: 'rationality',
      module: 'characters',
      issue: '人物动机可进一步合理化。',
      advice: '为核心人物增加更多背景铺垫，使行为更符合人设。',
      applied: false,
      generatedAt: Date.now(),
    }],
    consistency: [{
      id: 'mock-consistency-1',
      dimension: 'consistency',
      module: 'characters',
      issue: '人物言行前后一致性可加强。',
      advice: '复核关键人物在前后场景中的语言风格与决策逻辑。',
      applied: false,
      generatedAt: Date.now(),
    }],
    depth: [{
      id: 'mock-depth-1',
      dimension: 'depth',
      module: 'characters',
      issue: '人物内心刻画有提升空间。',
      advice: '增加关键人物的独白或回忆，丰富人物弧光。',
      applied: false,
      generatedAt: Date.now(),
    }],
    fidelity: isFanfic ? [{
      id: 'mock-fidelity-1',
      dimension: 'fidelity',
      module: 'characters',
      issue: '人物性格与原作还原度可提升。',
      advice: '对照原作中该人物的经典台词和行为模式，确保同人创作中的人物言行不偏离原作设定。',
      applied: false,
      generatedAt: Date.now(),
    }] : [],
    resonance: [{
      id: 'mock-resonance-1',
      dimension: 'resonance',
      module: 'creation',
      issue: '情感共鸣可进一步放大。',
      advice: '在高潮场景前铺垫更多情感细节，让读者更容易代入。',
      applied: false,
      generatedAt: Date.now(),
    }],
    tension: [{
      id: 'mock-tension-1',
      dimension: 'tension',
      module: 'storylines',
      issue: '冲突张力可进一步提升。',
      advice: '增加反制力量或限时压力，让冲突更尖锐。',
      applied: false,
      generatedAt: Date.now(),
    }],
    pacing: [{
      id: 'mock-pacing-1',
      dimension: 'pacing',
      module: 'scenes',
      issue: '部分场景节奏略显拖沓。',
      advice: '压缩过渡场景，加快关键情节推进。',
      applied: false,
      generatedAt: Date.now(),
    }],
    fanfic_coherence: isFanfic ? [{
      id: 'mock-fanfic-coherence-1',
      dimension: 'fanfic_coherence',
      module: 'storylines',
      issue: '与原作情节的衔接可更自然。',
      advice: '检查同人创作与原作情节的衔接点，确保时间线、人物关系、事件脉络与原作保持一致或合理延伸。',
      applied: false,
      generatedAt: Date.now(),
    }] : [],
  }

  return {
    scores,
    overallScore,
    suggestions: Object.values(dimensionSuggestions).flat().map((s) => s.advice),
    dimensionSuggestions,
    generatedAt: Date.now(),
  }
}

export async function generateDimensionSuggestionsMock(
  project: Project,
  dimension: keyof ReviewScores
): Promise<ReviewSuggestion[]> {
  const review = await generateReviewMock(project)
  return review.dimensionSuggestions?.[dimension] || []
}

export async function generateStorylineScenesMock(_project: Project, description: string): Promise<{ name: string; description: string }[]> {
  return [
    { name: '开端', description: `故事开始：${description.slice(0, 40)}` },
    { name: '发展', description: '矛盾逐渐展开，人物关系发生变化。' },
    { name: '转折', description: '关键事件出现，局势发生逆转。' },
    { name: '高潮', description: '冲突达到顶点，人物做出重大选择。' },
    { name: '结局', description: '故事收束，悬念得到解答。' },
  ]
}

export async function generateSceneDetailMock(project: Project, briefDescription: string): Promise<{
  name: string
  description: string
  cause: string
  process: string
  result: string
  location: string
}> {
  const firstChar = project.characters[0]?.name || '主角'
  return {
    name: briefDescription.slice(0, 8) || '新场景',
    description: `${briefDescription}。在这个场景中，${firstChar}与其他人物相遇，事件开始展开。`,
    cause: '之前的事件发展导致了当前局面的形成。',
    process: `${firstChar}到达现场，与关键人物进行了一番对话和交锋。`,
    result: '事件暂时告一段落，但为后续情节埋下了新的伏笔。',
    location: '原作世界中的关键地点',
  }
}

export async function generateCharacterBiographyMock(character: { name: string; background?: string; personality?: string; wants?: string; fears?: string }): Promise<string> {
  return `${character.name}，${character.background || '出身平凡'}。性格${character.personality || '复杂多面'}，内心深处渴望${character.wants || '实现自己的价值'}，却始终被${character.fears || '未知的恐惧'}所困扰。在命运的推动下，TA 不断做出选择，最终成长为更完整的自己。`
}
