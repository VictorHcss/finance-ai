/** @type {import('tailwindcss').Config} */
// Paleta copiada do app (../tailwind.config.js) para a landing manter a
// mesma identidade: neutros com leve tom verde, verde de marca, coral para
// saídas e roxo "ai" reservado para conteúdo gerado pelos insights.
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        zinc: {
          50: "hsl(150, 20%, 97%)",
          100: "hsl(150, 14%, 93%)",
          200: "hsl(150, 10%, 85%)",
          300: "hsl(150, 8%, 72%)",
          400: "hsl(150, 6%, 56%)",
          500: "hsl(152, 6%, 44%)",
          600: "hsl(154, 8%, 32%)",
          700: "hsl(156, 10%, 21%)",
          800: "hsl(158, 12%, 14%)",
          900: "hsl(160, 14%, 9%)",
          950: "hsl(162, 18%, 6%)",
        },
        emerald: {
          50: "#ECFDF6",
          100: "#D1FAE8",
          200: "#A3F2D1",
          300: "#6BE0B3",
          400: "#3AC895",
          500: "#1BAF80",
          600: "#0E8D68",
          700: "#0B7054",
          800: "#0A5943",
          900: "#093F31",
          950: "#04241C",
        },
        rose: {
          300: "#FCA5AD",
          400: "#F97A88",
          500: "#EF4A5F",
          600: "#D6324B",
        },
        ai: {
          200: "#C9C0FF",
          300: "#A99CFB",
          400: "#8D7CF7",
          500: "#7562EF",
          600: "#5D48D6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "none" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
