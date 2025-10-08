module.exports = {
  content: ['src/**/*.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Arial', 'sans-serif'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
}