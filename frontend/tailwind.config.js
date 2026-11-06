/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          deep: "var(--primary-deep)",
          dark: '#194B35',
          light: '#E8F4EB',
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          dark: '#D8759A',
          light: '#FFF0F4',
        },
        pink: "var(--pink)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        // Semantic alert tokens
        danger: {
          DEFAULT: "var(--destructive)",
          soft: "var(--danger-soft)",
          border: "var(--danger-border)",
          text: "var(--danger-text)",
        },
        warning: {
          DEFAULT: "#B7791F",
          soft: "var(--warning-soft)",
          border: "var(--warning-border)",
          text: "var(--warning-text)",
        },
        info: {
          DEFAULT: "#1F4E79",
          soft: "var(--info-soft)",
          border: "var(--info-border)",
          text: "var(--info-text)",
        },
        test: {
          DEFAULT: "#4B2F85",
          soft: "var(--test-soft)",
          border: "var(--test-border)",
          text: "var(--test-text)",
        },
        // Backward-compatible tokens
        surface: '#FFFFFF',
        surfaceSoft: '#F4F7F3',
        textDark: '#26382E',
        textSecondary: '#5F6E66', // Enhanced contrast (≈5:1)
        textMuted: '#8A978F',
        borderSoft: '#E3E8E4',
        success: '#287B55',
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          'Inter',
          '"Noto Sans Devanagari"',
          '"Noto Sans Tamil"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "20px",
        "2xl": "24px",
      },
      boxShadow: {
        soft: '0 1px 2px rgb(0 0 0 / .06), 0 4px 12px rgb(0 0 0 / .04)',
        card: '0 1px 2px rgb(0 0 0 / .06), 0 4px 12px rgb(0 0 0 / .04)',
        hover: '0 4px 6px rgb(0 0 0 / .08), 0 8px 20px rgb(0 0 0 / .06)',
      },
      spacing: {
        'space-1': '4px',
        'space-2': '8px',
        'space-3': '12px',
        'space-4': '16px',
        'space-6': '24px',
        'space-8': '32px',
      },
    },
  },
  plugins: [],
}
