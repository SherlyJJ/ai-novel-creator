import fs from 'node:fs/promises'
import path from 'node:path'
import { nanoid } from '../utils/nanoid.js'
import type { Project, ProjectMeta } from '../types/index.js'

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), '..', 'data')
const PROJECTS_DIR = path.join(DATA_DIR, 'projects')

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

function projectFilePath(projectId: string) {
  return path.join(PROJECTS_DIR, `${projectId}.json`)
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

async function writeJsonFile(filePath: string, data: unknown) {
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export async function listProjects(): Promise<ProjectMeta[]> {
  await ensureDir(PROJECTS_DIR)
  const files = await fs.readdir(PROJECTS_DIR)
  const projects: ProjectMeta[] = []
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const project = await readJsonFile<Project>(path.join(PROJECTS_DIR, file))
    if (project) {
      projects.push({
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })
    }
  }
  return projects.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getProject(id: string): Promise<Project | null> {
  return readJsonFile<Project>(projectFilePath(id))
}

export async function createProject(project: Project): Promise<Project> {
  const now = Date.now()
  const newProject: Project = {
    ...project,
    id: project.id || nanoid(),
    createdAt: project.createdAt || now,
    updatedAt: now,
  }
  await writeJsonFile(projectFilePath(newProject.id), newProject)
  return newProject
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
  const existing = await getProject(id)
  if (!existing) return null
  const updated: Project = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: Date.now(),
  }
  await writeJsonFile(projectFilePath(id), updated)
  return updated
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    await fs.unlink(projectFilePath(id))
    return true
  } catch {
    return false
  }
}

export async function saveProject(project: Project): Promise<Project> {
  const updated: Project = {
    ...project,
    updatedAt: Date.now(),
  }
  await writeJsonFile(projectFilePath(project.id), updated)
  return updated
}
