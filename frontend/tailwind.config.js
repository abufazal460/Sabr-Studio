/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        ink: '#111111',
        white: '#FFFFFF',
        muted: '#666666',
        border: '#E4E4E4',
        surface: '#FAFAFA',
        cream: '#F7F3EC',
        brown: '#8B4A2E',
        'footer-bg': '#0D0D0D',
        'footer-text': '#F5F5F5',
        'footer-muted': '#9A9A9A',
        error: '#B3261E',
        success: '#1E7B45',
        'focus-ring': '#111111',
        social: {
          whatsapp: '#25D366',
          facebook: '#1877F2',
          instagram: '#E1306C',
          x: '#334155',
          youtube: '#FF0000',
        },
      },
      fontFamily: {
        abhaya: ['"Abhaya Libre"', 'serif'],
        inter: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        'hover': '0 8px 24px rgba(0,0,0,0.12)',
        'none': 'none',
      },
      borderRadius: {
        'none': '0px',
        'sm': '4px',
        'md': '8px',
        'full': '9999px',
      },
      maxWidth: {
        'content': '42rem',
        'container-desktop': '1280px',
        'container-wide': '1400px',
      },
    },
  },
  plugins: [],
}
