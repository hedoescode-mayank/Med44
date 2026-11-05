export default function AvatarFemale({ className = 'w-full h-full' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="60" cy="60" r="58" fill="#FFF0F4" stroke="#EFA8C1" strokeWidth="3" />
      {/* Hair back */}
      <path d="M30 65C28 42 42 22 60 22C78 22 92 42 90 65C90 85 88 95 88 95H32C32 95 30 85 30 65Z" fill="#5A3E36" />
      {/* Neck & Shoulders */}
      <path d="M52 75H68V88H52V75Z" fill="#FAD4C0" />
      <path d="M26 112C26 96 40 88 60 88C80 88 94 96 94 112V116H26V112Z" fill="#287B55" />
      {/* Face */}
      <ellipse cx="60" cy="58" rx="22" ry="24" fill="#FDE2D2" />
      {/* Hair front bangs */}
      <path d="M38 48C42 34 52 30 60 30C68 30 78 34 82 48C74 40 66 38 60 38C54 38 46 40 38 48Z" fill="#4A2F27" />
      {/* Eyes & smile */}
      <circle cx="52" cy="56" r="2.5" fill="#3D2924" />
      <circle cx="68" cy="56" r="2.5" fill="#3D2924" />
      <path d="M56 66C58 68 62 68 64 66" stroke="#D8759A" strokeWidth="2" strokeLinecap="round" />
      {/* Gentle blush */}
      <circle cx="48" cy="62" r="3" fill="#F8B4C8" opacity="0.7" />
      <circle cx="72" cy="62" r="3" fill="#F8B4C8" opacity="0.7" />
    </svg>
  )
}

