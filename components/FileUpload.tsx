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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full relative p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div
          className={`relative border-3 border-dashed rounded-2xl p-16 transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50 scale-[1.02]'
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
                <Loader2 className="w-20 h-20 mx-auto text-blue-600 animate-spin mb-6" />
                <p className="text-xl font-bold text-gray-800 mb-2">Processing...</p>
                <p className="text-base text-gray-600">Analyzing your expense data</p>
              </>
            ) : selectedFile ? (
              <>
                <FileText className="w-20 h-20 mx-auto text-green-500 mb-6" />
                <p className="text-xl font-bold text-gray-800 mb-2">{selectedFile.name}</p>
                <p className="text-base text-gray-600 mb-6">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={onButtonClick}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Upload Different File
                </button>
              </>
            ) : (
              <>
                <Upload className="w-20 h-20 mx-auto text-gray-400 mb-6" />
                <p className="text-2xl font-bold text-gray-800 mb-3">
                  Upload your expense CSV
                </p>
                <p className="text-base text-gray-600 mb-6">
                  Drag and drop your file here, or click to browse
                </p>
                {fileError && (
                  <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 justify-center text-red-700">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>{fileError}</span>
                  </div>
                )}
                <button
                  onClick={onButtonClick}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-bold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  Select File
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500 text-center">
          <p>
            Supported format: CSV files with columns for account, date, description, amount, etc.
          </p>
        </div>
      </div>
    </div>
  )
}
