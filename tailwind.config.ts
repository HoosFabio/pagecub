import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FFF8EF",
        ink: "#243044",
        honey: "#E8A84F",
        sage: "#7FA58A",
        card: "#FFFFFF",
        line: "#E8DCCB"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(36, 48, 68, 0.10)",
        button: "0 10px 22px rgba(232, 168, 79, 0.30)"
      }
    }
  },
  plugins: []
};

export default config;
