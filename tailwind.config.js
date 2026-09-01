/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        money: {
          in: '#16a34a',   // green = money in (collection)
          out: '#ea580c'   // orange = money out (loan given)
        }
      }
    }
  },
  plugins: []
}
