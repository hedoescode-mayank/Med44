import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ConnectivityChip } from '../components/med44/ConnectivityChip'

describe('ConnectivityChip Component', () => {
  it('renders topbar variant with status', () => {
    render(<ConnectivityChip variant="topbar" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders chat variant with AI assistant status label', () => {
    render(<ConnectivityChip variant="chat" />)
    expect(screen.getByText(/AI assistant|guidance only/i)).toBeInTheDocument()
  })
})

