import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				accent: '#e62027',
				"primary-gray": '#525252',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				sans: ['var(--font-montserrat)', 'sans-serif']
			},
			fontSize: {
				h1: ["2.25rem", { lineHeight: "2.5rem", fontWeight: "700" }],
				h2: ["1.875rem", { lineHeight: "2.25rem", fontWeight: "600" }],
				h3: ["1.5rem", { lineHeight: "2rem", fontWeight: "600" }],
				body: ["1rem", { lineHeight: "1.5rem", fontWeight: "400" }],
				small: ["0.875rem", { lineHeight: "1.25rem", fontWeight: "400" }],
				caption: ["0.75rem", { lineHeight: "1rem", fontWeight: "500" }],
				header: ["14px", { lineHeight: "21px", fontWeight: "400" }],
				"features-text": ["16px", { lineHeight: "22px", fontWeight: "700" }],
				"tabs-title": ["20px", { lineHeight: "20px", fontWeight: "700" }],
				"tabs-title-mobile": ["18px", { lineHeight: "26px", fontWeight: "700" }],
				"dropdown-item": ["14px", { lineHeight: "18px", fontWeight: "400" }],
				"dropdown-sub-item": ["15px", { lineHeight: "20px", fontWeight: "700" }],
				"contact-phone": ["16px", { lineHeight: "16px", fontWeight: "400" }],
				"product-title": ["15px", { lineHeight: "18px", fontWeight: "500" }],
				"product-price": ["15px", { lineHeight: "18px", fontWeight: "700" }],
				"category-title-mobile": ["18px", { lineHeight: "24px", fontWeight: "400" }],
				"subcategory-title-mobile": ["16px", { lineHeight: "20px", fontWeight: "400" }],
			},
			keyframes: {
				"slide-up": {
					"0%": { transform: "translateY(100%)" },
					"100%": { transform: "translateY(0)" },
				},
			},
			animation: {
				"slide-up": "slide-up 0.3s ease-out",
			},
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		function({ addUtilities }: any) {
			addUtilities({
				'.scrollbar-hide': {
					'-ms-overflow-style': 'none',
					'scrollbar-width': 'none',
					'&::-webkit-scrollbar': {
						display: 'none'
					}
				}
			});
		}
	],
} satisfies Config;
