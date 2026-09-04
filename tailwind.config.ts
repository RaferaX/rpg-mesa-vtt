import type { Config } from "tailwindcss"

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B1712",
        parchment: "#E8DCC0",
        leather: "#6B3F2A",
        brass: "#B08A3E",
        seal: "#7A2E2E",
        moss: "#4A5240",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
    },
  },
} satisfies Config