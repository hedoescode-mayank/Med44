import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import BabyNurse from '../BabyNurse'
import { cn } from '@/lib/utils'

export interface StructuredBotData {
  understood?: string
  generalInfo?: string
  selfCare?: string[]
  whenToGetHelp?: string
  isRedFlag?: boolean
  docReferences?: Array<{ title: string; category?: string; verified?: boolean }>
  safetyNote?: string
}

export interface MessageProps {
  id: string | number
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  showAvatar?: boolean
  structuredData?: StructuredBotData
  docAttachment?: { title: string; category?: string }
}

export function MessageBubble({
  role,
  content,
  timestamp,
  showAvatar = true,
  structuredData,
  docAttachment,
}: MessageProps) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const [safetyOpen, setSafetyOpen] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isUser = role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end my-3 w-full">
        <div className="max-w-[min(78ch,85%)] flex flex-col items-end">
          {docAttachment && (
            <div className="mb-1.5 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-secondary text-primary-deep text-xs font-semibold border border-border">
              <FileText size={13} className="text-primary flex-shrink-0" />
              <span className="truncate max-w-[200px]">Attached: {docAttachment.title}</span>
            </div>
          )}
          <div className="bg-primary text-primary-foreground px-4 sm:px-5 py-3 rounded-2xl rounded-tr-sm text-sm sm:text-base font-normal shadow-sm break-words leading-relaxed select-text">
            {content}
          </div>
          {timestamp && (
            <span className="text-[11px] text-muted-foreground mt-1 mr-1">{timestamp}</span>
          )}
        </div>
      </div>
    )
  }

  // Assistant / Bot message
  return (
    <div className="flex items-start gap-2.5 sm:gap-3.5 my-4 w-full">
      {/* Bot Mascot Avatar (only on first of consecutive bot messages) */}
      <div className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 mt-0.5">
        {showAvatar ? (
          <div className="w-full h-full rounded-full bg-secondary ring-2 ring-primary/20 flex items-center justify-center overflow-hidden">
            <BabyNurse size={32} />
          </div>
        ) : (
          <div className="w-full h-full" aria-hidden="true" />
        )}
      </div>

      {/* Structured Card Bubble */}
      <div className="max-w-[min(78ch,88%)] w-full flex flex-col">
        <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-4 sm:p-5 shadow-soft space-y-3.5 text-foreground">
          {/* 1. What I understood (if structured) */}
          {structuredData?.understood && (
            <div className="p-2.5 rounded-xl bg-secondary/60 border border-primary/20 text-xs sm:text-sm text-primary-deep font-medium">
              <span className="font-bold">What I understood: </span>
              <span>{structuredData.understood}</span>
            </div>
          )}

          {/* 2. Main Markdown Body */}
          <div className="text-sm sm:text-base leading-relaxed break-words space-y-2 prose prose-green max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {structuredData?.generalInfo || content}
            </ReactMarkdown>
          </div>

          {/* 3. Self-care basics */}
          {structuredData?.selfCare && structuredData.selfCare.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-bold text-primary-deep uppercase tracking-wider mb-1.5">
                General Self-Care Considerations:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm text-muted-foreground">
                {structuredData.selfCare.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 4. When to get help / Alert callout */}
          {structuredData?.whenToGetHelp && (
            <div
              className={cn(
                'p-3 rounded-xl border flex items-start gap-2.5 text-xs sm:text-sm',
                structuredData.isRedFlag
                  ? 'bg-danger-soft text-danger-text border-danger-border'
                  : 'bg-warning-soft text-warning-text border-warning-border'
              )}
            >
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  {structuredData.isRedFlag ? 'Emergency Guidance: ' : 'When to see a doctor: '}
                </span>
                <span>{structuredData.whenToGetHelp}</span>
              </div>
            </div>
          )}

          {/* 5. Document Grounding Reference Chips */}
          {structuredData?.docReferences && structuredData.docReferences.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border">
              <span className="text-[11px] font-bold text-muted-foreground mr-1">Grounding:</span>
              {structuredData.docReferences.map((ref, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-secondary text-primary-deep border border-border"
                >
                  <FileText size={11} className="text-primary flex-shrink-0" />
                  <span>{ref.title}</span>
                  {ref.verified && (
                    <span className="text-[9px] text-primary font-bold">(Verified)</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* 6. Collapsible Safety Disclaimer (not repeated paragraphs) */}
          <div className="pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setSafetyOpen(!safetyOpen)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ShieldCheck size={13} className="text-primary" />
              <span>Safety Note & Protocol</span>
              {safetyOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {safetyOpen && (
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed bg-muted/60 p-2 rounded-lg border border-border">
                {structuredData?.safetyNote ||
                  'Med44 provides general health information, not medical diagnosis or prescription. All responses adhere to deterministic clinical guardrails.'}
              </p>
            )}
          </div>
        </div>

        {/* Footer row: Timestamp, Was this helpful?, Copy button */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1 px-1">
          <span>{timestamp}</span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Helpful?</span>
            <button
              onClick={() => setFeedback('up')}
              className={cn(
                'p-1 rounded hover:bg-secondary transition-colors',
                feedback === 'up' && 'text-primary font-bold'
              )}
              aria-label="Mark helpful"
            >
              <ThumbsUp size={13} />
            </button>
            <button
              onClick={() => setFeedback('down')}
              className={cn(
                'p-1 rounded hover:bg-secondary transition-colors',
                feedback === 'down' && 'text-destructive font-bold'
              )}
              aria-label="Mark not helpful"
            >
              <ThumbsDown size={13} />
            </button>
            <span className="text-border">|</span>
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-secondary transition-colors inline-flex items-center gap-1"
              aria-label="Copy reply"
            >
              {copied ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
              <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessageBubble

