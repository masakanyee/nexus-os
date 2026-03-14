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

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[]
  if (val && typeof val === 'object') {
    // { tabs: [...] } or { labels: [...] } or { data: [...] } etc.
    const obj = val as Record<string, unknown>
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key])) return obj[key] as string[]
    }
  }
  return []
}

export const getLabels = async (url: string): Promise<string[]> =>
  toStringArray(await gasRequest<unknown>(url, { action: 'getLabels' }))

export const getTabs = async (url: string): Promise<string[]> =>
  toStringArray(await gasRequest<unknown>(url, { action: 'getTabs' }))

export const getTimeLog = (url: string, tab: string) =>
  gasRequest<TimelogData>(url, { action: 'getTimeLog', tab })
