import React from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'fluid' | 'reading' | 'form'
  children: React.ReactNode
}

/**
 * Reusable page wrapper for the whole app per §2b Step 6.
 * - fluid: app screens (chat, dashboard, documents, wearable, simulation)
 * - reading: long-form text (privacy, clinical reference)
 * - form: focused authentication and consent forms
 */
export function PageContainer({
  variant = 'fluid',
  className,
  children,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'w-full min-w-0 transition-all duration-150',
        variant === 'fluid' && 'max-w-[1760px] mx-auto',
        variant === 'reading' && 'max-w-[72ch] mx-auto py-6 sm:py-8',
        variant === 'form' && 'max-w-[480px] mx-auto py-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export default PageContainer
