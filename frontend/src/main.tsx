import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import './index.css'
import './i18n/index' // Initialize i18n (EN/HI/TA) — must be before App renders

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#244936',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#258453', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#D84D7B', secondary: '#fff' },
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>,
)
