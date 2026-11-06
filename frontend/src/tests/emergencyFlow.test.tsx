import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { EmergencyBanner } from '../components/med44/EmergencyBanner'

describe('Emergency Flow e2e component test', () => {
  it('triggers emergency banner with 112 dialing link upon critical symptom detection', () => {
    render(
      <EmergencyBanner
        symptomTrigger="Chest tightness"
        message="Critical red flag: immediate emergency medical care required."
      />
    )

    // Verify prominent red alert
    const banner = screen.getByRole('alert')
    expect(banner).toBeInTheDocument()

    // Verify 112 hotline call action
    const call112Btn = screen.getByRole('link', { name: /call 112 immediately/i })
    expect(call112Btn).toBeInTheDocument()
    expect(call112Btn).toHaveAttribute('href', 'tel:112')

    // Verify non-diagnostic safety disclaimer
    expect(
      screen.getByText(/Med44 gives general information, not medical advice or a diagnosis/i)
    ).toBeInTheDocument()
  })
})

