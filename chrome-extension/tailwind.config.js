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
        serif: ['Arial', 'sans-serif']
      },
      boxShadow: {
        notebook: '0 2px 8px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(212,165,116,0.15)',
        diary: '0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)'
      },
      backgroundImage: {
        'lined-paper': 'repeating-linear-gradient(to bottom, transparent, transparent 27px, rgba(212,165,116,0.2) 27px, rgba(212,165,116,0.2) 28px)'
      },
      perspective: {
        '1000': '1000px',
        '1500': '1500px',
        '2000': '2000px',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      animation: {
        'page-flip-left': 'pageFlipLeft 0.6s ease-in-out',
        'page-flip-right': 'pageFlipRight 0.6s ease-in-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'dock-bounce': 'dockBounce 0.6s ease-out',
      },
      keyframes: {
        pageFlipLeft: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(-180deg)' },
        },
        pageFlipRight: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        dockBounce: {
          '0%': { transform: 'translateY(100px)', opacity: '0' },
          '50%': { transform: 'translateY(-10px)', opacity: '1' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    }
  },
  plugins: []
}
