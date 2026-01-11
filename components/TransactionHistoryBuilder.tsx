'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Plus, FileUp, AlertTriangle, CheckCircle, History, Layers, Upload } from 'lucide-react'
import { getAllAnalyses, saveAnalysis, type SavedAnalysis } from '@/lib/db'
import { parseCSV } from '@/lib/parser'
import { analyzeExpenses } from '@/lib/analyzer'
import { mergeTransactions, type MergeResult } from '@/lib/merge'
import type { Transaction } from '@/lib/types'

interface TransactionHistoryBuilderProps {
  onHistoryBuilt?: (transactions: Transaction[]) => void
}

type Step = 'select-base' | 'upload' | 'preview' | 'complete'

export function TransactionHistoryBuilder({ onHistoryBuilt }: TransactionHistoryBuilderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<Step>('select-base')
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [loading, setLoading] = useState(false)

  // Selected base analysis
  const [selectedBase, setSelectedBase] = useState<SavedAnalysis | null>(null)
  const [baseTransactions, setBaseTransactions] = useState<Transaction[]>([])

  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)

  // Merge result
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null)
  const [historyName, setHistoryName] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadAnalyses()
    }
  }, [isOpen])

  const loadAnalyses = async () => {
    try {
      const data = await getAllAnalyses()
      setAnalyses(data)
    } catch (err) {
      console.error('Failed to load analyses:', err)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setStep('select-base')
    setSelectedBase(null)
    setBaseTransactions([])
    setUploadedFiles([])
    setMergeResult(null)
    setHistoryName('')
  }

  const handleSelectBase = (analysis: SavedAnalysis | null) => {
    setSelectedBase(analysis)
    if (analysis) {
      setBaseTransactions(analysis.transactions)
      setHistoryName(`${analysis.name} (Extended)`)
    } else {
      setBaseTransactions([])
      setHistoryName('New Transaction History')
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === 'text/csv' || f.name.endsWith('.csv')
    )
    if (files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...files])
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...files])
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMerge = async () => {
    if (uploadedFiles.length === 0) return

    setLoading(true)
    try {
      // Parse all uploaded files
      let allNewTransactions: Transaction[] = []
      for (const file of uploadedFiles) {
        const parsed = await parseCSV(file)
        allNewTransactions = [...allNewTransactions, ...parsed]
      }

      // Merge with base transactions
      const result = mergeTransactions(baseTransactions, allNewTransactions)
      setMergeResult(result)
      setStep('preview')
    } catch (err) {
      console.error('Failed to merge:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveHistory = async () => {
    if (!mergeResult) return

    setLoading(true)
    try {
      // Re-analyze with merged transactions
      const report = analyzeExpenses(mergeResult.merged)

      // Save as new analysis
      await saveAnalysis('Merged History', mergeResult.merged, report, historyName)

      // Notify parent if callback provided
      if (onHistoryBuilt) {
        onHistoryBuilt(mergeResult.merged)
      }

      setStep('complete')
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 transition-all hover:border-emerald-300 hover:bg-emerald-50"
      >
        <History className="h-5 w-5" />
        Build History
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/20 p-2">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Transaction History Builder</h2>
                  <p className="text-sm text-emerald-100">
                    Merge multiple CSVs with duplicate detection
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-xl p-2 transition-colors hover:bg-white/20"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 border-b bg-gray-50 px-6 py-4">
              {['select-base', 'upload', 'preview', 'complete'].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      step === s
                        ? 'bg-emerald-600 text-white'
                        : ['select-base', 'upload', 'preview', 'complete'].indexOf(step) > i
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 3 && <div className="mx-1 h-0.5 w-8 bg-gray-200" />}
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Select Base */}
              {step === 'select-base' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                      Select Base Analysis
                    </h3>
                    <p className="mb-4 text-sm text-gray-600">
                      Choose an existing analysis to extend, or start fresh.
                    </p>
                  </div>

                  <button
                    onClick={() => handleSelectBase(null)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      selectedBase === null
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Plus className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Start Fresh</p>
                        <p className="text-sm text-gray-500">Create a new transaction history</p>
                      </div>
                    </div>
                  </button>

                  {analyses.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        Or extend an existing analysis:
                      </p>
                      {analyses.map((analysis) => (
                        <button
                          key={analysis.id}
                          onClick={() => handleSelectBase(analysis)}
                          className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                            selectedBase?.id === analysis.id
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-emerald-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{analysis.name}</p>
                              <p className="text-sm text-gray-500">
                                {analysis.transactions.length} transactions
                              </p>
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatCurrency(analysis.report.totalSpent)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="pt-4">
                    <button
                      onClick={() => setStep('upload')}
                      className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Upload Files */}
              {step === 'upload' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">Upload CSV Files</h3>
                    <p className="mb-4 text-sm text-gray-600">
                      Add one or more CSV files to merge into your history.
                      {selectedBase &&
                        ` Starting with ${selectedBase.transactions.length} existing transactions.`}
                    </p>
                  </div>

                  {/* Drop Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                      dragActive
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-300 hover:border-emerald-400'
                    }`}
                  >
                    <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                    <p className="mb-2 font-medium text-gray-700">Drag and drop CSV files here</p>
                    <p className="mb-4 text-sm text-gray-500">or</p>
                    <label className="inline-block cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700">
                      Browse Files
                      <input
                        type="file"
                        accept=".csv"
                        multiple
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Files to merge:</p>
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                        >
                          <div className="flex items-center gap-2">
                            <FileUp className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm text-gray-700">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="rounded p-1 transition-colors hover:bg-gray-200"
                          >
                            <X className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setStep('select-base')}
                      className="flex-1 rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleMerge}
                      disabled={uploadedFiles.length === 0 || loading}
                      className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Merge Files'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Preview */}
              {step === 'preview' && mergeResult && (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">Merge Preview</h3>
                    <p className="mb-4 text-sm text-gray-600">
                      Review the merge results before saving.
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-blue-50 p-4">
                      <p className="text-sm font-semibold text-blue-600">Original Transactions</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {mergeResult.stats.originalCount}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-4">
                      <p className="text-sm font-semibold text-emerald-600">New Transactions</p>
                      <p className="text-2xl font-bold text-emerald-900">
                        {mergeResult.stats.newCount - mergeResult.stats.duplicatesFound}
                      </p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <p className="text-sm font-semibold text-amber-600">Duplicates Found</p>
                      </div>
                      <p className="text-2xl font-bold text-amber-900">
                        {mergeResult.stats.duplicatesFound}
                      </p>
                    </div>
                    <div className="rounded-xl bg-purple-50 p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-purple-600" />
                        <p className="text-sm font-semibold text-purple-600">Final Total</p>
                      </div>
                      <p className="text-2xl font-bold text-purple-900">
                        {mergeResult.stats.mergedCount}
                      </p>
                    </div>
                  </div>

                  {/* Duplicates Warning */}
                  {mergeResult.duplicates.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                        <div>
                          <p className="font-semibold text-amber-900">Duplicates Detected</p>
                          <p className="mt-1 text-sm text-amber-700">
                            {mergeResult.duplicates.length} transactions were skipped because they
                            already exist in your history.
                          </p>
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm text-amber-600 hover:text-amber-800">
                              View duplicates
                            </summary>
                            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                              {mergeResult.duplicates.slice(0, 20).map((t, i) => (
                                <div
                                  key={i}
                                  className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-700"
                                >
                                  {t.purchaseDate instanceof Date
                                    ? t.purchaseDate.toLocaleDateString()
                                    : t.purchaseDate}{' '}
                                  - {t.bookingText.slice(0, 40)}... ({formatCurrency(t.debit || 0)})
                                </div>
                              ))}
                              {mergeResult.duplicates.length > 20 && (
                                <p className="text-xs text-amber-600">
                                  ...and {mergeResult.duplicates.length - 20} more
                                </p>
                              )}
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* History Name */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Save as:
                    </label>
                    <input
                      type="text"
                      value={historyName}
                      onChange={(e) => setHistoryName(e.target.value)}
                      className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-emerald-500 focus:outline-none"
                      placeholder="Enter a name for this history..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setStep('upload')}
                      className="flex-1 rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSaveHistory}
                      disabled={loading || !historyName.trim()}
                      className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save History'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Complete */}
              {step === 'complete' && mergeResult && (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle className="h-10 w-10 text-emerald-600" />
                  </div>
                  <h3 className="mb-2 text-2xl font-bold text-gray-900">History Saved!</h3>
                  <p className="mb-6 text-gray-600">
                    Your transaction history with {mergeResult.stats.mergedCount} transactions has
                    been saved.
                  </p>
                  <button
                    onClick={handleClose}
                    className="rounded-xl bg-emerald-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
