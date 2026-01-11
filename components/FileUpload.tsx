'use client'

import { useRef, useState } from 'react'
import { Upload, FileText, Loader2, X, AlertTriangle } from 'lucide-react'

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-2 transition-colors hover:bg-gray-100"
        >
          <X className="h-6 w-6 text-gray-600" />
        </button>

        <div
          className={`border-3 relative rounded-2xl border-dashed p-16 transition-all ${
            dragActive
              ? 'scale-[1.02] border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
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
              <>
                <Loader2 className="mx-auto mb-6 h-20 w-20 animate-spin text-blue-600" />
                <p className="mb-2 text-xl font-bold text-gray-800">Processing...</p>
                <p className="text-base text-gray-600">Analyzing your expense data</p>
              </>
            ) : selectedFile ? (
              <>
                <FileText className="mx-auto mb-6 h-20 w-20 text-green-500" />
                <p className="mb-2 text-xl font-bold text-gray-800">{selectedFile.name}</p>
                <p className="mb-6 text-base text-gray-600">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={onButtonClick}
                  className="transform rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
                >
                  Upload Different File
                </button>
              </>
            ) : (
              <>
                <Upload className="mx-auto mb-6 h-20 w-20 text-gray-400" />
                <p className="mb-3 text-2xl font-bold text-gray-800">Upload your expense CSV</p>
                <p className="mb-6 text-base text-gray-600">
                  Drag and drop your file here, or click to browse
                </p>
                {fileError && (
                  <div className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <span>{fileError}</span>
                  </div>
                )}
                <button
                  onClick={onButtonClick}
                  className="transform rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-lg font-bold text-white shadow-xl transition-all hover:-translate-y-1 hover:from-blue-700 hover:to-purple-700 hover:shadow-2xl"
                >
                  Select File
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Supported format: CSV files with columns for account, date, description, amount, etc.
          </p>
        </div>
      </div>
    </div>
  )
}
