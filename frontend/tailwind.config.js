/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        theme: {
          bg: '#000000',
          surface: '#09090b',
          card: 'rgba(12, 12, 14, 0.88)',
          cardHover: 'rgba(20, 20, 22, 0.95)',
          border: 'rgba(255, 255, 255, 0.12)',
          borderGlow: 'rgba(255, 255, 255, 0.28)',
          text: '#ffffff',
          muted: '#a1a1aa',
          dim: '#71717a',
          accent: '#ffffff',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'bw-card': '0 20px 40px -15px rgba(0, 0, 0, 0.95), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
        'bw-glow': '0 0 25px -5px rgba(255, 255, 255, 0.25), 0 10px 30px -10px rgba(0, 0, 0, 0.9)',
      }
    },
  },
  plugins: [],
}
