/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Hanken Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'Times New Roman', 'serif'],
      },
      keyframes: {
        pop: {
          '0%':   { transform: 'scale(0.92)', opacity: '0' },
          '60%':  { transform: 'scale(1.04)', opacity: '1' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
      },
      animation: {
        pop:        'pop 0.35s ease-out',
        'slide-up': 'slide-up 0.22s ease-out',
      },
      colors: {
        ink:          '#1A1714',
        ink2:         '#3D3830',
        ink3:         '#7A7369',
        surface:      '#F7F5F1',
        surface2:     '#EDE9E3',
        surface3:     '#DDD8CF',
        card:         '#FFFFFF',
        gold:         '#B07D2E',
        'gold-light': '#F5E8CC',
        green:        '#2D6A4F',
        red:          '#9B2335',
        blue:         '#1B4F8A',
      },
      borderRadius: {
        sm:   '8px',
        md:   '10px',
        xl:   '12px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
};
