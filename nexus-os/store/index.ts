import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Project, Task, TaskStatus, Priority } from '@/types'

const uid = () => Math.random().toString(36).slice(2, 10)
const now = () => new Date().toISOString()

// localStorage はブラウザのみ。SSR 時は使わない（Vercel デプロイで client-side exception を防ぐ）
const safeStorage = {
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(name, value)
    } catch {}
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(name)
    } catch {}
  },
}

interface ProjectState {
  projects: Project[]
  addProject: (p: Omit<Project, 'id' | 'milestones' | 'status' | 'lastTouched'>) => void
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void
  touchProject: (id: string) => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [
        {
          id: 'p1',
          name: 'プロダクトローンチ',
          goal: '新サービスのβリリースと初期ユーザー100名獲得',
          deadline: '2025-12-31',
          color: '#00ffff',
          status: 'active',
          lastTouched: now(),
          milestones: [
            { id: 'm1', projectId: 'p1', label: 'MVP設計完了', targetDate: '2025-03-31', span: 'quarterly', completed: true },
            { id: 'm2', projectId: 'p1', label: 'β版開発完了', targetDate: '2025-06-30', span: 'quarterly', completed: false },
            { id: 'm3', projectId: 'p1', label: 'リリース', targetDate: '2025-09-30', span: 'quarterly', completed: false },
          ],
        },
        {
          id: 'p2',
          name: '採用・組織強化',
          goal: 'エンジニア2名・営業1名の採用完了',
          deadline: '2025-09-30',
          color: '#ff9500',
          status: 'stalled',
          lastTouched: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          milestones: [
            { id: 'm4', projectId: 'p2', label: '求人票公開', targetDate: '2025-02-28', span: 'monthly', completed: true },
            { id: 'm5', projectId: 'p2', label: '書類選考完了', targetDate: '2025-04-30', span: 'monthly', completed: false },
          ],
        },
        {
          id: 'p3',
          name: '売上目標達成',
          goal: '年間売上 ¥50M 達成',
          deadline: '2025-12-31',
          color: '#ff3c3c',
          status: 'active',
          lastTouched: now(),
          milestones: [
            { id: 'm6', projectId: 'p3', label: 'Q1: ¥10M', targetDate: '2025-03-31', span: 'quarterly', completed: false },
            { id: 'm7', projectId: 'p3', label: 'Q2: ¥25M累計', targetDate: '2025-06-30', span: 'quarterly', completed: false },
          ],
        },
      ],
      addProject: (p) =>
        set((s) => ({
          projects: [...s.projects, { ...p, id: uid(), milestones: [], status: 'active', lastTouched: now() }],
        })),
      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      deleteProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      touchProject: (id) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, lastTouched: now() } : p)),
        })),
    }),
    { name: 'nexus-projects', storage: safeStorage as never, skipHydration: true }
  )
)

interface TaskState {
  tasks: Task[]
  addTask: (t: Omit<Task, 'id' | 'createdAt'>) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  moveTask: (id: string, status: TaskStatus) => void
  deleteTask: (id: string) => void
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [
        { id: 't1', title: 'LPのコピーライティング修正', projectId: 'p1', priority: 'high', status: 'todo', createdAt: now() },
        { id: 't2', title: 'APIエンドポイント設計書作成', projectId: 'p1', priority: 'critical', status: 'in_progress', createdAt: now() },
        { id: 't3', title: '求人媒体の選定', projectId: 'p2', priority: 'medium', status: 'backlog', createdAt: now() },
        { id: 't4', title: '既存顧客へのアップセル提案', projectId: 'p3', priority: 'high', status: 'todo', createdAt: now() },
        { id: 't5', title: '競合サービス調査レポート', projectId: null, priority: 'low', status: 'backlog', createdAt: now() },
      ],
      addTask: (t) =>
        set((s) => ({ tasks: [...s.tasks, { ...t, id: uid(), createdAt: now() }] })),
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      moveTask: (id, status) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })),
      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
    }),
    { name: 'nexus-tasks', storage: safeStorage as never, skipHydration: true }
  )
)
