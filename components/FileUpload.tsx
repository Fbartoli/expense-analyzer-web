'use client'

import { useRef, useState } from 'react'
import { Upload, FileText, Loader2, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface FileUploadProps {
  onFileUpload: (file: File) => void
  loading?: boolean
  isOpen: boolean
  onClose: () => void
}

export function FileUpload({ onFileUpload, loading = false, isOpen, onClose }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    setFileError(null)

    if (file.size > MAX_FILE_SIZE) {
      setFileError('File is too large. Maximum size is 10MB.')
      return
    }

    if (!(file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setFileError('Please upload a CSV file.')
      return
    }

    setSelectedFile(file)
    onFileUpload(file)
    onClose()
  }

  const onButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-8">
        <DialogHeader className="sr-only">
          <DialogTitle>Upload your expense CSV</DialogTitle>
        </DialogHeader>

        <div
          className={`relative rounded-2xl border-[3px] border-dashed p-16 transition-all ${
            dragActive
              ? 'scale-[1.02] border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleChange}
            className="hidden"
            disabled={loading}
          />

          <div className="text-center">
            {loading ? (
              <div role="status">
                <Loader2
                  className="mx-auto mb-6 h-20 w-20 animate-spin text-blue-600"
                  aria-hidden="true"
                />
                <p className="mb-2 text-xl font-bold text-gray-800 dark:text-gray-200">
                  Processing...
                </p>
                <p className="text-base text-muted-foreground">Analyzing your expense data</p>
              </div>
            ) : selectedFile ? (
              <>
                <FileText className="mx-auto mb-6 h-20 w-20 text-green-500" />
                <p className="mb-2 text-xl font-bold text-gray-800 dark:text-gray-200">
                  {selectedFile.name}
                </p>
                <p className="mb-6 text-base text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <Button
                  onClick={onButtonClick}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Upload Different File
                </Button>
              </>
            ) : (
              <>
                <Upload className="mx-auto mb-6 h-20 w-20 text-gray-400" />
                <p className="mb-3 text-2xl font-bold text-gray-800 dark:text-gray-200">
                  Upload your expense CSV
                </p>
                <p className="mb-6 text-base text-muted-foreground">
                  Drag and drop your file here, or click to browse
                </p>
                {fileError && (
                  <Alert variant="destructive" className="mb-6 inline-flex">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{fileError}</AlertDescription>
                  </Alert>
                )}
                <Button
                  size="lg"
                  onClick={onButtonClick}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-lg font-bold hover:from-blue-700 hover:to-purple-700"
                >
                  Select File
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Supported format: CSV files with columns for account, date, description, amount, etc.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
