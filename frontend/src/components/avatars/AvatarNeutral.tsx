export default function AvatarNeutral({ className = 'w-full h-full' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="60" cy="60" r="58" fill="#F4F7F3" stroke="#84958A" strokeWidth="3" />
      {/* Soft rounded silhouette */}
      <circle cx="60" cy="48" r="22" fill="#E8EDE8" />
      <path d="M28 108C28 90 42 82 60 82C78 82 92 90 92 108V114H28V108Z" fill="#718078" />
      {/* Subtle healthcare badge */}
      <circle cx="60" cy="98" r="8" fill="#FFFFFF" />
      <path d="M60 94V102M56 98H64" stroke="#287B55" strokeWidth="2" strokeLinecap="round" />
      <circle cx="53" cy="48" r="2.5" fill="#526058" />
      <circle cx="67" cy="48" r="2.5" fill="#526058" />
      <path d="M56 56C58 58 62 58 64 56" stroke="#526058" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

