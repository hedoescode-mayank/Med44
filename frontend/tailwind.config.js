/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#287B55',
          dark: '#194B35',
          light: '#E8F4EB',
        },
        accent: {
          DEFAULT: '#EFA8C1',
          dark: '#D8759A',
          light: '#FFF0F4',
        },
        background: '#FAF9F6',
        surface: '#FFFFFF',
        surfaceSoft: '#F4F7F3',
        textDark: '#26382E',
        textSecondary: '#718078',
        textMuted: '#9BA69F',
        borderSoft: '#E8EDE8',
        success: '#287B55',
        warning: '#B7791F',
        danger: '#C43D4D',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '20px',
        xl: '26px',
        full: '999px',
      },
      boxShadow: {
        soft: '0 4px 20px rgba(35, 75, 49, 0.045)',
        card: '0 4px 20px rgba(35, 75, 49, 0.045)',
        hover: '0 12px 32px rgba(35, 75, 49, 0.09)',
        accent: '0 4px 20px rgba(239, 168, 193, 0.25)',
      },
      backgroundImage: {
        'gradient-med': 'linear-gradient(135deg, #287B55 0%, #EFA8C1 100%)',
        'gradient-med-soft': 'linear-gradient(135deg, rgba(40,123,85,0.08) 0%, rgba(239,168,193,0.12) 100%)',
        'gradient-mint': 'linear-gradient(135deg, #E8F4EB 0%, #FFF0F4 100%)',
      },
      spacing: {
        'space-1': '4px',
        'space-2': '8px',
        'space-3': '12px',
        'space-4': '16px',
        'space-6': '24px',
        'space-8': '32px',
        'space-12': '48px',
        'space-16': '64px',
      },
    },
  },
  plugins: [],
}
