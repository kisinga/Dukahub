/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./view/**/*.templ"],
  theme: {
    extend: {},
  },
  daisyui: {
    themes: ["light", "dark"],
  },
  plugins: [require("@tailwindcss/typography"), require("daisyui")],
};
