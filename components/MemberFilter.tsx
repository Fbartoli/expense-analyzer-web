'use client'

import { useState, useMemo } from 'react'
import { Users, ChevronDown, X } from 'lucide-react'
import { getMemberForTransaction } from '@/lib/members'
import type { Transaction, HouseholdMember } from '@/lib/types'
import { Button } from '@/components/ui/button'

interface MemberFilterProps {
  members: HouseholdMember[]
  transactions: Transaction[]
  memberOverrides: Map<number, string>
  onFilter: (filtered: Transaction[] | null, member: string | null) => void
}

export function MemberFilter({
  members,
  transactions,
  memberOverrides,
  onFilter,
}: MemberFilterProps) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const memberNames = useMemo(() => {
    const names = new Set<string>()
    transactions.forEach((t, i) => {
      const name = getMemberForTransaction(i, t, members, memberOverrides)
      if (name) names.add(name)
    })
    return Array.from(names).sort()
  }, [transactions, members, memberOverrides])

  // Check if there are any unassigned transactions
  const hasUnassigned = useMemo(() => {
    return transactions.some((t, i) => {
      return !getMemberForTransaction(i, t, members, memberOverrides)
    })
  }, [transactions, members, memberOverrides])

  if (members.length === 0) return null

  function handleSelect(member: string | null) {
    setSelectedMember(member)
    setIsOpen(false)

    if (!member) {
      onFilter(null, null)
      return
    }

    const filtered = transactions.filter((t, i) => {
      const txMember = getMemberForTransaction(i, t, members, memberOverrides)
      if (member === 'Unassigned') return !txMember
      return txMember === member
    })
    onFilter(filtered, member)
  }

  function clearFilter() {
    setSelectedMember(null)
    onFilter(null, null)
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Button
          variant={selectedMember ? 'default' : 'outline'}
          onClick={() => setIsOpen(!isOpen)}
          className={`rounded-xl border-2 px-4 py-2 font-semibold ${
            selectedMember ? 'bg-indigo-600 hover:bg-indigo-700' : ''
          }`}
        >
          <Users className="mr-2 h-4 w-4" />
          {selectedMember ?? 'All Members'}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
        {selectedMember && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFilter}
            className="h-8 w-8"
            aria-label="Clear member filter"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 min-w-48 rounded-xl border-2 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <button
              onClick={() => handleSelect(null)}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                !selectedMember ? 'font-semibold text-indigo-600' : ''
              }`}
            >
              All Members
            </button>
            {memberNames.map((name) => (
              <button
                key={name}
                onClick={() => handleSelect(name)}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  selectedMember === name ? 'font-semibold text-indigo-600' : ''
                }`}
              >
                {name}
              </button>
            ))}
            {hasUnassigned && (
              <button
                onClick={() => handleSelect('Unassigned')}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  selectedMember === 'Unassigned' ? 'font-semibold text-indigo-600' : ''
                }`}
              >
                Unassigned
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
