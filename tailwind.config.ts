import type { Config } from "tailwindcss";


const config: Config = {
darkMode: "class",
content: [
"./src/pages/**/*.{ts,tsx}",
"./src/components/**/*.{ts,tsx}",
"./src/app/**/*.{ts,tsx}",
],
theme: {
extend: {
colors: {
brand: {
50: "#eef4ff",
100: "#dbe8ff",
200: "#bcd1ff",
300: "#93b2ff",
400: "#6b92ff",
500: "#4774ff", // primary
600: "#2d58f2",
700: "#2345c0",
800: "#1a3592",
900: "#12276a",
},
success: "#22c55e",
danger: "#ef4444",
},
boxShadow: {
card: "0 10px 40px rgba(0,0,0,.18)",
},
borderRadius: {
xl: "1rem",
'2xl': "1.25rem",
},
},
},
plugins: [],
};
export default config;