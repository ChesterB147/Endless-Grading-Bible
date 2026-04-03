import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: "#12b3c3",
        navy: "#262262",
        grey: "#c0c8c5",
        orange: "#f04e23",
      },
    },
  },
  plugins: [],
};
export default config;
