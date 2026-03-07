import { create } from 'zustand'
import { Project, Task, TaskStatus, Priority, Milestone } from '@/types'

const uid = () => Math.random().toString(36).slice(2, 10)
const now = () => new Date().toISOString()

const defaultProjects: Project[] = [
  {
    id: 'p1',
    name: 'プロダクトローンチ',
    goal: '新サービスのβリリースと初期ユーザー100名獲得',
    deadline: '2025-12-31',
    color: '#00ffff',
    status: 'active',
    lastTouched: '2025-03-07T00:00:00.000Z',
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
    lastTouched: '2025-03-07T00:00:00.000Z',
    milestones: [
      { id: 'm6', projectId: 'p3', label: 'Q1: ¥10M', targetDate: '2025-03-31', span: 'quarterly', completed: false },
      { id: 'm7', projectId: 'p3', label: 'Q2: ¥25M累計', targetDate: '2025-06-30', span: 'quarterly', completed: false },
    ],
  },
]

const defaultTasks: Task[] = [
  { id: 't1', title: 'LPのコピーライティング修正', projectId: 'p1', priority: 'high', status: 'todo', createdAt: '2025-03-07T00:00:00.000Z' },
  { id: 't2', title: 'APIエンドポイント設計書作成', projectId: 'p1', priority: 'critical', status: 'in_progress', createdAt: '2025-03-07T00:00:00.000Z' },
  { id: 't3', title: '求人媒体の選定', projectId: 'p2', priority: 'medium', status: 'backlog', createdAt: '2025-03-07T00:00:00.000Z' },
  { id: 't4', title: '既存顧客へのアップセル提案', projectId: 'p3', priority: 'high', status: 'todo', createdAt: '2025-03-07T00:00:00.000Z' },
  { id: 't5', title: '競合サービス調査レポート', projectId: null, priority: 'low', status: 'backlog', createdAt: '2025-03-07T00:00:00.000Z' },
]

interface ProjectState {
  projects: Project[]
  addProject: (p: Omit<Project, 'id' | 'milestones' | 'status' | 'lastTouched'>) => void
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void
  touchProject: (id: string) => void
  setProjects: (projects: Project[]) => void
  addMilestone: (projectId: string, m: Omit<Milestone, 'id' | 'projectId'>) => void
  updateMilestone: (projectId: string, milestoneId: string, patch: Partial<Milestone>) => void
  deleteMilestone: (projectId: string, milestoneId: string) => void
}

export const useProjectStore = create<ProjectState>()((set) => ({
  projects: defaultProjects,
  setProjects: (projects) => set({ projects }),
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
  addMilestone: (projectId, m) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? { ...p, milestones: [...p.milestones, { ...m, id: uid(), projectId }] }
          : p
      ),
    })),
  updateMilestone: (projectId, milestoneId, patch) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? { ...p, milestones: p.milestones.map((m) => (m.id === milestoneId ? { ...m, ...patch } : m)) }
          : p
      ),
    })),
  deleteMilestone: (projectId, milestoneId) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? { ...p, milestones: p.milestones.filter((m) => m.id !== milestoneId) }
          : p
      ),
    })),
}))

interface TaskState {
  tasks: Task[]
  addTask: (t: Omit<Task, 'id' | 'createdAt'>) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  moveTask: (id: string, status: TaskStatus) => void
  deleteTask: (id: string) => void
  setTasks: (tasks: Task[]) => void
}

export const useTaskStore = create<TaskState>()((set) => ({
  tasks: defaultTasks,
  setTasks: (tasks) => set({ tasks }),
  addTask: (t) =>
    set((s) => ({ tasks: [...s.tasks, { ...t, id: uid(), createdAt: now() }] })),
  updateTask: (id, patch) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  moveTask: (id, status) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })),
  deleteTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
}))

const STORAGE_KEYS = { projects: 'nexus-projects', tasks: 'nexus-tasks' } as const

/** クライアントで1回だけ localStorage から復元する。React の更新ループを起こさないよう別モジュールで呼ぶ */
export function loadStoredState(): void {
  if (typeof window === 'undefined') return
  try {
    const rawP = localStorage.getItem(STORAGE_KEYS.projects)
    if (rawP) {
      const parsed = JSON.parse(rawP) as Project[]
      if (Array.isArray(parsed) && parsed.length > 0) useProjectStore.setState({ projects: parsed })
    }
    const rawT = localStorage.getItem(STORAGE_KEYS.tasks)
    if (rawT) {
      const parsed = JSON.parse(rawT) as Task[]
      if (Array.isArray(parsed) && parsed.length > 0) useTaskStore.setState({ tasks: parsed })
    }
  } catch {
    // ignore
  }
}

/** ストア変更を localStorage に保存（サブスクライブ用） */
export function saveStoredState(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(useProjectStore.getState().projects))
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(useTaskStore.getState().tasks))
  } catch {
    // ignore
  }
}
