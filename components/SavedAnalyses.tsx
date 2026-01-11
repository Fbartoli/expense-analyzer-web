'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Database, Trash2, Download, Calendar, FileText, HardDrive, Pencil, Check, X } from 'lucide-react'
import { getAllAnalyses, deleteAnalysis, updateAnalysisName, getStorageInfo, type SavedAnalysis } from '@/lib/db'

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

  async function handleSaveEdit(id: number, e?: React.MouseEvent | React.KeyboardEvent): Promise<void> {
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
      .map(t => new Date(t.purchaseDate))
      .filter(d => !isNaN(d.getTime()))
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
        className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-blue-400 transition-all font-semibold text-gray-700"
      >
        <Database className="w-5 h-5 text-blue-600" />
        Saved ({analyses.length})
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Saved Analyses</h2>
                  <p className="text-blue-100 mt-1">
                    {storageInfo.count} saved • Using {storageInfo.estimatedSize}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(80vh-140px)] p-6">
              <div className="space-y-3">
                {analyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    onClick={() => handleLoad(analysis)}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group hover:border-blue-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-blue-500" />
                          {editingId === analysis.id ? (
                            <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(analysis.id!, e)
                                  if (e.key === 'Escape') handleCancelEdit(e)
                                }}
                                className="flex-1 px-2 py-1 border-2 border-blue-400 rounded-lg focus:outline-none focus:border-blue-600"
                                autoFocus
                              />
                              <button
                                onClick={(e) => handleSaveEdit(analysis.id!, e)}
                                className="p-1.5 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                          ) : (
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                              {analysis.name}
                            </h3>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 ml-8">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDateRange(analysis)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4" />
                            <span>{analysis.transactions.length} transactions</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            <span>{analysis.fileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 font-semibold">
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
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Rename"
                          >
                            <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-600" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(analysis.id!, e)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                💡 Data is stored locally in your browser
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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
