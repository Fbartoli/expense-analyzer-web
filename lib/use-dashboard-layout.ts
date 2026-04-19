'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { getDashboardLayout, saveDashboardLayout } from '@/lib/db'
import {
  type WidgetId,
  type WidgetConfig,
  DEFAULT_WIDGETS,
  DEFAULT_SIZES,
} from '@/lib/dashboard-types'

interface UseDashboardLayoutOptions {
  setError: (message: string) => void
}

interface UseDashboardLayoutReturn {
  widgets: WidgetConfig[]
  isCustomizing: boolean
  setIsCustomizing: (value: boolean) => void
  sensors: ReturnType<typeof useSensors>
  visibleWidgetIds: WidgetId[]
  loadDashboardLayout: () => Promise<void>
  handleDragEnd: (event: DragEndEvent) => void
  handleToggleVisibility: (id: WidgetId) => void
  handleReorder: (reordered: WidgetConfig[]) => void
  handleResetLayout: () => void
}

export function useDashboardLayout(options: UseDashboardLayoutOptions): UseDashboardLayoutReturn {
  const { setError } = options
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS)
  const [isCustomizing, setIsCustomizing] = useState(false)
  const saveLayoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  useEffect(() => {
    return () => {
      if (saveLayoutTimerRef.current) {
        clearTimeout(saveLayoutTimerRef.current)
      }
    }
  }, [])

  const debounceSaveLayout = useCallback((updatedWidgets: WidgetConfig[]): void => {
    if (saveLayoutTimerRef.current) {
      clearTimeout(saveLayoutTimerRef.current)
    }
    saveLayoutTimerRef.current = setTimeout(() => {
      saveDashboardLayout({ widgets: updatedWidgets }).catch((err) =>
        console.error('Failed to save dashboard layout:', err)
      )
    }, 500)
  }, [])

  const loadDashboardLayout = useCallback(async (): Promise<void> => {
    try {
      const saved = await getDashboardLayout()
      if (saved) {
        const savedIds = new Set(saved.widgets.map((w) => w.id))
        const merged = [
          ...saved.widgets.map((w) => ({
            ...w,
            size: w.size || DEFAULT_SIZES[w.id] || ('full' as const),
          })),
          ...DEFAULT_WIDGETS.filter((w) => !savedIds.has(w.id)),
        ]
        setWidgets(merged)
      }
    } catch (err) {
      console.error('Failed to load dashboard layout:', err)
      setError('Failed to load dashboard layout')
    }
  }, [setError])

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      setWidgets((prev) => {
        const oldIndex = prev.findIndex((w) => w.id === active.id)
        const newIndex = prev.findIndex((w) => w.id === over.id)
        const updated = arrayMove(prev, oldIndex, newIndex)
        debounceSaveLayout(updated)
        return updated
      })
    },
    [debounceSaveLayout]
  )

  const handleToggleVisibility = useCallback(
    (id: WidgetId): void => {
      setWidgets((prev) => {
        const updated = prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
        debounceSaveLayout(updated)
        return updated
      })
    },
    [debounceSaveLayout]
  )

  const handleReorder = useCallback(
    (reordered: WidgetConfig[]): void => {
      setWidgets(reordered)
      debounceSaveLayout(reordered)
    },
    [debounceSaveLayout]
  )

  const handleResetLayout = useCallback((): void => {
    setWidgets(DEFAULT_WIDGETS)
    debounceSaveLayout(DEFAULT_WIDGETS)
  }, [debounceSaveLayout])

  const visibleWidgetIds = useMemo(
    () => widgets.filter((w) => w.visible).map((w) => w.id),
    [widgets]
  )

  return {
    widgets,
    isCustomizing,
    setIsCustomizing,
    sensors,
    visibleWidgetIds,
    loadDashboardLayout,
    handleDragEnd,
    handleToggleVisibility,
    handleReorder,
    handleResetLayout,
  }
}
