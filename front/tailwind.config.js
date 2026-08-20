/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")], // <-- L'ajout vital pour la V4
  theme: {
    extend: {},
  },
  plugins: [],
};
