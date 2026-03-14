export interface TimelogEntry {
  totalHours: number
  actions: string[]
}

export interface TimelogData {
  tab: string
  totalHours: number
  summary: Record<string, TimelogEntry>
  records: Array<{ project: string; content: string; duration: number }>
}

async function gasRequest<T>(url: string, params: Record<string, string>): Promise<T> {
  const u = new URL(url)
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v))
  const res = await fetch(u.toString())
  if (!res.ok) throw new Error(`GAS API ${res.status}`)
  return res.json() as Promise<T>
}

export const getLabels = (url: string) =>
  gasRequest<string[]>(url, { action: 'getLabels' })

export const getTabs = (url: string) =>
  gasRequest<string[]>(url, { action: 'getTabs' })

export const getTimeLog = (url: string, tab: string) =>
  gasRequest<TimelogData>(url, { action: 'getTimeLog', tab })
