/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{vue,js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a1c1f',
        paper: '#f7f8fa',
        line: '#e3e6ec',
        accent: '#2d6a9f'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.35rem'
      },
      boxShadow: {
        soft: '0 14px 40px rgba(20, 30, 45, 0.08)'
      }
    }
  },
  plugins: []
}
