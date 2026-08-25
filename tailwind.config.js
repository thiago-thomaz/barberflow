/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        barber: {
          50: '#fcf8f2',
          100: '#f8efdf',
          200: '#eedab9',
          300: '#e3be8a',
          400: '#d79e5a',
          500: '#ce8235',
          600: '#bf6c2a',
          700: '#9e5223',
          800: '#7e4222',
          900: '#67371f',
          gold: '#D4AF37',
          goldHover: '#C59E27',
          dark: '#121417',
          darker: '#0B0D0E',
          card: '#1A1D21',
          border: '#2A2E35'
        }
      },
    },
  },
  plugins: [],
};
