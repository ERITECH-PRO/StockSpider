/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        '3s': {
          blue: '#4DA1FF',
          'blue-dark': '#3B82F6',
          'blue-light': '#93C5FD',
          red: '#FF4D4D',
          'red-dark': '#DC2626',
          'red-light': '#FCA5A5',
          black: '#1C1C1C',
          'gray-dark': '#374151',
          'gray-medium': '#6B7280',
          'gray-light': '#F3F4F6',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        '3s': '0 4px 6px -1px rgba(77, 161, 255, 0.1), 0 2px 4px -1px rgba(77, 161, 255, 0.06)',
        '3s-lg': '0 10px 15px -3px rgba(77, 161, 255, 0.1), 0 4px 6px -2px rgba(77, 161, 255, 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
      },
    },
  },
  plugins: [],
};
