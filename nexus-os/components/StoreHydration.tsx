'use client'

import { useEffect } from 'react'
import { useProjectStore, useTaskStore } from '@/store'

/**
 * Rehydrate Zustand persist stores after mount to avoid Next.js hydration mismatch.
 * Must run only on client; skipHydration: true is set in store config.
 */
export default function StoreHydration() {
  useEffect(() => {
    useProjectStore.persist.rehydrate()
    useTaskStore.persist.rehydrate()
  }, [])
  return null
}
