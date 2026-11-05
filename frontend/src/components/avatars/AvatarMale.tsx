export default function AvatarMale({ className = 'w-full h-full' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="60" cy="60" r="58" fill="#E8F4EB" stroke="#287B55" strokeWidth="3" />
      {/* Hair */}
      <path d="M35 50C35 32 45 22 60 22C75 22 85 32 85 50C85 45 80 32 60 32C42 32 35 44 35 50Z" fill="#2E3832" />
      {/* Neck & Shoulders */}
      <path d="M52 75H68V88H52V75Z" fill="#F5CBA7" />
      <path d="M26 112C26 95 40 88 60 88C80 88 94 95 94 112V116H26V112Z" fill="#194B35" />
      {/* Face */}
      <ellipse cx="60" cy="58" rx="21" ry="24" fill="#FAD7BD" />
      {/* Modern hair top */}
      <path d="M36 44C38 30 48 24 60 24C72 24 82 30 84 42C76 34 66 32 58 32C46 32 40 38 36 44Z" fill="#242B27" />
      {/* Eyes & smile */}
      <circle cx="53" cy="56" r="2.5" fill="#232B25" />
      <circle cx="67" cy="56" r="2.5" fill="#232B25" />
      <path d="M56 66C58 68 62 68 64 66" stroke="#287B55" strokeWidth="2" strokeLinecap="round" />
      {/* Collar cross */}
      <path d="M60 92V100M56 96H64" stroke="#83C99F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

