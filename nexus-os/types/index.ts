export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done'
export type MilestoneSpan = 'monthly' | 'quarterly' | 'half_year'

export interface Milestone {
  id: string
  projectId: string
  label: string
  targetDate: string
  span: MilestoneSpan
  completed: boolean
  notes?: string
  connections?: string[]  // 接続先マイルストーンIDの配列
}

export interface Project {
  id: string
  name: string
  goal: string
  deadline: string
  color: string
  milestones: Milestone[]
  status: 'active' | 'stalled' | 'completed'
  lastTouched: string
}

export interface FlowNode {
  id: string
  label: string
  notes?: string
  x: number
  y: number
  w: number
  h: number
  color: string
}

export interface FlowConnection {
  id: string
  from: string
  to: string
}

export interface Task {
  id: string
  title: string
  projectId: string | null
  priority: Priority
  status: TaskStatus
  dueDate?: string
  createdAt: string
  memo?: string
}

export interface RevenueRecord {
  id: string
  projectId: string
  period: string      // "0301-0315" (GAS タブ名と一致)
  revenue: number     // 売上（円）
  profit: number      // 利益（円）
  hours?: number      // その期間の稼働時間（timelog から自動入力）
  memo?: string
  createdAt: string
}
