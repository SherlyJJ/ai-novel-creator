import { Router } from 'express'
import * as projectService from '../services/projectService.js'
import type { Project } from '../types/index.js'

const router = Router()

router.get('/', async (_req, res) => {
  const projects = await projectService.listProjects()
  res.json({ projects })
})

router.get('/:id', async (req, res) => {
  const project = await projectService.getProject(req.params.id)
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  res.json({ project })
})

router.post('/', async (req, res) => {
  const project = await projectService.createProject(req.body as Project)
  res.status(201).json({ project })
})

router.put('/:id', async (req, res) => {
  const project = await projectService.updateProject(req.params.id, req.body as Partial<Project>)
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  res.json({ project })
})

router.post('/:id/save', async (req, res) => {
  const project = await projectService.saveProject(req.body as Project)
  res.json({ project })
})

router.delete('/:id', async (req, res) => {
  const success = await projectService.deleteProject(req.params.id)
  if (!success) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  res.status(204).send()
})

export default router
