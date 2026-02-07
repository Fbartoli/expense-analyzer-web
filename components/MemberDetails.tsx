'use client'

import { format } from 'date-fns'
import { TrendingDown } from 'lucide-react'
import type { Transaction, ManualRecurringTransaction } from '@/lib/types'
import { transactionFingerprint } from '@/lib/recurring'
import { MarkRecurringButton } from './MarkRecurringButton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MemberDetailsProps {
  memberName: string
  transactions: Transaction[]
  color: string
  onClose: () => void
  onMarkRecurring?: (entry: Omit<ManualRecurringTransaction, 'id'>) => void
  taggedFingerprints?: Set<string>
}

export function MemberDetails({
  memberName,
  transactions,
  color,
  onClose,
  onMarkRecurring,
  taggedFingerprints,
}: MemberDetailsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const totalSpent = transactions.reduce((sum, t) => sum + (t.debit || 0), 0)
  const avgTransaction = transactions.length > 0 ? totalSpent / transactions.length : 0

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader
          className="p-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          }}
        >
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-white">
            <div
              className="h-4 w-4 rounded-full border-2 border-white/50"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            {memberName}
          </DialogTitle>
          <DialogDescription className="text-white/80">
            {transactions.length} transactions &bull; {formatCurrency(totalSpent)} total
          </DialogDescription>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-white/10 p-3">
              <p className="text-sm text-white/80">Average Transaction</p>
              <p className="text-xl font-bold text-white">{formatCurrency(avgTransaction)}</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <p className="text-sm text-white/80">Total Spent</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totalSpent)}</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-220px)] p-6">
          <div className="space-y-3">
            {transactions
              .sort((a, b) => (b.debit || 0) - (a.debit || 0))
              .map((transaction, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-red-50 p-2 dark:bg-red-950">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {transaction.bookingText}
                          </h3>
                          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                            <span>
                              {transaction.purchaseDate &&
                              !isNaN(transaction.purchaseDate.getTime())
                                ? format(transaction.purchaseDate, 'MMM d, yyyy')
                                : 'Invalid date'}
                            </span>
                            <span>&bull;</span>
                            <Badge variant="secondary" className="text-xs">
                              {transaction.sector}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {transaction.accountHolder && (
                        <p className="ml-12 mt-2 text-xs text-muted-foreground">
                          {transaction.accountHolder}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex flex-col items-end gap-1">
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(transaction.debit || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">{transaction.currency}</p>
                      {onMarkRecurring && (
                        <MarkRecurringButton
                          transaction={transaction}
                          isAlreadyTagged={
                            taggedFingerprints?.has(transactionFingerprint(transaction)) ?? false
                          }
                          onMarkRecurring={onMarkRecurring}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
