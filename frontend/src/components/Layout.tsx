import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  MessageCircle,
  Calendar,
  Pill,
  User as UserIcon,
  Settings,
  LogOut,
  Menu,
  X,
  Compass,
  FileCheck,
  Activity,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import OfflineIndicator from './OfflineIndicator'
import UserAvatar from './avatars/UserAvatar'

const navItems = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/chat', icon: MessageCircle, label: 'AI Chat' },
  { to: '/journey', icon: Compass, label: 'Care Journey' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/documents', icon: FileCheck, label: 'Records' },
  { to: '/progress', icon: Activity, label: 'Recovery' },
  { to: '/simulation', icon: Activity, label: 'Telemetry' },
  { to: '/medications', icon: Pill, label: 'Medications' },
  { to: '/profile', icon: UserIcon, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isChat = location.pathname.includes('/chat')

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Slider */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -320 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col bg-surface border-r border-borderSoft shadow-xl md:hidden h-full"
      >
        {/* Mobile Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-borderSoft flex-shrink-0">
          <img
            src="/logo.jpg"
            alt="Med44"
            onClick={() => {
              navigate('/dashboard')
              setSidebarOpen(false)
            }}
            className="h-8 w-auto object-contain cursor-pointer"
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-textSecondary hover:text-textDark hover:bg-surfaceSoft rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mobile Navigation Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-primary-light text-primary-dark font-bold'
                    : 'text-textSecondary hover:text-textDark hover:bg-surfaceSoft'
                }`
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Mobile User Card */}
        <div className="p-4 border-t border-borderSoft bg-surfaceSoft/50 flex-shrink-0">
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface border border-borderSoft">
            <UserAvatar type={user?.avatar || user?.gender} className="w-9 h-9" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-textDark truncate">{user?.name || 'Patient'}</p>
              <p className="text-[11px] text-textSecondary truncate">{user?.email || 'patient@med44.ai'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-2.5 flex items-center justify-center gap-2 text-xs font-semibold text-danger hover:bg-red-50 rounded-lg py-2 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Shared Global Top Header (Sticky top-0, z-50, h-16, bg-white, border-b) */}
      <header className="sticky top-0 z-50 h-16 bg-white border-b border-borderSoft w-full shadow-sm">
        <div className="max-w-7xl xl:max-w-[1536px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
          {/* Left: Med44 Logo (same as login, h-8 w-auto, click to dashboard) + Mobile hamburger */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 text-textSecondary hover:text-textDark hover:bg-surfaceSoft rounded-lg"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <img
              src="/logo.jpg"
              alt="Med44 - Your AI Health Nurse"
              onClick={() => navigate('/dashboard')}
              className="h-8 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
            />
          </div>

          {/* Center: Existing App Nav Links */}
          <nav className="hidden md:flex items-center gap-1 xl:gap-2 overflow-x-auto no-scrollbar flex-1 justify-center px-2">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-primary-light text-primary-dark font-bold'
                      : 'text-textSecondary hover:text-textDark hover:bg-surfaceSoft'
                  }`
                }
              >
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right: Online Status Badge + User Avatar / Sign Out */}
          <div className="flex items-center gap-3">
            <OfflineIndicator inline />

            <div
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 cursor-pointer group pl-1"
              title="View Profile"
            >
              <UserAvatar
                type={user?.avatar || user?.gender}
                className="w-8 h-8 border border-borderSoft group-hover:border-primary transition-colors"
              />
              <span className="hidden xl:inline-block text-xs font-semibold text-textDark group-hover:text-primary transition-colors">
                {user?.name?.split(' ')[0] || 'Patient'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center justify-center p-1.5 text-textSecondary hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Content Body */}
      {isChat ? (
        <main className="flex-1 w-full max-w-7xl xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-3 h-[calc(100vh-4rem)]">
          {children}
        </main>
      ) : (
        <main className="flex-1 w-full max-w-7xl xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      )}
    </div>
  )
}
