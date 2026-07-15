import { db, type StoredProject } from './db'
import { generateId } from '@engine/entities/factory'

export async function saveProject(project: Omit<StoredProject, 'updatedAt' | 'createdAt'> & { createdAt?: number }): Promise<void> {
  const existing = await db.projects.get(project.id)
  await db.projects.put({
    ...project,
    createdAt: existing?.createdAt ?? project.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  })
}

export async function loadLastProject(): Promise<StoredProject | undefined> {
  return db.projects.orderBy('updatedAt').last()
}

export async function loadProject(id: string): Promise<StoredProject | undefined> {
  return db.projects.get(id)
}

export async function listProjects(): Promise<StoredProject[]> {
  return db.projects.orderBy('updatedAt').reverse().toArray()
}

export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id)
}

export function newProjectId(): string {
  return generateId('project')
}
