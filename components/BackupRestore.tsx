'use client'

import { useState, useRef } from 'react'
import { Download, Upload, X, Shield, Lock, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react'
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
  const [importPreview, setImportPreview] = useState<{ date: string; analyses: number; budgets: number } | null>(null)
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

      setSuccess(`Backup created successfully! Includes ${backupData.analyses.length} analyses and ${backupData.budgets.length} budgets.`)
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-slate-700 to-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Backup & Restore</h2>
              <p className="text-slate-300 text-sm">Encrypted data protection</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Menu */}
          {step === 'menu' && !success && (
            <div className="space-y-3">
              <button
                onClick={() => setStep('export')}
                className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-xl transition-colors text-left"
              >
                <div className="p-3 bg-blue-500 rounded-xl">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Create Backup</p>
                  <p className="text-sm text-gray-600">Export all data with password protection</p>
                </div>
              </button>

              <button
                onClick={() => setStep('import')}
                className="w-full flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-xl transition-colors text-left"
              >
                <div className="p-3 bg-purple-500 rounded-xl">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Restore Backup</p>
                  <p className="text-sm text-gray-600">Import from encrypted backup file</p>
                </div>
              </button>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-700">
                  <Lock className="w-3 h-3 inline mr-1" />
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
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                &larr; Back
              </button>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Create a password for your backup
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full p-3 pr-10 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {PASSWORD_REQUIREMENTS.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {req.test(password) ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-gray-300" />
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-700">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Remember this password! Without it, you cannot restore your backup.
                </p>
              </div>

              <button
                onClick={handleExport}
                disabled={loading || !validatePassword(password) || password !== confirmPassword}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
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
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                &larr; Back
              </button>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-colors"
                >
                  {importFile ? (
                    <div className="flex items-center justify-center gap-2 text-purple-700">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">{importFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <p className="font-medium">Click to select backup file</p>
                      <p className="text-xs">.encrypted.json</p>
                    </div>
                  )}
                </button>
              </div>

              {importFile && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Enter backup password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter backup password"
                      className="w-full p-3 pr-10 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs text-red-700">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Warning: Restoring will replace all existing data!
                </p>
              </div>

              <button
                onClick={handleImport}
                disabled={loading || !importFile || !password}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
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
              className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
