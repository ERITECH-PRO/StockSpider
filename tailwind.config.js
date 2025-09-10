/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        '3s': {
          blue: '#4DA1FF',
          'blue-dark': '#3B82F6',
          'blue-light': '#60A5FA',
          red: '#FF4D4D',
          'red-dark': '#EF4444',
          black: '#1C1C1C',
          'gray-light': '#F8FAFC',
          'gray-medium': '#64748B',
        }
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
      },
      boxShadow: {
        '3s': '0 4px 6px -1px rgba(77, 161, 255, 0.1), 0 2px 4px -1px rgba(77, 161, 255, 0.06)',
        '3s-lg': '0 10px 15px -3px rgba(77, 161, 255, 0.1), 0 4px 6px -2px rgba(77, 161, 255, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
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
