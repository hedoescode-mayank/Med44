import React from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  XCircle,
  WifiOff,
  RefreshCw,
  FlaskConical,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusType =
  | 'valid'
  | 'needs-review'
  | 'uncertain'
  | 'verified'
  | 'failed'
  | 'offline'
  | 'sync-pending'
  | 'test'

interface StatusBadgeProps {
  status: StatusType
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  switch (status) {
    case 'valid':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-primary-deep border border-border',
            className
          )}
        >
          <CheckCircle2 size={13} className="text-primary flex-shrink-0" aria-hidden="true" />
          <span>{label || 'Valid'}</span>
        </span>
      )
    case 'verified':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary text-primary-deep border border-primary/30',
            className
          )}
        >
          <ShieldCheck size={13} className="text-primary flex-shrink-0" aria-hidden="true" />
          <span>{label || 'Verified'}</span>
        </span>
      )
    case 'needs-review':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning-soft text-warning-text border border-warning-border',
            className
          )}
        >
          <AlertTriangle size={13} className="flex-shrink-0" aria-hidden="true" />
          <span>{label || 'Needs Review'}</span>
        </span>
      )
    case 'uncertain':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warning-soft text-warning-text border border-warning-border',
            className
          )}
        >
          <HelpCircle size={13} className="flex-shrink-0" aria-hidden="true" />
          <span>{label || 'Uncertain'}</span>
        </span>
      )
    case 'failed':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger-soft text-danger-text border border-danger-border',
            className
          )}
        >
          <XCircle size={13} className="flex-shrink-0" aria-hidden="true" />
          <span>{label || 'Failed'}</span>
        </span>
      )
    case 'offline':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border',
            className
          )}
        >
          <WifiOff size={13} className="flex-shrink-0" aria-hidden="true" />
          <span>{label || 'Offline'}</span>
        </span>
      )
    case 'sync-pending':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-info-soft text-info-text border border-info-border',
            className
          )}
        >
          <RefreshCw size={13} className="animate-spin flex-shrink-0" aria-hidden="true" />
          <span>{label || 'Sync Pending'}</span>
        </span>
      )
    case 'test':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-test-soft text-test-text border border-test-border',
            className
          )}
        >
          <FlaskConical size={13} className="flex-shrink-0" aria-hidden="true" />
          <span>{label || 'TEST DATA'}</span>
        </span>
      )
    default:
      return null
  }
}

export default StatusBadge

