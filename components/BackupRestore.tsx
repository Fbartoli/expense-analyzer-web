'use client'

import { useState, useRef } from 'react'
import {
  Download,
  Upload,
  X,
  Shield,
  Lock,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { exportAllData, importAllData, isValidBackupData, type BackupData } from '@/lib/db'
import { encryptData, decryptData, isValidEncryptedBackup, type EncryptedData } from '@/lib/crypto'

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
]

function validatePassword(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((req) => req.test(password))
}

interface BackupRestoreProps {
  isOpen: boolean
  onClose: () => void
  onRestoreComplete: () => void
}

type Step = 'menu' | 'export' | 'import'

export function BackupRestore({ isOpen, onClose, onRestoreComplete }: BackupRestoreProps) {
  const [step, setStep] = useState<Step>('menu')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [_importPreview, setImportPreview] = useState<{
    date: string
    analyses: number
    budgets: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setStep('menu')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setError(null)
    setSuccess(null)
    setImportFile(null)
    setImportPreview(null)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleExport = async () => {
    if (!validatePassword(password)) {
      setError('Password does not meet all requirements')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Export all data
      const backupData = await exportAllData()

      // Encrypt with password
      const jsonData = JSON.stringify(backupData)
      const encryptedData = await encryptData(jsonData, password)

      // Create and download file
      const blob = new Blob([JSON.stringify(encryptedData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `expense-backup-${new Date().toISOString().split('T')[0]}.encrypted.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccess(
        `Backup created successfully! Includes ${backupData.analyses.length} analyses and ${backupData.budgets.length} budgets.`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFile(file)
    setError(null)
    setImportPreview(null)

    // Try to read and validate the file structure (without decrypting)
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!isValidEncryptedBackup(data)) {
        setError('Invalid backup file format')
        setImportFile(null)
        return
      }

      // We can't preview contents without decrypting, but we can show file info
      setImportPreview({
        date: 'Encrypted',
        analyses: -1,
        budgets: -1,
      })
    } catch {
      setError('Failed to read backup file')
      setImportFile(null)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      setError('Please select a backup file')
      return
    }
    if (!password) {
      setError('Please enter the backup password')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Read file
      const text = await importFile.text()
      const encryptedData: EncryptedData = JSON.parse(text)

      if (!isValidEncryptedBackup(encryptedData)) {
        throw new Error('Invalid backup file format')
      }

      // Decrypt with password
      const decryptedJson = await decryptData(encryptedData, password)
      const backupData: BackupData = JSON.parse(decryptedJson)

      if (!isValidBackupData(backupData)) {
        throw new Error('Invalid backup data structure')
      }

      // Import data
      const result = await importAllData(backupData)

      setSuccess(
        `Restore complete! Imported ${result.analysesCount} analyses, ${result.budgetsCount} budgets${result.hasChartPreferences ? ', and chart preferences' : ''}.`
      )

      // Notify parent to refresh data
      onRestoreComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-slate-700 to-slate-800 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Backup & Restore</h2>
              <p className="text-sm text-slate-300">Encrypted data protection</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-xl p-2 transition-colors hover:bg-white/20"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Success Message */}
          {success && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
              <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Menu */}
          {step === 'menu' && !success && (
            <div className="space-y-3">
              <button
                onClick={() => setStep('export')}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100"
              >
                <div className="rounded-xl bg-blue-500 p-3">
                  <Download className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Create Backup</p>
                  <p className="text-sm text-gray-600">Export all data with password protection</p>
                </div>
              </button>

              <button
                onClick={() => setStep('import')}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-purple-200 bg-purple-50 p-4 text-left transition-colors hover:bg-purple-100"
              >
                <div className="rounded-xl bg-purple-500 p-3">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Restore Backup</p>
                  <p className="text-sm text-gray-600">Import from encrypted backup file</p>
                </div>
              </button>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-700">
                  <Lock className="mr-1 inline h-3 w-3" />
                  Backups are encrypted with AES-256. Your password is never stored.
                </p>
              </div>
            </div>
          )}

          {/* Export Form */}
          {step === 'export' && !success && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('menu')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                &larr; Back
              </button>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Create a password for your backup
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-xl border-2 border-gray-200 p-3 pr-10 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {PASSWORD_REQUIREMENTS.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {req.test(password) ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-gray-300" />
                        )}
                        <span className={req.test(password) ? 'text-green-600' : 'text-gray-500'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Confirm password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-700">
                  <AlertTriangle className="mr-1 inline h-3 w-3" />
                  Remember this password! Without it, you cannot restore your backup.
                </p>
              </div>

              <button
                onClick={handleExport}
                disabled={loading || !validatePassword(password) || password !== confirmPassword}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Create Encrypted Backup
                  </>
                )}
              </button>
            </div>
          )}

          {/* Import Form */}
          {step === 'import' && !success && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('menu')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                &larr; Back
              </button>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Select backup file
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-gray-300 p-4 transition-colors hover:border-purple-400 hover:bg-purple-50"
                >
                  {importFile ? (
                    <div className="flex items-center justify-center gap-2 text-purple-700">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{importFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <Upload className="mx-auto mb-2 h-8 w-8" />
                      <p className="font-medium">Click to select backup file</p>
                      <p className="text-xs">.encrypted.json</p>
                    </div>
                  )}
                </button>
              </div>

              {importFile && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Enter backup password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter backup password"
                      className="w-full rounded-xl border-2 border-gray-200 p-3 pr-10 focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-xs text-red-700">
                  <AlertTriangle className="mr-1 inline h-3 w-3" />
                  Warning: Restoring will replace all existing data!
                </p>
              </div>

              <button
                onClick={handleImport}
                disabled={loading || !importFile || !password}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Restore Backup
                  </>
                )}
              </button>
            </div>
          )}

          {/* Success state - show close button */}
          {success && (
            <button
              onClick={handleClose}
              className="w-full rounded-xl bg-gray-200 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-300"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
