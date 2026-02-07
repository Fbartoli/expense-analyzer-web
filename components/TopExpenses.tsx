'use client'

import { format } from 'date-fns'
import { ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Transaction } from '@/lib/types'

interface TopExpensesProps {
  transactions: Transaction[]
}

export function TopExpenses({ transactions }: TopExpensesProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  return (
    <Card className="border-2 border-gray-50 shadow-xl">
      <CardHeader>
        <h2 className="mb-1 text-3xl font-bold text-gray-900 dark:text-gray-100">
          Top 10 Expenses
        </h2>
        <p className="text-muted-foreground">Your highest transactions this period</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-gray-200 dark:border-gray-700">
                <TableHead className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  Date
                </TableHead>
                <TableHead className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  Description
                </TableHead>
                <TableHead className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  Category
                </TableHead>
                <TableHead className="text-right text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction, index) => (
                <TableRow
                  key={index}
                  className="group border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                >
                  <TableCell className="text-sm font-medium text-muted-foreground">
                    {transaction.purchaseDate && !isNaN(transaction.purchaseDate.getTime())
                      ? format(transaction.purchaseDate, 'MMM d, yyyy')
                      : 'Invalid date'}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-base font-semibold text-gray-900 transition-colors group-hover:text-blue-600 dark:text-gray-100">
                        {transaction.bookingText}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {transaction.accountHolder}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 dark:text-blue-300"
                    >
                      {transaction.sector}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-lg font-bold text-red-600">
                        {formatCurrency(transaction.debit || 0)}
                      </span>
                      <ArrowUpRight className="h-5 w-5 text-red-500" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
