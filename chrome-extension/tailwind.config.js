/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/popup/**/*.{html,js,jsx,ts,tsx}",
    "./src/fullpage/**/*.{html,js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        severity: {
          1: '#10B981', // green - minor
          2: '#F59E0B', // yellow - moderate
          3: '#F97316', // orange - significant
          4: '#EF4444', // red - severe
          5: '#991B1B'  // dark red - unforgivable
        },
        relationship: {
          excellent: '#10B981',
          good: '#3B82F6',
          attention: '#F59E0B',
          critical: '#EF4444'
        }
      }
    }
  },
  plugins: []
}
