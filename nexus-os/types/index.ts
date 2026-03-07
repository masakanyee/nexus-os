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
