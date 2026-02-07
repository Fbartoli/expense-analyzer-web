'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Database,
  Trash2,
  Download,
  Calendar,
  FileText,
  HardDrive,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import {
  getAllAnalyses,
  deleteAnalysis,
  updateAnalysisName,
  getStorageInfo,
  type SavedAnalysis,
} from '@/lib/db'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SavedAnalysesProps {
  onLoad: (analysis: SavedAnalysis) => void
  refreshTrigger?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SavedAnalyses({ onLoad, refreshTrigger, open, onOpenChange }: SavedAnalysesProps) {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [storageInfo, setStorageInfo] = useState({ count: 0, estimatedSize: 'Unknown' })
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = (value: boolean) => {
    if (isControlled) {
      onOpenChange?.(value)
    } else {
      setInternalOpen(value)
    }
  }
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  async function loadAnalyses(): Promise<void> {
    const data = await getAllAnalyses()
    setAnalyses(data)
    const info = await getStorageInfo()
    setStorageInfo(info)
  }

  useEffect(() => {
    loadAnalyses()
  }, [refreshTrigger])

  async function handleDelete(id: number, e: React.MouseEvent): Promise<void> {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this analysis?')) {
      await deleteAnalysis(id)
      await loadAnalyses()
    }
  }

  function handleStartEdit(analysis: SavedAnalysis, e: React.MouseEvent): void {
    e.stopPropagation()
    setEditingId(analysis.id!)
    setEditName(analysis.name)
  }

  function handleCancelEdit(e?: React.MouseEvent | React.KeyboardEvent): void {
    e?.stopPropagation()
    setEditingId(null)
    setEditName('')
  }

  async function handleSaveEdit(
    id: number,
    e?: React.MouseEvent | React.KeyboardEvent
  ): Promise<void> {
    e?.stopPropagation()
    if (editName.trim()) {
      await updateAnalysisName(id, editName.trim())
      await loadAnalyses()
    }
    setEditingId(null)
    setEditName('')
  }

  function handleLoad(analysis: SavedAnalysis): void {
    onLoad(analysis)
    setIsOpen(false)
  }

  function formatDateRange(analysis: SavedAnalysis): string {
    const dates = analysis.transactions
      .map((t) => new Date(t.purchaseDate))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
    if (dates.length === 0) return 'No dates'
    const from = format(dates[0], 'MMM d, yyyy')
    const to = format(dates[dates.length - 1], 'MMM d, yyyy')
    return from === to ? from : `${from} - ${to}`
  }

  if (analyses.length === 0) {
    return null
  }

  return (
    <>
      {!isControlled && (
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="rounded-xl border-2 px-6 py-3 font-semibold"
        >
          <Database className="mr-2 h-5 w-5 text-blue-600" />
          Saved ({analyses.length})
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
            <DialogTitle className="text-2xl font-bold text-white">Saved Analyses</DialogTitle>
            <DialogDescription className="text-blue-100">
              {storageInfo.count} saved • Using {storageInfo.estimatedSize}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(80vh-200px)] p-6">
            <div className="space-y-3">
              {analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  onClick={() => handleLoad(analysis)}
                  className="group cursor-pointer rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        {editingId === analysis.id ? (
                          <div
                            className="flex flex-1 items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(analysis.id!, e)
                                if (e.key === 'Escape') handleCancelEdit(e)
                              }}
                              className="flex-1 border-2 border-blue-400 focus-visible:ring-blue-600"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => handleSaveEdit(analysis.id!, e)}
                              className="h-8 w-8 bg-green-100 hover:bg-green-200"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-8 w-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800"
                            >
                              <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            </Button>
                          </div>
                        ) : (
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 dark:text-gray-100">
                            {analysis.name}
                          </h3>
                        )}
                      </div>

                      <div className="ml-8 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDateRange(analysis)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4" />
                          <span>{analysis.transactions.length} transactions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          <span>{analysis.fileName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-green-600">
                            {new Intl.NumberFormat('en-CH', {
                              style: 'currency',
                              currency: 'CHF',
                            }).format(analysis.report.totalSpent)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {editingId !== analysis.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleStartEdit(analysis, e)}
                          className="h-8 w-8"
                          title="Rename"
                          aria-label="Rename analysis"
                        >
                          <Pencil className="h-4 w-4 text-gray-400 hover:text-blue-600 dark:text-gray-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(analysis.id!, e)}
                        className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950"
                        title="Delete"
                        aria-label="Delete analysis"
                      >
                        <Trash2 className="h-5 w-5 text-gray-400 hover:text-red-600 dark:text-gray-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="flex items-center justify-between border-t bg-gray-50 p-4 dark:bg-gray-900">
            <p className="text-sm text-muted-foreground">Data is stored locally in your browser</p>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
