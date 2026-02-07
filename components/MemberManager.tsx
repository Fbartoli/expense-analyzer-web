'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Trash2, Users, CreditCard, RefreshCw, Plus } from 'lucide-react'
import {
  getAllHouseholdMembers,
  saveHouseholdMember,
  updateHouseholdMember,
  deleteHouseholdMember,
} from '@/lib/db'
import type { HouseholdMember, Transaction } from '@/lib/types'
import { detectCards } from '@/lib/members'
import type { DetectedCard } from '@/lib/members'
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
import { Label } from '@/components/ui/label'

const COLOR_PALETTE = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#6366f1',
  '#f97316',
  '#ef4444',
  '#84cc16',
]

interface MemberManagerProps {
  isOpen: boolean
  onClose: () => void
  onMembersChanged: () => void
  transactions: Transaction[]
}

export function MemberManager({
  isOpen,
  onClose,
  onMembersChanged,
  transactions,
}: MemberManagerProps) {
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(COLOR_PALETTE[0])

  // Track inline naming for unassigned detected cards: cardNumber -> { name, color }
  const [cardDrafts, setCardDrafts] = useState<Map<string, { name: string; color: string }>>(
    new Map()
  )

  // Manual member form (for members without a card)
  const [manualName, setManualName] = useState('')
  const [manualColor, setManualColor] = useState(COLOR_PALETTE[0])

  // Rescan: bump this counter to force re-detection
  const [scanKey, setScanKey] = useState(0)
  const [scanning, setScanning] = useState(false)

  const detectedCards: DetectedCard[] = useMemo(
    () => detectCards(transactions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, scanKey]
  )

  const handleRescan = useCallback(() => {
    setScanning(true)
    setScanKey((k) => k + 1)
    setTimeout(() => setScanning(false), 600)
  }, [])

  // Build a set of all card numbers already assigned to a member
  const assignedCards = useMemo(() => {
    const set = new Set<string>()
    for (const m of members) {
      for (const c of m.cardNumbers) set.add(c)
    }
    return set
  }, [members])

  const unassignedCards = useMemo(
    () => detectedCards.filter((dc) => !assignedCards.has(dc.cardNumber)),
    [detectedCards, assignedCards]
  )

  const assignedCardsList = useMemo(
    () => detectedCards.filter((dc) => assignedCards.has(dc.cardNumber)),
    [detectedCards, assignedCards]
  )

  // Members that have no cards assigned (manual members for wire transfers etc.)
  const cardlessMembers = useMemo(
    () => members.filter((m) => m.cardNumbers.length === 0),
    [members]
  )

  useEffect(() => {
    if (isOpen) {
      loadMembers()
    }
  }, [isOpen])

  const loadMembers = async () => {
    setLoading(true)
    try {
      const data = await getAllHouseholdMembers()
      setMembers(data)
    } catch (err) {
      console.error('Failed to load household members:', err)
      setError('Failed to load household members.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)

  const getNextColor = () => {
    const usedColors = new Set(members.map((m) => m.color))
    return COLOR_PALETTE.find((c) => !usedColors.has(c)) || COLOR_PALETTE[0]
  }

  const handleSaveCard = async (cardNumber: string) => {
    const draft = cardDrafts.get(cardNumber)
    if (!draft?.name.trim()) return

    setSaving(true)
    setError(null)
    try {
      await saveHouseholdMember({
        name: draft.name.trim(),
        cardNumbers: [cardNumber],
        color: draft.color,
      })
      await loadMembers()
      onMembersChanged()
      setCardDrafts((prev) => {
        const next = new Map(prev)
        next.delete(cardNumber)
        return next
      })
    } catch (err) {
      console.error('Failed to save member:', err)
      setError('Failed to save member.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveManualMember = async () => {
    if (!manualName.trim()) return

    setSaving(true)
    setError(null)
    try {
      await saveHouseholdMember({
        name: manualName.trim(),
        cardNumbers: [],
        color: manualColor,
      })
      await loadMembers()
      onMembersChanged()
      setManualName('')
      setManualColor(getNextColor())
    } catch (err) {
      console.error('Failed to save member:', err)
      setError('Failed to save member.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateMember = async (member: HouseholdMember) => {
    if (!editName.trim()) return

    setSaving(true)
    setError(null)
    try {
      await updateHouseholdMember(member.id!, {
        name: editName.trim(),
        cardNumbers: member.cardNumbers,
        color: editColor,
      })
      await loadMembers()
      onMembersChanged()
      setEditingId(null)
    } catch (err) {
      console.error('Failed to update member:', err)
      setError('Failed to update member.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteHouseholdMember(id)
      await loadMembers()
      onMembersChanged()
      if (editingId === id) setEditingId(null)
    } catch (err) {
      console.error('Failed to delete member:', err)
      setError('Failed to delete member.')
    }
  }

  const handleStartEdit = (member: HouseholdMember) => {
    setEditingId(member.id!)
    setEditName(member.name)
    setEditColor(member.color)
  }

  const updateDraft = (cardNumber: string, field: 'name' | 'color', value: string) => {
    setCardDrafts((prev) => {
      const next = new Map(prev)
      const existing = next.get(cardNumber) || { name: '', color: getNextColor() }
      next.set(cardNumber, { ...existing, [field]: value })
      return next
    })
  }

  const getMemberForCard = (cardNumber: string) =>
    members.find((m) => m.cardNumbers.includes(cardNumber))

  const renderMemberRow = (member: HouseholdMember, subtitle?: string) => {
    const isEditing = editingId === member.id

    if (isEditing) {
      return (
        <div className="space-y-3">
          <Label htmlFor={`edit-name-${member.id}`} className="sr-only">
            Edit member name
          </Label>
          <Input
            id={`edit-name-${member.id}`}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleUpdateMember(member)
              }
            }}
            className="rounded-xl border-2"
          />
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((color) => (
              <button
                key={color}
                onClick={() => setEditColor(color)}
                className={`h-7 w-7 rounded-full transition-all ${
                  editColor === color ? 'ring-2 ring-indigo-500 ring-offset-2' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleUpdateMember(member)}
              disabled={!editName.trim() || saving}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              Update
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: member.color }}
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{member.name}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleStartEdit(member)}
            className="text-gray-400 hover:bg-indigo-50 hover:text-indigo-500 dark:text-gray-500 dark:hover:bg-indigo-950"
            aria-label={`Edit ${member.name}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(member.id!)}
            className="text-gray-400 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 dark:hover:bg-red-950"
            aria-label={`Delete ${member.name}`}
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b bg-gradient-to-r from-indigo-500 to-violet-500 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white">Household Members</DialogTitle>
              <DialogDescription className="text-sm text-indigo-100">
                Assign detected debit cards to household members
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                  className="h-auto p-0"
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Rescan button — shown when transactions are loaded */}
              {transactions.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {detectedCards.length > 0
                      ? `${detectedCards.length} card${detectedCards.length !== 1 ? 's' : ''} found in ${transactions.length} transactions`
                      : `${transactions.length} transactions loaded, no cards found`}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRescan}
                    disabled={scanning}
                    className="gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
                    Rescan
                  </Button>
                </div>
              )}

              {transactions.length === 0 && members.length === 0 && (
                <div className="py-8 text-center">
                  <CreditCard className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                  <p className="font-medium text-gray-600 dark:text-gray-400">
                    No transactions loaded
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Upload a bank statement to detect cards
                  </p>
                </div>
              )}

              {/* Unassigned Detected Cards */}
              {unassignedCards.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Detected Cards
                  </h3>
                  <div className="space-y-3">
                    {unassignedCards.map((dc) => {
                      const draft = cardDrafts.get(dc.cardNumber) || {
                        name: '',
                        color: getNextColor(),
                      }
                      return (
                        <div
                          key={dc.cardNumber}
                          className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-800 dark:bg-indigo-950/30"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-indigo-500" />
                            <span className="font-mono text-sm font-bold text-indigo-700 dark:text-indigo-300">
                              {dc.cardNumber}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {dc.transactionCount} transactions &bull;{' '}
                              {formatCurrency(dc.totalSpent)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`name-${dc.cardNumber}`} className="sr-only">
                              Member name for card {dc.cardNumber}
                            </Label>
                            <Input
                              id={`name-${dc.cardNumber}`}
                              value={draft.name}
                              onChange={(e) => updateDraft(dc.cardNumber, 'name', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleSaveCard(dc.cardNumber)
                                }
                              }}
                              placeholder="Name this card holder..."
                              className="flex-1 rounded-xl border-2"
                            />
                            <div className="flex gap-1">
                              {COLOR_PALETTE.slice(0, 5).map((color) => (
                                <button
                                  key={color}
                                  onClick={() => updateDraft(dc.cardNumber, 'color', color)}
                                  className={`h-6 w-6 rounded-full transition-all ${
                                    draft.color === color
                                      ? 'ring-2 ring-indigo-500 ring-offset-1'
                                      : 'hover:scale-110'
                                  }`}
                                  style={{ backgroundColor: color }}
                                  aria-label={`Select color ${color}`}
                                />
                              ))}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleSaveCard(dc.cardNumber)}
                              disabled={!draft.name.trim() || saving}
                              className="bg-indigo-500 hover:bg-indigo-600"
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Separator between detected cards and members */}
              {(assignedCardsList.length > 0 || cardlessMembers.length > 0) &&
                unassignedCards.length > 0 && <Separator />}

              {/* Assigned Members (with cards) */}
              {assignedCardsList.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Members
                  </h3>
                  <div className="space-y-2">
                    {assignedCardsList.map((dc) => {
                      const member = getMemberForCard(dc.cardNumber)
                      if (!member) return null

                      return (
                        <div
                          key={dc.cardNumber}
                          className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-gray-600"
                        >
                          {renderMemberRow(
                            member,
                            `${dc.cardNumber} \u2014 ${dc.transactionCount} transactions \u2022 ${formatCurrency(dc.totalSpent)}`
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Cardless Members (wire transfers, etc.) */}
              {cardlessMembers.length > 0 && (
                <div>
                  {assignedCardsList.length > 0 && (
                    <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Other Members
                    </h3>
                  )}
                  <div className="space-y-2">
                    {cardlessMembers.map((member) => (
                      <div
                        key={member.id}
                        className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-gray-600"
                      >
                        {renderMemberRow(member, 'No card \u2014 manual assignment only')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Add Member without card */}
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Add Member Without Card
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  For wire transfers and expenses without debit card data
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="manual-member-name" className="sr-only">
                      Member name
                    </Label>
                    <Input
                      id="manual-member-name"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleSaveManualMember()
                        }
                      }}
                      placeholder="Member name..."
                      className="flex-1 rounded-xl border-2"
                    />
                    <div className="flex gap-1">
                      {COLOR_PALETTE.slice(0, 5).map((color) => (
                        <button
                          key={color}
                          onClick={() => setManualColor(color)}
                          className={`h-6 w-6 rounded-full transition-all ${
                            manualColor === color
                              ? 'ring-2 ring-indigo-500 ring-offset-1'
                              : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSaveManualMember}
                      disabled={!manualName.trim() || saving}
                      className="gap-1 bg-indigo-500 hover:bg-indigo-600"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t bg-gray-50 p-4 dark:bg-gray-900">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
