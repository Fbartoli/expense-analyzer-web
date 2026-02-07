'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, EyeOff } from 'lucide-react'
import type { WidgetId } from '@/lib/dashboard-types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SortableWidgetProps {
  id: WidgetId
  isCustomizing: boolean
  label: string
  size: 'full' | 'half'
  onHide: (id: WidgetId) => void
  children: React.ReactNode
}

export function SortableWidget({
  id,
  isCustomizing,
  label,
  size,
  onHide,
  children,
}: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isCustomizing,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const colClass = size === 'half' ? 'col-span-1 min-w-0' : 'col-span-1 lg:col-span-2 min-w-0'

  if (!isCustomizing) {
    return (
      <div ref={setNodeRef} style={style} {...attributes} className={`${colClass} overflow-hidden`}>
        {children}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`relative ${colClass} overflow-hidden`}
    >
      <Card className="border-2 border-dashed border-blue-300 p-1">
        <div className="mb-1 flex items-center gap-2 rounded-t-lg bg-blue-50 px-3 py-2 dark:bg-blue-950">
          <button
            {...listeners}
            className="cursor-grab touch-none rounded p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600 active:cursor-grabbing dark:hover:bg-blue-900"
            aria-label={`Drag to reorder ${label}`}
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{label}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onHide(id)}
            className="ml-auto h-7 w-7 text-blue-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900"
            aria-label={`Hide ${label}`}
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </Card>
    </div>
  )
}
