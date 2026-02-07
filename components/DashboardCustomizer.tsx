'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensors,
  useSensor,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, RotateCcw, X, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { WidgetConfig, WidgetId } from '@/lib/dashboard-types'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'

interface DashboardCustomizerProps {
  widgets: WidgetConfig[]
  onToggleVisibility: (id: WidgetId) => void
  onReorder: (widgets: WidgetConfig[]) => void
  onResetLayout: () => void
  onClose: () => void
}

function SortableRow({
  widget,
  onToggleVisibility,
}: {
  widget: WidgetConfig
  onToggleVisibility: (id: WidgetId) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex items-center gap-3 rounded-lg border bg-gray-50 px-3 py-3 dark:bg-gray-900 ${
        isDragging ? 'border-blue-300 shadow-lg' : 'border-gray-100 dark:border-gray-800'
      }`}
    >
      <button
        {...listeners}
        className="cursor-grab touch-none rounded p-0.5 text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:text-gray-500 dark:hover:text-gray-300"
        aria-label={`Drag to reorder ${widget.label}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Label
        htmlFor={`widget-${widget.id}`}
        className="flex-1 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {widget.label}
      </Label>
      <Switch
        id={`widget-${widget.id}`}
        checked={widget.visible}
        onCheckedChange={() => onToggleVisibility(widget.id)}
        aria-label={widget.visible ? `Hide ${widget.label}` : `Show ${widget.label}`}
      />
    </div>
  )
}

export function DashboardCustomizer({
  widgets,
  onToggleVisibility,
  onReorder,
  onResetLayout,
  onClose,
}: DashboardCustomizerProps) {
  const { theme, setTheme } = useTheme()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor)
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = widgets.findIndex((w) => w.id === active.id)
    const newIndex = widgets.findIndex((w) => w.id === over.id)
    onReorder(arrayMove(widgets, oldIndex, newIndex))
  }

  const widgetIds = widgets.map((w) => w.id)

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-80 flex-col border-l border-gray-200 bg-white shadow-xl duration-300 animate-in slide-in-from-right dark:border-gray-700 dark:bg-gray-950">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Customize Dashboard</h2>
          <p className="text-sm text-muted-foreground">Drag to reorder and toggle visibility.</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext items={widgetIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {widgets.map((widget) => (
                <SortableRow
                  key={widget.id}
                  widget={widget}
                  onToggleVisibility={onToggleVisibility}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <Separator />

      <div className="px-4 py-3">
        <Label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Theme
        </Label>
        <div className="flex gap-2">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('light')}
            className="flex-1"
          >
            <Sun className="mr-1.5 h-3.5 w-3.5" />
            Light
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('dark')}
            className="flex-1"
          >
            <Moon className="mr-1.5 h-3.5 w-3.5" />
            Dark
          </Button>
          <Button
            variant={theme === 'system' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('system')}
            className="flex-1"
          >
            <Monitor className="mr-1.5 h-3.5 w-3.5" />
            Auto
          </Button>
        </div>
      </div>

      <Separator />

      <div className="px-4 py-4">
        <Button
          variant="outline"
          onClick={onResetLayout}
          className="w-full hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Default Layout
        </Button>
      </div>
    </div>
  )
}
