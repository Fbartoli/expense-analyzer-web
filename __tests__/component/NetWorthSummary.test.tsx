import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NetWorthSummary } from '@/components/NetWorthSummary'
import type { NetWorthSnapshot } from '@/lib/types'

function baseProps() {
  return {
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
    previousSnapshot: null as NetWorthSnapshot | null,
    onManageAccounts: vi.fn(),
  }
}

describe('NetWorthSummary', () => {
  it('renders the empty state when no assets or liabilities', () => {
    render(<NetWorthSummary {...baseProps()} />)
    expect(screen.getByText('No accounts configured')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add accounts/i })).toBeInTheDocument()
  })

  it('renders positive net worth with assets and liabilities', () => {
    render(
      <NetWorthSummary
        {...baseProps()}
        totalAssets={12_000}
        totalLiabilities={2_000}
        netWorth={10_000}
      />
    )
    // Swiss CHF formatting uses non-breaking spaces; match the numeric part.
    expect(screen.getAllByText(/12.000/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/2.000/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/10.000/)[0]).toBeInTheDocument()
    // Change indicator absent when no previous snapshot.
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('renders negative net worth', () => {
    render(
      <NetWorthSummary
        {...baseProps()}
        totalAssets={1_000}
        totalLiabilities={5_000}
        netWorth={-4_000}
      />
    )
    // "Net Worth" label appears twice — in header and as tile label. Find the value.
    expect(screen.getAllByText(/-4.000|−4.000/)[0]).toBeInTheDocument()
  })

  it('shows positive change indicator when previous snapshot exists', () => {
    const previous: NetWorthSnapshot = {
      date: new Date('2026-03-01'),
      totalAssets: 10_000,
      totalLiabilities: 1_000,
      netWorth: 9_000,
      accountBalances: [],
    }
    render(
      <NetWorthSummary
        {...baseProps()}
        totalAssets={12_000}
        totalLiabilities={1_000}
        netWorth={11_000}
        previousSnapshot={previous}
      />
    )
    // Absolute change +2000, percent ~+22.2%
    expect(screen.getByText(/\+22\.2%/)).toBeInTheDocument()
  })
})
