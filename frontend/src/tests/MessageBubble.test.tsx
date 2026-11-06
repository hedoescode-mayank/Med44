import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MessageBubble } from '../components/med44/MessageBubble'

describe('MessageBubble Component', () => {
  it('renders user message on the right with content', () => {
    render(<MessageBubble id="1" role="user" content="I have a slight headache" />)
    expect(screen.getByText('I have a slight headache')).toBeInTheDocument()
  })

  it('renders assistant message with structured markdown and safety note trigger', () => {
    render(
      <MessageBubble
        id="2"
        role="assistant"
        content="Rest and hydrate. Consult a doctor if condition persists."
        timestamp="10:30 AM"
      />
    )
    expect(screen.getByText(/Rest and hydrate/i)).toBeInTheDocument()
    expect(screen.getByText(/Safety Note & Protocol/i)).toBeInTheDocument()
  })

  it('renders attached document chip when provided', () => {
    render(
      <MessageBubble
        id="3"
        role="user"
        content="Reviewing my prescription"
        docAttachment={{ title: 'Blood_Test_Report.pdf', category: 'Lab Report' }}
      />
    )
    expect(screen.getByText(/Attached: Blood_Test_Report.pdf/i)).toBeInTheDocument()
  })
})
