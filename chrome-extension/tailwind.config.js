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
          1: '#10B981',
          2: '#F59E0B',
          3: '#F97316',
          4: '#EF4444',
          5: '#991B1B'
        },
        relationship: {
          excellent: '#10B981',
          good: '#3B82F6',
          attention: '#F59E0B',
          critical: '#EF4444'
        },
        burn: {
          pink: '#FF69B4',
          'pink-dark': '#E0479A',
          'pink-darker': '#C72F80',
          'pink-light': '#FFB6D9',
          'pink-50': '#FFF0F6',
          cream: '#FFF8F0',
          'cream-dark': '#F5E6D3',
          black: '#1A0A0A',
          gray: '#6B5B5B',
          'gray-light': '#A89898',
          gold: '#D4A574'
        }
      },
      fontFamily: {
        handwritten: ['Caveat', 'cursive'],
        serif: ['Playfair Display', 'Georgia', 'serif']
      },
      boxShadow: {
        notebook: '0 2px 8px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(212,165,116,0.15)',
        diary: '0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)'
      },
      backgroundImage: {
        'lined-paper': 'repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(212,165,116,0.2) 27px, rgba(212,165,116,0.2) 28px)'
      }
    }
  },
  plugins: []
}
