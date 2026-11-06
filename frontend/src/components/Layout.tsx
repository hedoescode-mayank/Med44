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
  ShieldCheck,
  PhoneCall,
  Globe,
  ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { ConnectivityChip } from './med44/ConnectivityChip'
import UserAvatar from './avatars/UserAvatar'

// Clean Navigation groups per §4: MAIN, HEALTH, MONITORING (No dev/hackathon badges)
const navGroups = [
  {
    group: 'MAIN',
    items: [
      { to: '/dashboard', icon: Home, label: 'Dashboard' },
      { to: '/chat', icon: MessageCircle, label: 'AI Health Nurse' },
      { to: '/journey', icon: Compass, label: 'Care Journey' },
    ],
  },
  {
    group: 'HEALTH',
    items: [
      { to: '/appointments', icon: Calendar, label: 'Appointments' },
      { to: '/documents', icon: FileCheck, label: 'Health Records' },
      { to: '/medications', icon: Pill, label: 'Medications' },
    ],
  },
  {
    group: 'MONITORING',
    items: [
      { to: '/progress', icon: Activity, label: 'Recovery Tracker' },
      { to: '/simulation', icon: Activity, label: 'Wearable Telemetry' },
    ],
  },
]

// Mobile bottom tab bar destinations
const mobileTabs = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/journey', icon: Compass, label: 'Journey' },
  { to: '/appointments', icon: Calendar, label: 'Care' },
  { to: '/documents', icon: FileCheck, label: 'Records' },
]

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false)
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState<'en' | 'hi' | 'ta'>('en')

  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Derive human-readable page title and breadcrumb
  const getPageMeta = () => {
    const p = location.pathname
    if (p.includes('/chat')) return { title: 'AI Health Nurse', breadcrumb: 'Assistant' }
    if (p.includes('/journey')) return { title: 'Care Journey', breadcrumb: 'Pathways' }
    if (p.includes('/appointments')) return { title: 'Appointments & Care', breadcrumb: 'Access' }
    if (p.includes('/documents')) return { title: 'Health Records', breadcrumb: 'Records' }
    if (p.includes('/progress')) return { title: 'Recovery Tracker', breadcrumb: 'Vitals' }
    if (p.includes('/simulation')) return { title: 'Wearable Telemetry', breadcrumb: 'Telemetry' }
    if (p.includes('/medications')) return { title: 'Medications', breadcrumb: 'Prescriptions' }
    if (p.includes('/profile')) return { title: 'Patient Profile', breadcrumb: 'Profile' }
    if (p.includes('/settings')) return { title: 'Settings', breadcrumb: 'Preferences' }
    if (p.includes('/survey')) return { title: 'Patient Intake', breadcrumb: 'Survey' }
    return { title: 'Patient Dashboard', breadcrumb: 'Home' }
  }

  const isChat = location.pathname.includes('/chat')
  const { title, breadcrumb } = getPageMeta()

  const languages = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  ]

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col font-sans text-foreground antialiased">
      {/* ─────────────────────────────────────────────────────────────
          1. FIXED DESKTOP SIDEBAR (248px wide, grouped per §4)
      ───────────────────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-[248px] fixed left-0 top-0 bottom-0 z-40 bg-white border-r border-border h-screen shadow-soft"
        aria-label="Sidebar navigation"
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <img
              src="/logo.jpg"
              alt="Med44 Logo"
              className="h-8 w-auto object-contain rounded-lg"
            />
            <div>
              <span className="font-extrabold text-base text-primary-deep tracking-tight leading-none">
                Med44
              </span>
              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                Your AI Health Nurse
              </p>
            </div>
          </div>
        </div>

        {/* Grouped Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto no-scrollbar">
          {navGroups.map((grp) => (
            <div key={grp.group} className="space-y-1">
              <p className="px-3 text-[11px] font-bold tracking-wider text-muted-foreground">
                {grp.group}
              </p>
              {grp.items.map(({ to, icon: Icon, label }) => {
                const isActive = location.pathname.startsWith(to)
                return (
                  <NavLink
                    key={to}
                    to={to}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-secondary text-primary-deep font-bold shadow-sm border-l-4 border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    }`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Clinical Safety Guardrails Footer Card (min-height, shrink-0, not absolute per #5) */}
        <div className="p-3 border-t border-border flex-shrink-0 bg-secondary/30">
          <div className="p-3 rounded-xl bg-white border border-border shadow-sm flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-primary flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary-deep leading-tight">
                Clinical Safety Active
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                Deterministic rules & private local vault.
              </p>
            </div>
          </div>

          {/* User profile row */}
          <div
            onClick={() => navigate('/profile')}
            className="mt-2.5 flex items-center justify-between p-2 rounded-xl hover:bg-white cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <UserAvatar type={user?.avatar || user?.gender} className="w-7 h-7 flex-shrink-0" />
              <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                {user?.name || 'Mayank'}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleLogout()
              }}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE DRAWER SHEET (For screens < 1024px)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col bg-white border-r border-border shadow-2xl lg:hidden h-full"
            >
              <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                <div
                  onClick={() => {
                    navigate('/dashboard')
                    setSidebarOpen(false)
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <img src="/logo.jpg" alt="Med44" className="h-8 w-auto object-contain rounded" />
                  <span className="font-extrabold text-sm text-foreground">Med44</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
                {navGroups.map((grp) => (
                  <div key={grp.group} className="space-y-1">
                    <p className="px-3 text-[11px] font-bold text-muted-foreground">
                      {grp.group}
                    </p>
                    {grp.items.map(({ to, icon: Icon, label }) => {
                      const isActive = location.pathname.startsWith(to)
                      return (
                        <NavLink
                          key={to}
                          to={to}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                            isActive
                              ? 'bg-secondary text-primary-deep font-bold border-l-4 border-primary'
                              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                          }`}
                        >
                          <Icon size={18} />
                          <span>{label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                ))}
              </nav>

              <div className="p-4 border-t border-border bg-secondary/20 flex-shrink-0">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-destructive hover:bg-danger-soft rounded-lg py-2 transition-colors"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          3. FIXED GLOBAL TOP BAR (56–64px sticky per §4)
      ───────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 lg:left-[248px] right-0 z-30 h-15 sm:h-16 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          {/* Left: Mobile Drawer Trigger + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <span className="hidden sm:inline">Med44</span>
                <span className="hidden sm:inline">/</span>
                <span className="text-primary-deep font-bold truncate">{breadcrumb}</span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-primary-deep truncate leading-none mt-0.5">
                {title}
              </h1>
            </div>
          </div>

          {/* Right Section: Single Language Selector, ConnectivityChip, Solid Red 112, Avatar */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Single Global Language Selector per #3 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-white hover:bg-secondary/50 text-xs font-semibold text-foreground transition-colors"
                aria-label="Select language"
              >
                <Globe size={14} className="text-primary" />
                <span>{languages.find((l) => l.code === currentLang)?.native}</span>
                <ChevronDown size={13} className="text-muted-foreground" />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-1 w-32 bg-white border border-border rounded-xl shadow-lg py-1 z-50">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setCurrentLang(l.code as any)
                        setLangDropdownOpen(false)
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-semibold transition-colors flex items-center justify-between ${
                        currentLang === l.code
                          ? 'bg-secondary text-primary-deep font-bold'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>{l.native}</span>
                      <span className="text-[10px] text-muted-foreground">{l.code.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Single Connectivity Source of Truth per #2 */}
            <ConnectivityChip variant="topbar" />

            {/* 112 Emergency Button: Solid Red per Red Rules (§2 & §4) */}
            <button
              type="button"
              onClick={() => setEmergencyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-extrabold text-xs shadow-sm transition-transform active:scale-95"
              aria-label="112 Emergency Hotline"
            >
              <PhoneCall size={13} aria-hidden="true" />
              <span>112 Emergency</span>
            </button>

            {/* User Avatar Menu */}
            <div className="relative">
              <div
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 cursor-pointer p-1 rounded-xl hover:bg-secondary/40 transition-colors"
                title="Account Settings"
              >
                <UserAvatar
                  type={user?.avatar || user?.gender}
                  className="w-8 h-8 border border-border"
                />
              </div>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-border rounded-xl shadow-lg py-1.5 z-50">
                  <div className="px-3 py-1.5 border-b border-border">
                    <p className="text-xs font-bold text-foreground truncate">{user?.name || 'Patient'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email || 'patient@med44.ai'}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigate('/profile')
                      setUserDropdownOpen(false)
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-secondary/50 flex items-center gap-2"
                  >
                    <UserIcon size={14} className="text-muted-foreground" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/settings')
                      setUserDropdownOpen(false)
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-secondary/50 flex items-center gap-2"
                  >
                    <Settings size={14} className="text-muted-foreground" />
                    <span>Settings</span>
                  </button>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false)
                      handleLogout()
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-danger-soft flex items-center gap-2 font-semibold"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          4. MAIN CONTENT AREA (Fluid responsive grid per §2b)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-[248px] pt-15 sm:pt-16 pb-16 sm:pb-0 flex flex-col min-h-screen">
        {isChat ? (
          <main className="flex-1 w-full p-2 sm:p-4 lg:p-6 overflow-hidden">
            {children}
          </main>
        ) : (
          <main className="flex-1 w-full max-w-[1760px] mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        )}

        {/* ─────────────────────────────────────────────────────────────
            5. TAIL / FOOTER (Standard grounded layout)
        ───────────────────────────────────────────────────────────── */}
        <footer className="w-full bg-white border-t border-border py-3 px-4 sm:px-6 lg:px-8 mt-auto flex-shrink-0">
          <div className="max-w-[1760px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">© 2026 Med44</span>
              <span>·</span>
              <span>Your AI Health Nurse</span>
            </div>
            <p className="text-[11px] text-center sm:text-right">
              Med44 gives general information, not medical advice or a diagnosis. For emergencies call 112.
            </p>
          </div>
        </footer>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. MOBILE BOTTOM TAB BAR (<640px per §4)
      ───────────────────────────────────────────────────────────── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border h-14 flex items-center justify-around px-2"
        aria-label="Mobile Navigation"
      >
        {mobileTabs.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-primary font-bold' : 'text-muted-foreground'
              }`}
            >
              <Icon size={18} />
              <span className="mt-0.5">{label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          7. EMERGENCY 112 CONFIRMATION DIALOG (Accessible & Safe)
      ───────────────────────────────────────────────────────────── */}
      {emergencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="emergency-modal-title"
            className="w-full max-w-md bg-white rounded-2xl border border-danger-border p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive text-white">
                <PhoneCall size={22} />
              </div>
              <div>
                <h3 id="emergency-modal-title" className="text-base font-extrabold text-foreground">
                  Connect to Emergency 112
                </h3>
                <p className="text-xs text-muted-foreground">
                  National Emergency Helpline (Ambulance & Critical Care)
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-foreground leading-relaxed">
              If you or someone around you is experiencing severe chest pain, sudden breathlessness, loss of consciousness, or acute trauma, immediate hospitalization is essential.
            </p>

            <div className="p-3 rounded-xl bg-danger-soft border border-danger-border text-xs text-danger-text font-medium">
              Dialing 112 connects directly to verified medical emergency dispatches.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEmergencyModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border bg-white text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <a
                href="tel:112"
                onClick={() => setEmergencyModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-destructive text-white text-xs font-extrabold hover:bg-destructive/90 shadow-sm"
              >
                Call 112 Now
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
