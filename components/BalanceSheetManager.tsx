'use client'

import { useState } from 'react'
import { Landmark, Archive, RefreshCw, Camera } from 'lucide-react'
import type { BalanceEntry, HouseholdMember, PersistedAccount } from '@/lib/types'
import { ACCOUNT_CATEGORY_LABELS } from '@/lib/net-worth'
import { formatCHF, formatLocalDate, toLocalDateKey } from '@/lib/format'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { AddAccountForm } from '@/components/AddAccountForm'
import type { NewAccountInput, UpdateBalanceInput } from '@/lib/use-balance-sheet'

interface BalanceSheetManagerProps {
  isOpen: boolean
  onClose: () => void
  members: HouseholdMember[]
  accounts: PersistedAccount[]
  latestBalances: Map<number, BalanceEntry>
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  error: string | null
  loading: boolean
  lastSnapshotDate: Date | null
  onAddAccount: (input: NewAccountInput) => Promise<boolean>
  onUpdateBalance: (input: UpdateBalanceInput) => Promise<boolean>
  onArchiveAccount: (id: number) => Promise<boolean>
  onTakeSnapshot: () => Promise<boolean>
  onLoadBalanceHistory: (accountId: number) => Promise<BalanceEntry[]>
  onClearError: () => void
}

export function BalanceSheetManager({
  isOpen,
  onClose,
  members,
  accounts,
  latestBalances,
  totalAssets,
  totalLiabilities,
  netWorth,
  error,
  loading,
  lastSnapshotDate,
  onAddAccount,
  onUpdateBalance,
  onArchiveAccount,
  onTakeSnapshot,
  onLoadBalanceHistory,
  onClearError,
}: BalanceSheetManagerProps) {
  const [saving, setSaving] = useState(false)

  // Update balance form
  const [updatingAccountId, setUpdatingAccountId] = useState<number | null>(null)
  const [updateAmount, setUpdateAmount] = useState('')
  const [updateDate, setUpdateDate] = useState(toLocalDateKey(new Date()))
  const [updateNotes, setUpdateNotes] = useState('')

  // Balance history (loaded on demand per account)
  const [historyAccountId, setHistoryAccountId] = useState<number | null>(null)
  const [balanceHistory, setBalanceHistory] = useState<BalanceEntry[]>([])

  const handleAddAccount = async (input: NewAccountInput) => {
    setSaving(true)
    const ok = await onAddAccount(input)
    setSaving(false)
    return ok
  }

  const handleArchiveAccount = async (id: number) => {
    await onArchiveAccount(id)
  }

  const handleUpdateBalance = async () => {
    if (updatingAccountId === null || !updateAmount) return
    setSaving(true)
    const ok = await onUpdateBalance({
      accountId: updatingAccountId,
      amount: parseFloat(updateAmount),
      date: new Date(updateDate + 'T12:00:00'),
      notes: updateNotes.trim(),
    })
    setSaving(false)
    if (ok) {
      setUpdatingAccountId(null)
      setUpdateAmount('')
      setUpdateDate(toLocalDateKey(new Date()))
      setUpdateNotes('')
    }
  }

  const handleShowHistory = async (accountId: number) => {
    if (historyAccountId === accountId) {
      setHistoryAccountId(null)
      return
    }
    const entries = await onLoadBalanceHistory(accountId)
    setBalanceHistory(entries)
    setHistoryAccountId(accountId)
  }

  const handleTakeSnapshot = async () => {
    setSaving(true)
    await onTakeSnapshot()
    setSaving(false)
  }

  const assetAccounts = accounts.filter((a) => a.type === 'asset')
  const liabilityAccounts = accounts.filter((a) => a.type === 'liability')

  const renderAccountRow = (account: PersistedAccount) => {
    const balance = latestBalances.get(account.id)
    const isUpdating = updatingAccountId === account.id
    const showingHistory = historyAccountId === account.id

    return (
      <div key={account.id} className="space-y-2">
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-gray-600">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{account.name}</p>
              <Badge variant="secondary" className="text-xs">
                {ACCOUNT_CATEGORY_LABELS[account.category]}
              </Badge>
              {account.memberId &&
                (() => {
                  const member = members.find((m) => m.id === account.memberId)
                  return member ? (
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: member.color,
                        color: member.color,
                      }}
                    >
                      {member.name}
                    </Badge>
                  ) : null
                })()}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                className={`font-bold ${
                  account.type === 'asset'
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {formatCHF(balance?.amount ?? 0)}
              </span>
              {balance && (
                <span className="text-muted-foreground">
                  Updated {formatLocalDate(balance.date)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleShowHistory(account.id)}
              title="Balance history"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isUpdating) {
                  setUpdatingAccountId(null)
                } else {
                  setUpdatingAccountId(account.id)
                  setUpdateAmount(balance?.amount?.toString() ?? '')
                  setUpdateDate(toLocalDateKey(new Date()))
                  setUpdateNotes('')
                }
              }}
              className="text-teal-600 hover:text-teal-700 dark:text-teal-400"
            >
              Update
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleArchiveAccount(account.id)}
              className="text-gray-400 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 dark:hover:bg-red-950"
              title="Archive account"
            >
              <Archive className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isUpdating && (
          <div className="ml-4 rounded-lg border border-teal-200 bg-teal-50 p-3 dark:border-teal-800 dark:bg-teal-950">
            <div className="flex flex-wrap gap-2">
              <Input
                type="number"
                value={updateAmount}
                onChange={(e) => setUpdateAmount(e.target.value)}
                placeholder="New balance"
                step="0.01"
                className="w-28 flex-1"
                autoFocus
              />
              <Input
                type="date"
                value={updateDate}
                onChange={(e) => setUpdateDate(e.target.value)}
                className="w-36"
              />
              <Input
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                placeholder="Note (optional)"
                className="flex-1"
              />
              <Button
                onClick={handleUpdateBalance}
                disabled={!updateAmount || saving}
                size="sm"
                className="bg-teal-500 hover:bg-teal-600"
              >
                Save
              </Button>
            </div>
          </div>
        )}

        {showingHistory && balanceHistory.length > 0 && (
          <div className="ml-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
            <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              Balance History
            </p>
            <div className="space-y-1">
              {[...balanceHistory].reverse().map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatLocalDate(entry.date)}</span>
                  <div className="flex items-center gap-2">
                    {entry.notes && (
                      <span className="text-xs text-muted-foreground">{entry.notes}</span>
                    )}
                    <span className="font-medium">{formatCHF(entry.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden p-0">
        <DialogHeader className="border-b bg-gradient-to-r from-teal-500 to-cyan-500 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <Landmark className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white">Balance Sheet</DialogTitle>
              <DialogDescription className="text-sm text-teal-100">
                Manage accounts and track your net worth
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={onClearError} className="h-auto p-0">
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              <AddAccountForm members={members} saving={saving} onAdd={handleAddAccount} />

              <Separator />

              {accounts.length === 0 ? (
                <div className="py-8 text-center">
                  <Landmark className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                  <p className="font-medium text-gray-600 dark:text-gray-400">No accounts yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add an account above to start tracking
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assetAccounts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Assets
                        </h3>
                        <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                          {formatCHF(totalAssets)}
                        </span>
                      </div>
                      {assetAccounts.map(renderAccountRow)}
                    </div>
                  )}

                  {liabilityAccounts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Liabilities
                        </h3>
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                          {formatCHF(totalLiabilities)}
                        </span>
                      </div>
                      {liabilityAccounts.map(renderAccountRow)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-col gap-2 border-t bg-gray-50 p-4 dark:bg-gray-900">
          {accounts.length > 0 && (
            <>
              <div className="flex w-full items-center justify-between text-sm">
                <span className="text-muted-foreground">Net Worth</span>
                <span
                  className={`text-lg font-bold ${
                    netWorth >= 0
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCHF(netWorth)}
                </span>
              </div>
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {lastSnapshotDate
                    ? `Last snapshot: ${formatLocalDate(lastSnapshotDate)}`
                    : 'No snapshots yet'}
                </span>
                <Button variant="outline" size="sm" onClick={handleTakeSnapshot} disabled={saving}>
                  <Camera className="mr-2 h-4 w-4" />
                  Take Snapshot
                </Button>
              </div>
            </>
          )}
          <Button variant="secondary" onClick={onClose} className="w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
