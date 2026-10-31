/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        uno: {
          red: '#EF4444',
          blue: '#3B82F6',
          green: '#10B981',
          yellow: '#F59E0B',
          wild: '#8B5CF6',
          dark: '#0B1120',
          cardDark: '#1E293B',
          surface: '#151F32',
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 2s infinite',
        'deal': 'dealCard 0.4s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(-3%)' },
          '50%': { transform: 'translateY(0)' },
        },
        dealCard: {
          '0%': { transform: 'scale(0.3) translateY(-100px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
