import type {
  Character,
  NovelSettings,
  Scene,
  Storyline,
  Review,
  Project,
  ReviewSuggestion,
} from '@/types'
import * as frontendAi from './frontendAiService'
import { useAIConfigStore } from '@/store/useAIConfigStore'

export interface AIStreamOptions {
  onChunk: (chunk: string) => void
  onDone?: () => void
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function streamText(text: string, options: AIStreamOptions, speed = 20) {
  return new Promise<void>((resolve) => {
    let index = 0
    const interval = setInterval(() => {
      const chunk = text.slice(index, index + speed)
      index += speed
      options.onChunk(chunk)
      if (index >= text.length) {
        clearInterval(interval)
        options.onDone?.()
        resolve()
      }
    }, 40)
  })
}

function getAIConfig() {
  const config = useAIConfigStore.getState().getConfig()
  if (!config.apiKey) {
    throw new Error('请先在 AI 设置中配置 API Key')
  }
  return config
}

export async function generateCharacterBiography(
  character: Character,
  _settings: NovelSettings,
  project?: Project
): Promise<string> {
  const config = getAIConfig()
  if (!project) {
    return `${character.name}，${character.background || '出身平凡'}。性格${character.personality || '复杂多面'}，内心深处渴望${character.wants || '实现自己的价值'}，却始终被${character.fears || '未知的恐惧'}所困扰。`
  }
  return await frontendAi.generateCharacterBiography(character, project, config)
}

export async function generateStorylineScenes(
  projectId: string,
  storyline: Storyline,
  _characters: Character[],
  _settings: NovelSettings,
  project?: Project
): Promise<Scene[]> {
  const config = getAIConfig()
  if (!project) {
    return [
      { id: `scene-${Date.now()}-0`, name: '开端', description: `故事开始：${storyline.description.slice(0, 40)}`, characters: [], order: 0, status: 'pending' as const },
      { id: `scene-${Date.now()}-1`, name: '发展', description: '矛盾逐渐展开，人物关系发生变化。', characters: [], order: 1, status: 'pending' as const },
      { id: `scene-${Date.now()}-2`, name: '转折', description: '关键事件出现，局势发生逆转。', characters: [], order: 2, status: 'pending' as const },
      { id: `scene-${Date.now()}-3`, name: '高潮', description: '冲突达到顶点，人物做出重大选择。', characters: [], order: 3, status: 'pending' as const },
      { id: `scene-${Date.now()}-4`, name: '结局', description: '故事收束，悬念得到解答。', characters: [], order: 4, status: 'pending' as const },
    ]
  }
  const scenes = await frontendAi.generateStorylineScenes(project, storyline.description, config)
  return scenes.map((s, i) => ({
    id: `scene-${Date.now()}-${i}`,
    name: s.name,
    description: s.description,
    characters: [],
    order: i,
    status: 'pending' as const,
  }))
}

export async function generateIntro(
  project: Project,
  options?: AIStreamOptions
): Promise<string> {
  const config = getAIConfig()
  const intro = await frontendAi.generateNovelIntro(project, config)
  if (options) {
    await streamText(intro, options, 18)
  }
  await sleep(200)
  return intro
}

export async function generateSceneContent(
  scene: Scene,
  project: Project,
  options?: AIStreamOptions,
  previousContent = ''
): Promise<string> {
  const config = getAIConfig()
  const suggestedWordCount = 600
  const content = await frontendAi.generateSceneContent(
    project,
    scene.name,
    scene.description,
    suggestedWordCount,
    previousContent,
    config
  )
  if (options) {
    await streamText(content, options, 16)
  }
  await sleep(150)
  return content
}

export async function generateOutline(
  project: Project,
  mainStorylineId: string,
  branchStorylineIds: string[],
  options?: AIStreamOptions
): Promise<string> {
  const mainLine = project.storylines.find((s) => s.id === mainStorylineId)
  const branchLines = project.storylines.filter((s) => branchStorylineIds.includes(s.id))

  if (!mainLine) {
    const msg = '请先选择主线故事线'
    if (options) options.onChunk(msg)
    options?.onDone?.()
    return msg
  }

  const allScenes = [
    ...mainLine.scenes,
    ...branchLines.flatMap((s) => s.scenes),
  ].sort((a, b) => a.order - b.order)

  const fanfic = project.settings.fanfic
  const referenceScenes = allScenes.filter((s) => s.isReference)
  const writeScenes = allScenes.filter((s) => !s.isReference)
  const outlineText = `【故事大纲】

《${project.settings.name}》
原作：《${fanfic.workName}》${fanfic.authorName ? ` / ${fanfic.authorName}` : ''}

一、主线：${mainLine.name}
${mainLine.description}

${branchLines.length > 0 ? branchLines.map((line, i) => `${['二', '三', '四', '五'][i] || i + 2}、支线：${line.name}\n${line.description}`).join('\n\n') : ''}

三、场景梗概
${allScenes.map((scene, i) => `${i + 1}. ${scene.name}${scene.isReference ? '【原作引用·正文不生成】' : ''}：${scene.description}`).join('\n')}

${referenceScenes.length > 0 ? `四、说明
以下场景为原作引用，正文无需生成，仅作为故事衔接参考：
${referenceScenes.map((s, i) => `${i + 1}. ${s.name}`).join('\n')}

` : ''}${referenceScenes.length > 0 ? '五' : '四'}、主题立意
${project.settings.theme}

${referenceScenes.length > 0 ? '六' : '五'}、创作方向
- 目标平台：${project.settings.direction.platform}
- 读者类型：${project.settings.direction.readerType}
- 结构模板：${project.settings.direction.structure}
- 叙事视角：${project.settings.direction.perspective}
- 预计字数：约 ${writeScenes.length * 600} 字（共 ${writeScenes.length} 个待写场景，每场景约 600 字）`

  if (options) {
    await streamText(outlineText, options, 25)
  }
  await sleep(200)
  return outlineText
}

export async function generateNovelFromOutline(
  project: Project,
  mainStorylineId: string,
  branchStorylineIds: string[],
  _outline: string,
  options: AIStreamOptions
): Promise<void> {
  const { settings } = project
  const mainLine = project.storylines.find((s) => s.id === mainStorylineId)
  const branchLines = project.storylines.filter((s) => branchStorylineIds.includes(s.id))

  const allScenes = [
    ...(mainLine?.scenes || []),
    ...branchLines.flatMap((s) => s.scenes),
  ]
    .filter((scene) => !scene.isReference)
    .sort((a, b) => a.order - b.order)

  const isFanfic = settings.fanfic?.isEnabled && settings.fanfic?.workName

  if (allScenes.length === 0) {
    options.onChunk('\n\n（暂无需要撰写的场景，所有场景均为原作引用，请添加新场景或在场景编辑中关闭"原作引用"开关）')
    options.onDone?.()
    return
  }

  const introLine = isFanfic
    ? `${settings.background || `在《${settings.fanfic.workName}》的世界里`}`
    : `${settings.background}`
  const intro = `${introLine}\n\n`
  await streamText(intro, options, 20)

  let previousContent = ''
  for (let i = 0; i < allScenes.length; i++) {
    const scene = allScenes[i]

    if (i > 0) {
      const transition = '\n\n'
      await streamText(transition, options, 5)
    }

    const config = getAIConfig()
    const content = await frontendAi.generateSceneContent(
      project,
      scene.name,
      scene.description,
      600,
      previousContent,
      config
    )
    await streamText(content, options, 16)
    previousContent = content
  }

  const endingLine = isFanfic
    ? `故事到这里暂告一段落，但${settings.name || '他们'}的故事仍在继续。`
    : `故事到这里暂告一段落，但${settings.name || '他们'}的故事仍在继续。`
  const ending = `\n\n${endingLine}`
  await streamText(ending, options, 15)
  options.onDone?.()
}

export async function generateFullNovel(
  project: Project,
  options: AIStreamOptions
): Promise<void> {
  const { settings, storylines } = project
  const allScenes = storylines.flatMap((s) => s.scenes).sort((a, b) => a.order - b.order)
  const isFanfic = settings.fanfic?.isEnabled && settings.fanfic?.workName

  if (allScenes.length === 0) {
    options.onChunk('\n\n（暂无场景，请先在故事线画布中创建场景）')
    options.onDone?.()
    return
  }

  const introLine = isFanfic
    ? `在《${settings.fanfic.workName}》的世界里，${settings.name}的同人故事从这里开始。`
    : `${settings.background}，${settings.name}的故事从这里开始。`
  const intro = `\n\n${introLine}\n\n`
  await streamText(intro, options, 16)

  let previousContent = ''
  for (let i = 0; i < allScenes.length; i++) {
    const scene = allScenes[i]
    const config = getAIConfig()
    const content = await frontendAi.generateSceneContent(
      project,
      scene.name,
      scene.description,
      600,
      previousContent,
      config
    )
    await streamText(content + '\n\n', options, 14)
    previousContent = content
  }

  const endingLine = isFanfic
    ? `无论结局是圆满还是遗憾，${settings.name}的同人故事都已写就，却又仿佛只是原作平行世界中的一个侧面。`
    : `无论结局是圆满还是遗憾，${settings.name}的故事都已写就。`
  const ending = `\n\n${endingLine}而那些在暗夜中闪烁的情感，将长久地留在读者心中。`
  await streamText(ending, options, 16)
  options.onDone?.()
}

export async function generateReview(project: Project): Promise<Review> {
  const config = getAIConfig()
  return await frontendAi.generateReview(project, config)
}

export async function generateDimensionSuggestions(
  project: Project,
  dimension: keyof NonNullable<Project['review']>['scores']
): Promise<ReviewSuggestion[]> {
  const config = getAIConfig()
  return await frontendAi.generateDimensionSuggestions(project, dimension, config)
}

export async function generateSceneDetail(
  project: Project,
  description: string
): Promise<{ name: string; description: string; cause: string; process: string; result: string; location: string }> {
  const config = getAIConfig()
  return await frontendAi.generateSceneDetail(project, description, config)
}
