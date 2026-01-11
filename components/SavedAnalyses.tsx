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

interface SavedAnalysesProps {
  onLoad: (analysis: SavedAnalysis) => void
  refreshTrigger?: number
}

export function SavedAnalyses({ onLoad, refreshTrigger }: SavedAnalysesProps) {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [storageInfo, setStorageInfo] = useState({ count: 0, estimatedSize: 'Unknown' })
  const [isOpen, setIsOpen] = useState(false)
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
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 transition-all hover:border-blue-400 hover:bg-gray-50"
      >
        <Database className="h-5 w-5 text-blue-600" />
        Saved ({analyses.length})
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Saved Analyses</h2>
                  <p className="mt-1 text-blue-100">
                    {storageInfo.count} saved • Using {storageInfo.estimatedSize}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 transition-colors hover:bg-white/20"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-[calc(80vh-140px)] overflow-y-auto p-6">
              <div className="space-y-3">
                {analyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    onClick={() => handleLoad(analysis)}
                    className="group cursor-pointer rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:shadow-md"
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
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(analysis.id!, e)
                                  if (e.key === 'Escape') handleCancelEdit(e)
                                }}
                                className="flex-1 rounded-lg border-2 border-blue-400 px-2 py-1 focus:border-blue-600 focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={(e) => handleSaveEdit(analysis.id!, e)}
                                className="rounded-lg bg-green-100 p-1.5 transition-colors hover:bg-green-200"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="rounded-lg bg-gray-100 p-1.5 transition-colors hover:bg-gray-200"
                              >
                                <X className="h-4 w-4 text-gray-600" />
                              </button>
                            </div>
                          ) : (
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                              {analysis.name}
                            </h3>
                          )}
                        </div>

                        <div className="ml-8 grid grid-cols-2 gap-4 text-sm text-gray-600">
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
                          <button
                            onClick={(e) => handleStartEdit(analysis, e)}
                            className="rounded-lg p-2 transition-colors hover:bg-blue-50"
                            title="Rename"
                          >
                            <Pencil className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(analysis.id!, e)}
                          className="rounded-lg p-2 transition-colors hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5 text-gray-400 hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t bg-gray-50 p-4">
              <p className="text-sm text-gray-600">💡 Data is stored locally in your browser</p>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
