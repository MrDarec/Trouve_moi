/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#FF6B35', dark: '#e55a24', 50: '#fff5f0' },
        sidebar: '#1e293b',
      },
    },
  },
  plugins: [],
};
