'use client'
import dynamic from 'next/dynamic'

const TimelineClient = dynamic(() => import('./timeline-client'), { ssr: false })

export default function TimelineWrapper() {
  return <TimelineClient />
}
