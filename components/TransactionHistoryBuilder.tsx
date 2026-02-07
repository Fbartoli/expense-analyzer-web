'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Plus, FileUp, AlertTriangle, CheckCircle, History, Layers, Upload } from 'lucide-react'
import { getAllAnalyses, saveAnalysis, type SavedAnalysis } from '@/lib/db'
import { parseCSV } from '@/lib/parser'
import { analyzeExpenses } from '@/lib/analyzer'
import { mergeTransactions, type MergeResult } from '@/lib/merge'
import type { Transaction } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'

interface TransactionHistoryBuilderProps {
  onHistoryBuilt?: (transactions: Transaction[]) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

type Step = 'select-base' | 'upload' | 'preview' | 'complete'

export function TransactionHistoryBuilder({
  onHistoryBuilt,
  open,
  onOpenChange,
}: TransactionHistoryBuilderProps) {
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
  const [step, setStep] = useState<Step>('select-base')
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [loading, setLoading] = useState(false)

  const [selectedBase, setSelectedBase] = useState<SavedAnalysis | null>(null)
  const [baseTransactions, setBaseTransactions] = useState<Transaction[]>([])

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)

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
      let allNewTransactions: Transaction[] = []
      for (const file of uploadedFiles) {
        const parsed = await parseCSV(file)
        allNewTransactions = [...allNewTransactions, ...parsed]
      }

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
      const report = analyzeExpenses(mergeResult.merged)
      await saveAnalysis('Merged History', mergeResult.merged, report, historyName)

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
      {!isControlled && (
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="rounded-xl border-2 px-6 py-3 font-semibold"
        >
          <History className="mr-2 h-5 w-5" />
          Build History
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
          {/* Header */}
          <DialogHeader className="border-b bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-2">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white">
                  Transaction History Builder
                </DialogTitle>
                <DialogDescription className="text-sm text-emerald-100">
                  Merge multiple CSVs with duplicate detection
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 border-b bg-gray-50 px-6 py-4 dark:bg-gray-900">
            {['select-base', 'upload', 'preview', 'complete'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    step === s
                      ? 'bg-emerald-600 text-white'
                      : ['select-base', 'upload', 'preview', 'complete'].indexOf(step) > i
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-200 text-muted-foreground dark:bg-gray-700'
                  }`}
                >
                  {i + 1}
                </div>
                {i < 3 && <div className="mx-1 h-0.5 w-8 bg-gray-200 dark:bg-gray-700" />}
              </div>
            ))}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-6">
            {/* Step 1: Select Base */}
            {step === 'select-base' && (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Select Base Analysis
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Choose an existing analysis to extend, or start fresh.
                  </p>
                </div>

                <Card
                  className={`cursor-pointer transition-all ${
                    selectedBase === null
                      ? 'border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                      : 'border-2 border-gray-200 hover:border-emerald-300 dark:border-gray-700'
                  }`}
                  onClick={() => handleSelectBase(null)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <Plus className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Start Fresh</p>
                      <p className="text-sm text-muted-foreground">
                        Create a new transaction history
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {analyses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Or extend an existing analysis:
                    </p>
                    {analyses.map((analysis) => (
                      <Card
                        key={analysis.id}
                        className={`cursor-pointer transition-all ${
                          selectedBase?.id === analysis.id
                            ? 'border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                            : 'border-2 border-gray-200 hover:border-emerald-300 dark:border-gray-700'
                        }`}
                        onClick={() => handleSelectBase(analysis)}
                      >
                        <CardContent className="flex items-center justify-between p-4">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {analysis.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {analysis.transactions.length} transactions
                            </p>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(analysis.report.totalSpent)}
                          </span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="pt-4">
                  <Button
                    onClick={() => setStep('upload')}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Upload Files */}
            {step === 'upload' && (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Upload CSV Files
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
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
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                      : 'border-gray-300 hover:border-emerald-400 dark:border-gray-600'
                  }`}
                >
                  <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <p className="mb-2 font-medium text-gray-700 dark:text-gray-300">
                    Drag and drop CSV files here
                  </p>
                  <p className="mb-4 text-sm text-muted-foreground">or</p>
                  <label className="inline-block cursor-pointer">
                    <Button className="bg-emerald-600 hover:bg-emerald-700">Browse Files</Button>
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
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Files to merge:
                    </p>
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900"
                      >
                        <div className="flex items-center gap-2">
                          <FileUp className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {file.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {(file.size / 1024).toFixed(1)} KB
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(index)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep('select-base')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleMerge}
                    disabled={uploadedFiles.length === 0 || loading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {loading ? 'Processing...' : 'Merge Files'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {step === 'preview' && mergeResult && (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Merge Preview
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Review the merge results before saving.
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-blue-50 dark:bg-blue-950">
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-blue-600">Original Transactions</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {mergeResult.stats.originalCount}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-50 dark:bg-emerald-950">
                    <CardContent className="p-4">
                      <p className="text-sm font-semibold text-emerald-600">New Transactions</p>
                      <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                        {mergeResult.stats.newCount - mergeResult.stats.duplicatesFound}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 dark:bg-amber-950">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <p className="text-sm font-semibold text-amber-600">Duplicates Found</p>
                      </div>
                      <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                        {mergeResult.stats.duplicatesFound}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50 dark:bg-purple-950">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-purple-600" />
                        <p className="text-sm font-semibold text-purple-600">Final Total</p>
                      </div>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {mergeResult.stats.mergedCount}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Duplicates Warning */}
                {mergeResult.duplicates.length > 0 && (
                  <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                      <p className="font-semibold text-amber-900 dark:text-amber-100">
                        Duplicates Detected
                      </p>
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
                    </AlertDescription>
                  </Alert>
                )}

                {/* History Name */}
                <div>
                  <Label htmlFor="history-name" className="mb-2 block text-sm font-semibold">
                    Save as:
                  </Label>
                  <Input
                    id="history-name"
                    type="text"
                    value={historyName}
                    onChange={(e) => setHistoryName(e.target.value)}
                    placeholder="Enter a name for this history..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setStep('upload')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleSaveHistory}
                    disabled={loading || !historyName.trim()}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {loading ? 'Saving...' : 'Save History'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {step === 'complete' && mergeResult && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                  <CheckCircle className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  History Saved!
                </h3>
                <p className="mb-6 text-muted-foreground">
                  Your transaction history with {mergeResult.stats.mergedCount} transactions has
                  been saved.
                </p>
                <Button onClick={handleClose} className="bg-emerald-600 hover:bg-emerald-700">
                  Done
                </Button>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
