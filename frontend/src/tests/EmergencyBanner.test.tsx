import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { EmergencyBanner } from '../components/med44/EmergencyBanner'

describe('EmergencyBanner Component', () => {
  it('renders default emergency message and Call 112 button', () => {
    render(<EmergencyBanner />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Emergency Alert Protocol/i)).toBeInTheDocument()
    const callButton = screen.getByRole('link', { name: /call 112 immediately/i })
    expect(callButton).toHaveAttribute('href', 'tel:112')
  })

  it('renders flagged symptom trigger when provided', () => {
    render(<EmergencyBanner symptomTrigger="Chest tightness" />)
    expect(screen.getByText(/Flagged: Chest tightness/i)).toBeInTheDocument()
  })

  it('renders Call My Doctor button if doctor phone is provided', () => {
    render(<EmergencyBanner doctorPhone="+919876543210" />)
    const docLink = screen.getByRole('link', { name: /call my doctor/i })
    expect(docLink).toHaveAttribute('href', 'tel:+919876543210')
  })
})

