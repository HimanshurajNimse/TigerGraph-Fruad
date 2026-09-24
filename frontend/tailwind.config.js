/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-main': '#060913',
        'bg-panel': '#111827',
        'border-color': '#1F2937',
        'text-main': '#F3F4F6',
        'text-muted': '#9CA3AF',
        'accent-primary': '#6366F1',
        'risk-high': '#EF4444',
        'risk-medium': '#F59E0B',
      },
    },
  },
  plugins: [],
}
