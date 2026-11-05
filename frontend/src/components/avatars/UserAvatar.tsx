import AvatarFemale from './AvatarFemale'
import AvatarMale from './AvatarMale'
import AvatarNeutral from './AvatarNeutral'

interface UserAvatarProps {
  type?: string | null
  className?: string
  showBadge?: boolean
  badgeOnline?: boolean
}

export default function UserAvatar({
  type = 'female',
  className = 'w-10 h-10',
  showBadge = false,
  badgeOnline = true,
}: UserAvatarProps) {
  const norm = (type || 'female').toLowerCase()

  const renderAvatar = () => {
    if (norm === 'male' || norm === 'm') {
      return <AvatarMale />
    }
    if (norm === 'neutral' || norm === 'other') {
      return <AvatarNeutral />
    }
    return <AvatarFemale />
  }

  return (
    <div className={`relative rounded-full flex-shrink-0 ${className}`}>
      {renderAvatar()}
      {showBadge && (
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
            badgeOnline ? 'bg-primary' : 'bg-gray-400'
          }`}
        />
      )}
    </div>
  )
}

