import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import 'fake-indexeddb/auto'

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock ResizeObserver (needed for chart components)
vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
)

// Mock matchMedia (needed for responsive components)
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

// Mock URL.createObjectURL and revokeObjectURL (for file downloads)
// Preserve the URL constructor while mocking static methods
const OriginalURL = globalThis.URL
vi.stubGlobal('URL', class MockURL extends OriginalURL {
  static createObjectURL = vi.fn(() => 'blob:mock-url')
  static revokeObjectURL = vi.fn()
})

// Note: IndexedDB cleanup is handled per-test-file when needed (e.g., db.test.ts)
// to avoid race conditions with open database connections
