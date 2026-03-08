import { create } from 'zustand'
import { Project, Task, TaskStatus, Priority, Milestone, FlowNode, FlowConnection } from '@/types'
import { supabase } from '@/lib/supabase'

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

// ─── Flow Board Store ─────────────────────────────────────────────────────────
const defaultFlowNodes: FlowNode[] = [
  { id: 'fn1', label: 'メール問い合わせ', notes: '', x: 60,  y: 80,  w: 160, h: 80,  color: '#00e5ff' },
  { id: 'fn2', label: 'LINE問い合わせ',   notes: '', x: 60,  y: 200, w: 160, h: 80,  color: '#00e5ff' },
  { id: 'fn3', label: '問い合わせ分類・優先度判定', notes: 'GASが分類\n・優先度\n・内容\n・必要アクション', x: 300, y: 120, w: 200, h: 120, color: '#ff9f0a' },
  { id: 'fn4', label: '対応リスト作成',   notes: 'メッセージリストに書き出し', x: 580, y: 120, w: 180, h: 100, color: '#00ff88' },
  { id: 'fn5', label: '完了・フォロー',   notes: '対応後\nステータス更新', x: 840, y: 100, w: 180, h: 120, color: '#c084fc' },
]
const defaultFlowConns: FlowConnection[] = [
  { id: 'fc1', from: 'fn1', to: 'fn3' },
  { id: 'fc2', from: 'fn2', to: 'fn3' },
  { id: 'fc3', from: 'fn3', to: 'fn4' },
  { id: 'fc4', from: 'fn4', to: 'fn5' },
]

interface FlowState {
  nodes: FlowNode[]
  connections: FlowConnection[]
  addNode: (n: Omit<FlowNode, 'id'>) => void
  updateNode: (id: string, patch: Partial<FlowNode>) => void
  deleteNode: (id: string) => void
  addConnection: (from: string, to: string) => void
  deleteConnection: (id: string) => void
  setNodes: (nodes: FlowNode[]) => void
  setConnections: (conns: FlowConnection[]) => void
}

export const useFlowStore = create<FlowState>()((set) => ({
  nodes: defaultFlowNodes,
  connections: defaultFlowConns,
  setNodes: (nodes) => set({ nodes }),
  setConnections: (connections) => set({ connections }),
  addNode: (n) => set((s) => ({ nodes: [...s.nodes, { ...n, id: uid() }] })),
  updateNode: (id, patch) => set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) })),
  deleteNode: (id) => set((s) => ({ nodes: s.nodes.filter((n) => n.id !== id), connections: s.connections.filter((c) => c.from !== id && c.to !== id) })),
  addConnection: (from, to) => set((s) => ({ connections: [...s.connections, { id: uid(), from, to }] })),
  deleteConnection: (id) => set((s) => ({ connections: s.connections.filter((c) => c.id !== id) })),
}))

// ─── Supabase persistence ──────────────────────────────────────────────────────

/** Supabase からデータを読み込む（マウント時に1回） */
export async function loadFromSupabase(): Promise<void> {
  if (typeof window === 'undefined') return
  const { data, error } = await supabase.from('nexus_store').select('*')
  if (error || !data) return
  for (const row of data) {
    if (row.key === 'projects' && Array.isArray(row.value) && row.value.length > 0) {
      useProjectStore.setState({ projects: row.value })
    }
    if (row.key === 'tasks' && Array.isArray(row.value) && row.value.length > 0) {
      useTaskStore.setState({ tasks: row.value })
    }
    if (row.key === 'flow' && row.value?.nodes) {
      useFlowStore.setState({ nodes: row.value.nodes, connections: row.value.connections ?? [] })
    }
  }
}

/** ストアの現在の状態を Supabase に保存 */
export async function saveToSupabase(): Promise<void> {
  if (typeof window === 'undefined') return
  const projects = useProjectStore.getState().projects
  const tasks = useTaskStore.getState().tasks
  const { nodes, connections } = useFlowStore.getState()
  await supabase.from('nexus_store').upsert([
    { key: 'projects', value: projects },
    { key: 'tasks', value: tasks },
    { key: 'flow', value: { nodes, connections } },
  ])
}

// ─── localStorage fallback ────────────────────────────────────────────────────
const STORAGE_KEYS = { projects: 'nexus-projects', tasks: 'nexus-tasks', flow: 'nexus-flow' } as const

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
    const rawF = localStorage.getItem(STORAGE_KEYS.flow)
    if (rawF) {
      const parsed = JSON.parse(rawF) as { nodes: FlowNode[]; connections: FlowConnection[] }
      if (parsed.nodes && Array.isArray(parsed.nodes)) useFlowStore.setState({ nodes: parsed.nodes, connections: parsed.connections ?? [] })
    }
  } catch {
    // ignore
  }
}

export function saveStoredState(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(useProjectStore.getState().projects))
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(useTaskStore.getState().tasks))
    const { nodes, connections } = useFlowStore.getState()
    localStorage.setItem(STORAGE_KEYS.flow, JSON.stringify({ nodes, connections }))
  } catch {
    // ignore
  }
}
