'use client'

import { useState, useEffect } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import type { AccountCategory, AccountType, HouseholdMember } from '@/lib/types'
import {
  ACCOUNT_CATEGORY_LABELS,
  ASSET_CATEGORY_OPTIONS,
  LIABILITY_CATEGORY_OPTIONS,
} from '@/lib/net-worth'
import { toLocalDateKey } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { NewAccountInput } from '@/lib/use-balance-sheet'

interface AddAccountFormProps {
  members: HouseholdMember[]
  saving: boolean
  onAdd: (input: NewAccountInput) => Promise<boolean>
}

export function AddAccountForm({ members, saving, onAdd }: AddAccountFormProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('asset')
  const [category, setCategory] = useState<AccountCategory>('checking')
  const [balance, setBalance] = useState('')
  const [date, setDate] = useState(toLocalDateKey(new Date()))
  const [memberId, setMemberId] = useState<string>('')
  const [notes, setNotes] = useState('')

  // Reset category when type flips between asset/liability.
  useEffect(() => {
    setCategory(type === 'asset' ? 'checking' : 'credit-card')
  }, [type])

  const categoryOptions = type === 'asset' ? ASSET_CATEGORY_OPTIONS : LIABILITY_CATEGORY_OPTIONS

  const handleSubmit = async () => {
    if (!name.trim()) return
    const ok = await onAdd({
      name: name.trim(),
      type,
      category,
      currency: 'CHF',
      notes: notes.trim(),
      initialBalance: balance ? parseFloat(balance) : 0,
      initialBalanceDate: new Date(date + 'T12:00:00'),
      ...(memberId ? { memberId: parseInt(memberId) } : {}),
    })
    if (ok) {
      setName('')
      setBalance('')
      setDate(toLocalDateKey(new Date()))
      setMemberId('')
      setNotes('')
    }
  }

  return (
    <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
      <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Add Account</h3>
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="account-name" className="sr-only">
              Account name
            </Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Account name"
              className="rounded-xl border-2"
            />
          </div>
          <div className="w-28">
            <Label htmlFor="initial-balance" className="sr-only">
              Initial balance
            </Label>
            <Input
              id="initial-balance"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="Balance"
              step="0.01"
              className="rounded-xl border-2"
            />
          </div>
          <div className="w-36">
            <Label htmlFor="initial-date" className="sr-only">
              Date
            </Label>
            <Input
              id="initial-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border-2"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Label htmlFor="account-type" className="sr-only">
              Account type
            </Label>
            <select
              id="account-type"
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="w-full cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white p-3 pr-10 text-sm transition-colors hover:border-teal-300 focus:border-teal-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
            >
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="relative flex-1">
            <Label htmlFor="account-category" className="sr-only">
              Category
            </Label>
            <select
              id="account-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as AccountCategory)}
              className="w-full cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white p-3 pr-10 text-sm transition-colors hover:border-teal-300 focus:border-teal-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {ACCOUNT_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          {members.length > 0 && (
            <div className="relative flex-1">
              <Label htmlFor="account-member" className="sr-only">
                Owner
              </Label>
              <select
                id="account-member"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white p-3 pr-10 text-sm transition-colors hover:border-teal-300 focus:border-teal-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="">No owner</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="h-[46px] bg-teal-500 hover:bg-teal-600"
            aria-label="Add account"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
