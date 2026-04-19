import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUpload } from '@/components/FileUpload'
import { createMockCSVFile } from '../../test-utils/mock-file'

describe('FileUpload', () => {
  const defaultProps = {
    onFileUpload: vi.fn(),
    loading: false,
    isOpen: true,
    onClose: vi.fn(),
  }

  it('should render the upload dialog when open', () => {
    render(<FileUpload {...defaultProps} />)
    expect(screen.getByText('Select File')).toBeInTheDocument()
    expect(screen.getByText('Drag and drop your file here, or click to browse')).toBeInTheDocument()
  })

  it('should not render dialog content when closed', () => {
    render(<FileUpload {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Select File')).not.toBeInTheDocument()
  })

  it('should accept a valid CSV file', async () => {
    const onFileUpload = vi.fn()
    const onClose = vi.fn()
    render(<FileUpload {...defaultProps} onFileUpload={onFileUpload} onClose={onClose} />)

    const csvFile = createMockCSVFile('col1;col2\nval1;val2', 'test.csv')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()

    await userEvent.upload(input, csvFile)

    expect(onFileUpload).toHaveBeenCalledWith(csvFile)
    expect(onClose).toHaveBeenCalled()
  })

  it('should reject files larger than 10MB', async () => {
    const onFileUpload = vi.fn()
    render(<FileUpload {...defaultProps} onFileUpload={onFileUpload} />)

    const largeContent = 'x'.repeat(11 * 1024 * 1024)
    const largeFile = createMockCSVFile(largeContent, 'large.csv')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await userEvent.upload(input, largeFile)

    expect(onFileUpload).not.toHaveBeenCalled()
    expect(screen.getByText('File is too large. Maximum size is 10MB.')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<FileUpload {...defaultProps} loading={true} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.disabled).toBe(true)
  })
})
