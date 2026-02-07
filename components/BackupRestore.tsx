'use client'

import { useState, useRef } from 'react'
import {
  Download,
  Upload,
  Shield,
  Lock,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { exportAllData, importAllData, isValidBackupData, type BackupData } from '@/lib/db'
import { encryptData, decryptData, isValidEncryptedBackup, type EncryptedData } from '@/lib/crypto'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'

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
      const backupData = await exportAllData()
      const jsonData = JSON.stringify(backupData)
      const encryptedData = await encryptData(jsonData, password)

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

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!isValidEncryptedBackup(data)) {
        setError('Invalid backup file format')
        setImportFile(null)
        return
      }

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
      const text = await importFile.text()
      const encryptedData: EncryptedData = JSON.parse(text)

      if (!isValidEncryptedBackup(encryptedData)) {
        throw new Error('Invalid backup file format')
      }

      const decryptedJson = await decryptData(encryptedData, password)
      const backupData: BackupData = JSON.parse(decryptedJson)

      if (!isValidBackupData(backupData)) {
        throw new Error('Invalid backup data structure')
      }

      const result = await importAllData(backupData)

      setSuccess(
        `Restore complete! Imported ${result.analysesCount} analyses, ${result.budgetsCount} budgets${result.hasChartPreferences ? ', and chart preferences' : ''}.`
      )

      onRestoreComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="border-b bg-gradient-to-r from-slate-700 to-slate-800 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">Backup & Restore</DialogTitle>
              <DialogDescription className="text-sm text-slate-300">
                Encrypted data protection
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-6">
          {/* Success Message */}
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert
              variant="destructive"
              className="mb-4"
              id={
                step === 'export'
                  ? 'export-password-error'
                  : step === 'import'
                    ? 'import-password-error'
                    : undefined
              }
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Menu */}
          {step === 'menu' && !success && (
            <div className="space-y-3">
              <button
                onClick={() => setStep('export')}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900"
              >
                <div className="rounded-xl bg-blue-500 p-3">
                  <Download className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Create Backup</p>
                  <p className="text-sm text-muted-foreground">
                    Export all data with password protection
                  </p>
                </div>
              </button>

              <button
                onClick={() => setStep('import')}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-purple-200 bg-purple-50 p-4 text-left transition-colors hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:hover:bg-purple-900"
              >
                <div className="rounded-xl bg-purple-500 p-3">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Restore Backup</p>
                  <p className="text-sm text-muted-foreground">Import from encrypted backup file</p>
                </div>
              </button>

              <Alert className="mt-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <Lock className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700">
                  Backups are encrypted with AES-256. Your password is never stored.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Export Form */}
          {step === 'export' && !success && (
            <div className="space-y-4">
              <Button
                variant="link"
                onClick={() => setStep('menu')}
                className="h-auto p-0 text-sm text-muted-foreground"
              >
                &larr; Back
              </Button>

              <div>
                <Label htmlFor="export-password" className="mb-2 block text-sm font-semibold">
                  Create a password for your backup
                </Label>
                <div className="relative">
                  <Input
                    id="export-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pr-10"
                    aria-describedby={
                      error && step === 'export' ? 'export-password-error' : undefined
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                        <span
                          className={
                            req.test(password) ? 'text-green-600' : 'text-muted-foreground'
                          }
                        >
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold">
                  Confirm password
                </Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                />
              </div>

              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700">
                  Remember this password! Without it, you cannot restore your backup.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleExport}
                disabled={loading || !validatePassword(password) || password !== confirmPassword}
                className="w-full"
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Create Encrypted Backup
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Import Form */}
          {step === 'import' && !success && (
            <div className="space-y-4">
              <Button
                variant="link"
                onClick={() => setStep('menu')}
                className="h-auto p-0 text-sm text-muted-foreground"
              >
                &larr; Back
              </Button>

              <div>
                <Label className="mb-2 block text-sm font-semibold">Select backup file</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-gray-300 p-4 transition-colors hover:border-purple-400 hover:bg-purple-50 dark:border-gray-600 dark:hover:bg-purple-950"
                >
                  {importFile ? (
                    <div className="flex items-center justify-center gap-2 text-purple-700">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{importFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="mx-auto mb-2 h-8 w-8" />
                      <p className="font-medium">Click to select backup file</p>
                      <p className="text-xs">.encrypted.json</p>
                    </div>
                  )}
                </button>
              </div>

              {importFile && (
                <div>
                  <Label htmlFor="import-password" className="mb-2 block text-sm font-semibold">
                    Enter backup password
                  </Label>
                  <div className="relative">
                    <Input
                      id="import-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter backup password"
                      className="pr-10"
                      aria-describedby={
                        error && step === 'import' ? 'import-password-error' : undefined
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Warning: Restoring will replace all existing data!
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleImport}
                disabled={loading || !importFile || !password}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Restore Backup
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Success state - show close button */}
          {success && (
            <Button variant="secondary" onClick={handleClose} className="w-full">
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
