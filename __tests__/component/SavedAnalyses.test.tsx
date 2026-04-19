import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SavedAnalyses } from '@/components/SavedAnalyses'
import { db } from '@/lib/db'
import { createMockReport } from '../fixtures/transactions'
import type { Transaction } from '@/lib/types'

const mockTransaction: Transaction = {
  accountNumber: '123456',
  cardNumber: '****1234',
  accountHolder: 'Test User',
  purchaseDate: new Date('2024-06-15'),
  bookingText: 'Test Restaurant',
  sector: 'Restaurants',
  amount: 50,
  originalCurrency: 'CHF',
  rate: null,
  currency: 'CHF',
  debit: 50,
  credit: null,
  bookedDate: new Date('2024-06-16'),
}

async function seedAnalysis(name: string) {
  return db.analyses.add({
    name,
    fileName: `${name.toLowerCase().replace(/\s/g, '-')}.csv`,
    uploadDate: new Date('2024-06-15'),
    transactions: [mockTransaction],
    report: createMockReport(),
  })
}

describe('SavedAnalyses', () => {
  beforeEach(async () => {
    await db.analyses.clear()
  })

  it('should return null when no analyses are saved', async () => {
    const { container } = render(<SavedAnalyses onLoad={vi.fn()} />)
    // Component returns null when empty
    await waitFor(() => {
      expect(container.innerHTML).toBe('')
    })
  })

  it('should display saved analyses in controlled mode', async () => {
    await seedAnalysis('June Analysis')

    render(<SavedAnalyses onLoad={vi.fn()} open={true} onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('June Analysis')).toBeInTheDocument()
    })

    expect(screen.getByText(/1 saved/)).toBeInTheDocument()
    expect(screen.getByText('1 transactions')).toBeInTheDocument()
  })

  it('should call onLoad when analysis is clicked', async () => {
    const savedId = await seedAnalysis('Test Analysis')

    const onLoad = vi.fn()
    render(<SavedAnalyses onLoad={onLoad} open={true} onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Test Analysis')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Test Analysis'))

    expect(onLoad).toHaveBeenCalledWith(
      expect.objectContaining({
        id: savedId,
        name: 'Test Analysis',
      })
    )
  })

  it('should delete analysis when confirmed', async () => {
    await seedAnalysis('To Delete')

    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<SavedAnalyses onLoad={vi.fn()} open={true} onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('To Delete')).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', {
      name: 'Delete analysis',
    })
    await userEvent.click(deleteButton)

    await waitFor(() => {
      expect(screen.queryByText('To Delete')).not.toBeInTheDocument()
    })

    vi.restoreAllMocks()
  })

  it('should not delete analysis when confirm is cancelled', async () => {
    await seedAnalysis('Keep Me')

    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<SavedAnalyses onLoad={vi.fn()} open={true} onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Keep Me')).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', {
      name: 'Delete analysis',
    })
    await userEvent.click(deleteButton)

    // Analysis should still be there
    expect(screen.getByText('Keep Me')).toBeInTheDocument()

    vi.restoreAllMocks()
  })

  it('should render trigger button in uncontrolled mode', async () => {
    await seedAnalysis('Saved One')

    render(<SavedAnalyses onLoad={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Saved (1)')).toBeInTheDocument()
    })
  })

  it('should refresh when refreshTrigger changes', async () => {
    await seedAnalysis('Initial')

    const { rerender } = render(
      <SavedAnalyses onLoad={vi.fn()} refreshTrigger={0} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText('Initial')).toBeInTheDocument()
    })

    // Add another analysis
    await seedAnalysis('Added Later')

    // Bump trigger
    rerender(
      <SavedAnalyses onLoad={vi.fn()} refreshTrigger={1} open={true} onOpenChange={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText('Added Later')).toBeInTheDocument()
    })
  })
})
