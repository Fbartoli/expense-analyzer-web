'use client'

import { useState } from 'react'
import { Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { Transaction, ManualRecurringTransaction } from '@/lib/types'
import { transactionFingerprint, normalizeMerchantName } from '@/lib/recurring'
import { categorizeTransaction } from '@/lib/analyzer'

interface MarkRecurringButtonProps {
  transaction: Transaction
  isAlreadyTagged: boolean
  onMarkRecurring: (entry: Omit<ManualRecurringTransaction, 'id'>) => void
}

export function MarkRecurringButton({
  transaction,
  isAlreadyTagged,
  onMarkRecurring,
}: MarkRecurringButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly')
  const [amount, setAmount] = useState('')

  if (isAlreadyTagged) {
    return (
      <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
        <Repeat className="mr-1 h-3 w-3" />
        Recurring
      </Badge>
    )
  }

  function handleOpen() {
    setAmount(String(transaction.debit || 0))
    setFrequency('monthly')
    setDialogOpen(true)
  }

  function handleConfirm() {
    const fingerprint = transactionFingerprint(transaction)
    const merchantName = normalizeMerchantName(transaction.bookingText)
    const category = categorizeTransaction(transaction)
    const parsedAmount = parseFloat(amount) || transaction.debit || 0

    onMarkRecurring({
      fingerprint,
      merchantName,
      bookingText: transaction.bookingText,
      category,
      frequency,
      amount: parsedAmount,
      currency: transaction.currency,
      createdDate: new Date(),
    })
    setDialogOpen(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-teal-700 dark:hover:text-teal-300"
      >
        <Repeat className="h-3 w-3" />
        Recurring
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Recurring</DialogTitle>
            <DialogDescription>
              Tag &ldquo;{transaction.bookingText}&rdquo; as a recurring transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="recurring-frequency">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                <SelectTrigger id="recurring-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurring-amount">Amount (CHF)</Label>
              <Input
                id="recurring-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="bg-teal-600 hover:bg-teal-700">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
