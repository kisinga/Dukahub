/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {},
  },
  daisyui: {
    themes: [
      {
        light: {
          primary: "#FFCC00", // Bright Yellow
          secondary: "#0057A0", // Deep Blue
          accent: "#FF6F00", // A complementary vibrant accent color
          neutral: "#0F1023", // Dark neutral
          "base-100": "#FFFFFF", // White
          "base-200": "#F6F7FB", // Light grey
          "base-300": "#FAFBFC", // Slightly darker grey
          info: "#00A9E0", // Bright Blue
          success: "#00A859", // Bright Green
          warning: "#FFC107", // Bright Yellow-Orange
          error: "#FF5252", // Bright Red
        },
      },
      {
        dark: {
          primary: "#FFCC00", // Bright Yellow
          secondary: "#0057A0", // Deep Blue
          accent: "#FF6F00", // A complementary vibrant accent color
          neutral: "#4E5168", // Medium dark neutral
          "base-100": "#393B51", // Dark grey
          "base-200": "#2B2D43", // Darker grey
          "base-300": "#0F1023", // Dark neutral
          info: "#00A9E0", // Bright Blue
          success: "#00A859", // Bright Green
          warning: "#FFC107", // Bright Yellow-Orange
          error: "#FF5252", // Bright Red
        },
      },
    ],
  },
  plugins: [require("daisyui")],
};
