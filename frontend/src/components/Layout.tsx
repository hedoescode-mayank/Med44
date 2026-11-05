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
  Bell,
  Sparkles,
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
  { to: '/appointments', icon: Calendar, label: 'Appointments & Care' },
  { to: '/documents', icon: FileCheck, label: 'Health Records & OCR' },
  { to: '/progress', icon: Activity, label: 'Recovery Tracker' },
  { to: '/medications', icon: Pill, label: 'Medications' },
  { to: '/profile', icon: UserIcon, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings & Support' },
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

  // Get active route title
  const currentTitle = () => {
    const p = location.pathname
    if (p.includes('/chat')) return 'AI Health Nurse'
    if (p.includes('/journey')) return 'Interactive Care Journey'
    if (p.includes('/appointments')) return 'Appointments & Facilities'
    if (p.includes('/documents')) return 'Health Records & OCR'
    if (p.includes('/progress')) return 'Recovery Tracker & Symptom Journal'
    if (p.includes('/medications')) return 'Medications & Prescriptions'
    if (p.includes('/profile')) return 'Patient Health Profile'
    if (p.includes('/settings')) return 'Settings & Support'
    return 'Patient Dashboard'
  }

  const isChat = location.pathname.includes('/chat')

  return (
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col lg:flex-row font-sans select-none-safe">
      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Slider */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -320 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col bg-surface border-r border-borderSoft shadow-xl lg:hidden h-full"
      >
        {/* Mobile Sidebar Header */}
        <div className="flex items-center justify-between p-5 border-b border-borderSoft flex-shrink-0">
          <div className="h-10 w-36 flex items-center">
            <img
              src="/logo.jpg"
              alt="Med44"
              className="h-full w-full object-contain object-left"
            />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-textSecondary hover:text-textDark hover:bg-surfaceSoft rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Mobile User Card */}
        <div className="p-4 border-t border-borderSoft bg-surfaceSoft/50 flex-shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-borderSoft">
            <UserAvatar type={user?.avatar || user?.gender} className="w-10 h-10" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-textDark truncate">{user?.name || 'Patient'}</p>
              <p className="text-xs text-textSecondary truncate">{user?.email || 'patient@med44.ai'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-danger hover:bg-red-50 rounded-lg py-2.5 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Desktop Persistent Sidebar (Fixed Frame - never shakes or scrolls with page) */}
      <aside className="hidden lg:flex flex-col w-64 h-full bg-surface border-r border-borderSoft flex-shrink-0 z-40">
        {/* Logo container: fixed 80px height, object-contain, never clipped */}
        <div className="h-20 px-6 flex items-center border-b border-borderSoft flex-shrink-0">
          <div className="h-11 w-full max-w-[190px] flex items-center">
            <img
              src="/logo.jpg"
              alt="Med44 - Your AI Health Nurse"
              className="h-full w-full object-contain object-left"
            />
          </div>
        </div>

        {/* Navigation list: dedicated smooth scroll */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Survey Badge if not 100% complete */}
        <div className="px-4 pb-2 flex-shrink-0">
          <div className="p-3 rounded-lg bg-gradient-to-r from-primary-light/40 to-accent-light/40 border border-primary/20 flex items-center gap-2.5">
            <Sparkles size={16} className="text-primary flex-shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-primary-dark">Health Engine Active</p>
              <p className="text-textSecondary text-[11px]">Deterministic & Safe</p>
            </div>
          </div>
        </div>

        {/* Bottom User Card */}
        <div className="p-4 border-t border-borderSoft bg-surfaceSoft/40 flex-shrink-0">
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-surface border border-borderSoft hover:border-primary/40 cursor-pointer transition-all shadow-soft"
          >
            <UserAvatar type={user?.avatar || user?.gender} className="w-9 h-9" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-textDark truncate">{user?.name || 'Patient'}</p>
              <p className="text-[11px] text-textSecondary truncate">{user?.email || 'demo@med44.ai'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-textSecondary hover:text-danger hover:bg-red-50/60 rounded-md py-1.5 transition-colors"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area - 100% Fixed Frame */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        {/* FIXED Top Baseline Header: ALWAYS fixed, never jumps or scrolls */}
        <header className="h-20 bg-surface/95 backdrop-blur-md border-b border-borderSoft px-6 lg:px-8 flex items-center justify-between flex-shrink-0 z-30">
          {/* Left section: mobile hamburger + title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-textSecondary hover:text-textDark hover:bg-surfaceSoft rounded-lg"
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <div>
              <h2 className="text-lg lg:text-xl font-bold text-textDark tracking-tight">
                {currentTitle()}
              </h2>
              <p className="text-xs text-textSecondary hidden sm:block">
                Med44 Clinical Intelligence & Personal Care
              </p>
            </div>
          </div>

          {/* Right section: Online badge, Bell, User Avatar aligned on exact same baseline */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Inline Online Status badge */}
            <OfflineIndicator inline />

            {/* Notification Bell */}
            <button
              onClick={() => navigate('/dashboard')}
              className="relative p-2.5 bg-surfaceSoft/80 hover:bg-surfaceSoft text-textSecondary hover:text-textDark rounded-lg border border-borderSoft transition-colors"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-accent-dark rounded-full" />
            </button>

            {/* Patient Avatar & Name */}
            <div
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2.5 pl-2 cursor-pointer group"
            >
              <UserAvatar
                type={user?.avatar || user?.gender}
                className="w-9 h-9 border-2 border-surfaceSoft group-hover:border-primary transition-colors"
              />
              <span className="hidden md:inline-block text-sm font-semibold text-textDark group-hover:text-primary transition-colors">
                {user?.name?.split(' ')[0] || 'Patient'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Body: When chat, takes 100% height without double-scrollbar */}
        {isChat ? (
          <main className="flex-1 overflow-hidden p-3 sm:p-5 h-[calc(100vh-5rem)]">
            <div className="h-full w-full max-w-[1360px] mx-auto">
              {children}
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8">
            <div className="max-w-[1240px] w-full mx-auto">
              {children}
            </div>
          </main>
        )}
      </div>
    </div>
  )
}
