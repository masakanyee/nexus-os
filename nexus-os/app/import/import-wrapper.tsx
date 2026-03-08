'use client'
import dynamic from 'next/dynamic'

const ImportClient = dynamic(() => import('./import-client'), { ssr: false })

export default function ImportWrapper() {
  return <ImportClient />
}
