import { motion } from 'framer-motion'
import { AlertTriangle, Clock } from 'lucide-react'
import type { Message } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import UserAvatar from './avatars/UserAvatar'
import BabyNurse from './BabyNurse'

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const { user } = useAuthStore()

  const time = new Date(message.timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
      className={`flex items-end gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar: BabyNurse mascot for AI, chosen avatar for User */}
      {isUser ? (
        <UserAvatar
          type={user?.avatar || user?.gender}
          className="w-9 h-9 border border-borderSoft shadow-soft"
        />
      ) : (
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
          <BabyNurse size={42} />
        </div>
      )}

      {/* Bubble */}
      <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Emergency Tag */}
        {message.isEmergency && (
          <div className="flex items-center gap-1.5 text-xs text-danger font-bold mb-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200">
            <AlertTriangle size={13} />
            <span>Emergency Red Flag Detected</span>
          </div>
        )}

        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-primary text-white rounded-br-sm shadow-soft'
              : message.isEmergency
              ? 'bg-red-50 text-red-900 border border-red-200 rounded-bl-sm shadow-soft'
              : 'bg-surface text-textDark border border-borderSoft rounded-bl-sm shadow-card'
          }`}
        >
          {message.content}
        </div>

        <div className="flex items-center gap-1 mt-1 text-[11px] text-textMuted px-1">
          <Clock size={10} />
          <span>{time}</span>
        </div>
      </div>
    </motion.div>
  )
}
