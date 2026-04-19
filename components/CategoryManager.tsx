'use client'

import { useState } from 'react'
import { Palette, Tag, ArrowRight, Merge, Plus, Trash2, X } from 'lucide-react'
import type { CategoryConfig } from '@/lib/category-config'
import type { CustomCategory } from '@/lib/types'
import { CATEGORIES } from '@/lib/categories'
import { DEFAULT_CUSTOM_COLORS } from '@/lib/category-colors'
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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

type TabKey = 'rules' | 'custom' | 'rename' | 'merge'

interface CategoryManagerProps {
  isOpen: boolean
  onClose: () => void
  config: CategoryConfig
  onAddCustomCategory: (cat: Omit<CustomCategory, 'id' | 'type'>) => Promise<void>
  onAddAlias: (from: string, to: string) => Promise<void>
  onRemoveConfig: (id: number) => Promise<void>
}

export function CategoryManager({
  isOpen,
  onClose,
  config,
  onAddCustomCategory,
  onAddAlias,
  onRemoveConfig,
}: CategoryManagerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('rules')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const tabs: { key: TabKey; label: string; icon: typeof Palette }[] = [
    { key: 'rules', label: 'Rules', icon: Tag },
    { key: 'custom', label: 'New Category', icon: Palette },
    { key: 'rename', label: 'Rename', icon: ArrowRight },
    { key: 'merge', label: 'Merge', icon: Merge },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b bg-gradient-to-r from-purple-500 to-indigo-500 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <Palette className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white">Manage Categories</DialogTitle>
              <DialogDescription className="text-sm text-purple-100">
                Custom categories, renames, and merges
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex shrink-0 border-b bg-gray-50 dark:bg-gray-900">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-b-2 border-purple-500 text-purple-600' + ' dark:text-purple-400'
                  : 'text-gray-500 hover:text-gray-700' +
                    ' dark:text-gray-400' +
                    ' dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
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

          {activeTab === 'rules' && (
            <KeywordRulesTab
              config={config}
              saving={saving}
              onAdd={async (cat) => {
                setSaving(true)
                setError(null)
                try {
                  await onAddCustomCategory(cat)
                } catch (err) {
                  console.error('Failed to add rule:', err)
                  setError('Failed to add keyword rule.')
                } finally {
                  setSaving(false)
                }
              }}
              onRemove={async (id) => {
                setError(null)
                try {
                  await onRemoveConfig(id)
                } catch (err) {
                  console.error('Failed to remove rule:', err)
                  setError('Failed to remove keyword rule.')
                }
              }}
            />
          )}

          {activeTab === 'custom' && (
            <CustomCategoriesTab
              config={config}
              saving={saving}
              onAdd={async (cat) => {
                setSaving(true)
                setError(null)
                try {
                  await onAddCustomCategory(cat)
                } catch (err) {
                  console.error('Failed to add category:', err)
                  setError('Failed to add custom category.')
                } finally {
                  setSaving(false)
                }
              }}
              onRemove={async (id) => {
                setError(null)
                try {
                  await onRemoveConfig(id)
                } catch (err) {
                  console.error('Failed to remove category:', err)
                  setError('Failed to remove category.')
                }
              }}
            />
          )}

          {activeTab === 'rename' && (
            <RenameTab
              config={config}
              saving={saving}
              onRename={async (from, to) => {
                setSaving(true)
                setError(null)
                try {
                  await onAddAlias(from, to)
                } catch (err) {
                  console.error('Failed to rename category:', err)
                  setError('Failed to rename category.')
                } finally {
                  setSaving(false)
                }
              }}
              onRemove={async (id) => {
                setError(null)
                try {
                  await onRemoveConfig(id)
                } catch (err) {
                  console.error('Failed to undo rename:', err)
                  setError('Failed to undo rename.')
                }
              }}
            />
          )}

          {activeTab === 'merge' && (
            <MergeTab
              config={config}
              saving={saving}
              onMerge={async (from, to) => {
                setSaving(true)
                setError(null)
                try {
                  await onAddAlias(from, to)
                } catch (err) {
                  console.error('Failed to merge category:', err)
                  setError('Failed to merge categories.')
                } finally {
                  setSaving(false)
                }
              }}
              onRemove={async (id) => {
                setError(null)
                try {
                  await onRemoveConfig(id)
                } catch (err) {
                  console.error('Failed to undo merge:', err)
                  setError('Failed to undo merge.')
                }
              }}
            />
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

/* ------------------------------------------------------------------ */
/*  Tab 1: Keyword Rules for Existing Categories                       */
/* ------------------------------------------------------------------ */

interface KeywordRulesTabProps {
  config: CategoryConfig
  saving: boolean
  onAdd: (cat: Omit<CustomCategory, 'id' | 'type'>) => Promise<void>
  onRemove: (id: number) => Promise<void>
}

function KeywordRulesTab({ config, saving, onAdd, onRemove }: KeywordRulesTabProps) {
  const [category, setCategory] = useState('')
  const [keywords, setKeywords] = useState('')

  // Rules are CustomCategory records whose name matches a built-in
  const builtInSet = new Set<string>(CATEGORIES)
  const keywordRules = config.customCategories.filter(
    (c) => builtInSet.has(c.name) && c.keywords.length > 0
  )

  const handleAdd = async () => {
    if (!category || !keywords.trim()) return
    const parsed = keywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean)
    if (parsed.length === 0) return

    const color = config.getCategoryColor(category)
    await onAdd({ name: category, color, keywords: parsed })
    setKeywords('')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
        <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Add Keyword Rule
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Auto-classify transactions matching keywords into a category
        </p>
        <div className="space-y-3">
          <div>
            <Label htmlFor="rule-category">Category</Label>
            <div className="relative mt-1">
              <select
                id="rule-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white p-3 pr-10 text-sm transition-colors hover:border-purple-300 focus:border-purple-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="">Select category...</option>
                {config.allCategories
                  .filter((c) => c !== 'Other')
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="rule-keywords">Keywords (comma-separated)</Label>
            <Input
              id="rule-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder='e.g. "sushi zen", "thai garden"'
              className="mt-1 rounded-xl border-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Matches booking text (case-insensitive)
            </p>
          </div>

          <Button
            onClick={handleAdd}
            disabled={saving || !category || !keywords.trim()}
            className="gap-1 bg-purple-500 hover:bg-purple-600"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </div>

      <Separator />

      {keywordRules.length === 0 ? (
        <div className="py-8 text-center">
          <Tag className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="font-medium text-gray-600 dark:text-gray-400">No keyword rules</p>
          <p className="text-sm text-muted-foreground">Add rules to auto-classify transactions</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active Rules</h3>
          {keywordRules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-gray-600"
            >
              <div className="min-w-0 flex-1">
                <Badge className="text-white" style={{ backgroundColor: rule.color }}>
                  {rule.name}
                </Badge>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {rule.keywords.join(', ')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(rule.id!)}
                className="shrink-0 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 dark:hover:bg-red-950"
                aria-label={`Remove rule for ${rule.name}`}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab 2: Custom Categories                                          */
/* ------------------------------------------------------------------ */

interface CustomTabProps {
  config: CategoryConfig
  saving: boolean
  onAdd: (cat: Omit<CustomCategory, 'id' | 'type'>) => Promise<void>
  onRemove: (id: number) => Promise<void>
}

function CustomCategoriesTab({ config, saving, onAdd, onRemove }: CustomTabProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_CUSTOM_COLORS[0])
  const [keywords, setKeywords] = useState('')
  const [validationError, setValidationError] = useState('')

  const allNames = new Set([
    ...CATEGORIES.map((c) => c.toLowerCase()),
    ...config.customCategories.map((c) => c.name.toLowerCase()),
  ])

  const handleAdd = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setValidationError('Category name is required.')
      return
    }
    if (allNames.has(trimmed.toLowerCase())) {
      setValidationError('A category with this name already exists.')
      return
    }
    setValidationError('')

    const parsedKeywords = keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)

    await onAdd({ name: trimmed, color, keywords: parsedKeywords })
    setName('')
    setKeywords('')
    setColor(DEFAULT_CUSTOM_COLORS[0])
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Add Custom Category
        </h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setValidationError('')
              }}
              placeholder="e.g. Pet Supplies"
              className="mt-1 rounded-xl border-2"
            />
          </div>

          {/* Color picker */}
          <div>
            <Label>Color</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {DEFAULT_CUSTOM_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-purple-500 ring-offset-2' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="cat-keywords">Keywords (comma-separated)</Label>
            <Input
              id="cat-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. petco, petsmart, vet"
              className="mt-1 rounded-xl border-2"
            />
          </div>

          {validationError && <p className="text-sm text-red-500">{validationError}</p>}

          <Button
            onClick={handleAdd}
            disabled={saving || !name.trim()}
            className="gap-1 bg-purple-500 hover:bg-purple-600"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      <Separator />

      {/* Existing custom categories */}
      {config.customCategories.length === 0 ? (
        <div className="py-8 text-center">
          <Palette className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="font-medium text-gray-600 dark:text-gray-400">No custom categories</p>
          <p className="text-sm text-muted-foreground">Add one above to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Custom Categories
          </h3>
          {config.customCategories.map((cat) => (
            <CustomCategoryRow key={cat.id} category={cat} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  )
}

function CustomCategoryRow({
  category,
  onRemove,
}: {
  category: CustomCategory
  onRemove: (id: number) => Promise<void>
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-gray-600">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge className="text-white" style={{ backgroundColor: category.color }}>
            {category.name}
          </Badge>
        </div>
        {category.keywords.length > 0 && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            Keywords: {category.keywords.join(', ')}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(category.id!)}
        className="shrink-0 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 dark:hover:bg-red-950"
        aria-label={`Delete ${category.name}`}
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab 2: Rename                                                     */
/* ------------------------------------------------------------------ */

interface RenameTabProps {
  config: CategoryConfig
  saving: boolean
  onRename: (from: string, to: string) => Promise<void>
  onRemove: (id: number) => Promise<void>
}

function RenameTab({ config, saving, onRename, onRemove }: RenameTabProps) {
  const [source, setSource] = useState('')
  const [newName, setNewName] = useState('')

  const aliasedFroms = new Set(config.aliases.map((a) => a.from))
  const availableCategories = config.allCategories.filter((c) => !aliasedFroms.has(c))

  const renames = config.aliases.filter((a) => a.from !== a.to)

  const handleRename = async () => {
    if (!source || !newName.trim()) return
    await onRename(source, newName.trim())
    setSource('')
    setNewName('')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Rename a Category
        </h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="rename-source">Source Category</Label>
            <div className="relative mt-1">
              <select
                id="rename-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white p-3 pr-10 text-sm transition-colors hover:border-purple-300 focus:border-purple-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="">Select category...</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="rename-new">New Name</Label>
            <Input
              id="rename-new"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Food & Drink"
              className="mt-1 rounded-xl border-2"
            />
          </div>

          <Button
            onClick={handleRename}
            disabled={saving || !source || !newName.trim()}
            className="gap-1 bg-purple-500 hover:bg-purple-600"
          >
            <Tag className="h-4 w-4" />
            Rename
          </Button>
        </div>
      </div>

      <Separator />

      {renames.length === 0 ? (
        <div className="py-8 text-center">
          <Tag className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="font-medium text-gray-600 dark:text-gray-400">No renames configured</p>
          <p className="text-sm text-muted-foreground">
            Rename a built-in category to your preference
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active Renames</h3>
          {renames.map((alias) => (
            <div
              key={alias.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-gray-600"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{alias.from}</span>
                <ArrowRight className="h-4 w-4 text-purple-500" />
                <span className="font-semibold">{alias.to}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(alias.id!)}
                className="shrink-0 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 dark:hover:bg-red-950"
                aria-label={`Undo rename ${alias.from}`}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab 3: Merge                                                      */
/* ------------------------------------------------------------------ */

interface MergeTabProps {
  config: CategoryConfig
  saving: boolean
  onMerge: (from: string, to: string) => Promise<void>
  onRemove: (id: number) => Promise<void>
}

function MergeTab({ config, saving, onMerge, onRemove }: MergeTabProps) {
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')

  const builtInSet = new Set<string>(CATEGORIES)
  const merges = config.aliases.filter(
    (a) =>
      a.from !== a.to &&
      (builtInSet.has(a.to) || config.customCategories.some((c) => c.name === a.to))
  )

  const mergedFroms = new Set(merges.map((m) => m.from))
  const availableSources = config.allCategories.filter((c) => !mergedFroms.has(c))
  const availableTargets = config.allCategories.filter((c) => c !== source)

  const handleMerge = async () => {
    if (!source || !target || source === target) return
    await onMerge(source, target)
    setSource('')
    setTarget('')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Merge Two Categories
        </h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="merge-source">Source (will be removed)</Label>
            <div className="relative mt-1">
              <select
                id="merge-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white p-3 pr-10 text-sm transition-colors hover:border-purple-300 focus:border-purple-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="">Select source...</option>
                {availableSources.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="merge-target">Target (will receive)</Label>
            <div className="relative mt-1">
              <select
                id="merge-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white p-3 pr-10 text-sm transition-colors hover:border-purple-300 focus:border-purple-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
              >
                <option value="">Select target...</option>
                {availableTargets.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-amber-600 dark:text-amber-400">
            Merging is permanent for existing budgets. All transactions from the source category
            will appear under the target.
          </p>

          <Button
            onClick={handleMerge}
            disabled={saving || !source || !target || source === target}
            className="gap-1 bg-purple-500 hover:bg-purple-600"
          >
            <Merge className="h-4 w-4" />
            Merge
          </Button>
        </div>
      </div>

      <Separator />

      {merges.length === 0 ? (
        <div className="py-8 text-center">
          <Merge className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="font-medium text-gray-600 dark:text-gray-400">No merges configured</p>
          <p className="text-sm text-muted-foreground">Combine two categories into one</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active Merges</h3>
          {merges.map((alias) => (
            <div
              key={alias.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-gray-600"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{alias.from}</span>
                <ArrowRight className="h-4 w-4 text-purple-500" />
                <span className="font-semibold">{alias.to}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(alias.id!)}
                className="shrink-0 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 dark:hover:bg-red-950"
                aria-label={`Undo merge ${alias.from}`}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
