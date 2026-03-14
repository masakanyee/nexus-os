'use client'
import dynamic from 'next/dynamic'
const TimelogClient = dynamic(() => import('./timelog-client'), { ssr: false })
export default function TimelogWrapper() {
  return <TimelogClient />
}
