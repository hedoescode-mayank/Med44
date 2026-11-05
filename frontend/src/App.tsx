import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AuthPage from './pages/AuthPage'
import SurveyPage from './pages/SurveyPage'
import Dashboard from './pages/Dashboard'
import ChatPage from './pages/ChatPage'
import AppointmentsPage from './pages/AppointmentsPage'
import MedicationsPage from './pages/MedicationsPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import JourneyPage from './pages/JourneyPage'
import DocumentsPage from './pages/DocumentsPage'
import ProgressPage from './pages/ProgressPage'
import Layout from './components/Layout'
import { useAuthStore } from './store/authStore'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<AuthPage />} />
        
        {/* Onboarding Survey (Mandatory) */}
        <Route
          path="/survey"
          element={
            <ProtectedRoute>
              <SurveyPage />
            </ProtectedRoute>
          }
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* AI Chat */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Layout>
                <ChatPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Care Journey & Pathways (PS3 Module 6, 9, 10, 13) */}
        <Route
          path="/journey"
          element={
            <ProtectedRoute>
              <Layout>
                <JourneyPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Appointments & Facilities Discovery (PS3 Module 1, 3) */}
        <Route
          path="/appointments"
          element={
            <ProtectedRoute>
              <Layout>
                <AppointmentsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Health Records & OCR Verification (PS3 Module 4, 5, 11) */}
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Layout>
                <DocumentsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Recovery Tracker & Symptom Journal (PS3 Module 12) */}
        <Route
          path="/progress"
          element={
            <ProtectedRoute>
              <Layout>
                <ProgressPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Medications */}
        <Route
          path="/medications"
          element={
            <ProtectedRoute>
              <Layout>
                <MedicationsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Profile */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
