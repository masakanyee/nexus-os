'use client'
import dynamic from 'next/dynamic'

const FlowBoardClient = dynamic(() => import('./timeline-client'), { ssr: false })

export default function TimelineWrapper() {
  return <FlowBoardClient />
}
