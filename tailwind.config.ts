import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Poppins', 'system-ui', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					hover: 'hsl(var(--primary-hover))',
					active: 'hsl(var(--primary-active))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					hover: 'hsl(var(--secondary-hover))',
					active: 'hsl(var(--secondary-active))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				'breathing': {
					primary: 'hsl(var(--breathing-primary))',
					secondary: 'hsl(var(--breathing-secondary))',
					inhale: 'hsl(var(--breathing-inhale))',
					hold: 'hsl(var(--breathing-hold))',
					exhale: 'hsl(var(--breathing-exhale))',
					pause: 'hsl(var(--breathing-pause))',
				},
				'sounds': {
					primary: 'hsl(var(--sounds-primary))',
					secondary: 'hsl(var(--sounds-secondary))',
					accent: 'hsl(var(--sounds-accent))',
				},
				'evolution': {
					primary: 'hsl(var(--evolution-primary))',
					secondary: 'hsl(var(--evolution-secondary))'
				},
				'sos': {
					primary: 'hsl(var(--sos-primary))',
					secondary: 'hsl(var(--sos-secondary))',
					glow: 'hsl(var(--sos-glow))'
				}
			},
			boxShadow: {
				sm: 'var(--shadow-sm)',
				DEFAULT: 'var(--shadow-md)',
				md: 'var(--shadow-md)',
				lg: 'var(--shadow-lg)',
				primary: 'var(--shadow-primary)',
				success: 'var(--shadow-success)',
			},
			animation: {
				'fade-in': 'fadeIn 0.5s ease-in-out',
				'slide-up': 'slideUp 0.4s ease-out',
				'breathing': 'breathing 8s ease-in-out infinite',
				'pulse-gentle': 'pulseGentle 2s ease-in-out infinite',
				'expand': 'expand 0.2s ease-out',
				'sound-wave': 'soundWave 1.5s ease-in-out infinite',
			},
			transitionDuration: {
				'4000': '4000ms',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fadeIn': {
					from: {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					to: {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slideUp': {
					from: {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					to: {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'breathing': {
					'0%, 100%': {
						transform: 'scale(1)',
					},
					'50%': {
						transform: 'scale(1.2)',
					}
				},
				'pulseGentle': {
					'0%, 100%': {
						transform: 'scale(1)',
						opacity: '1'
					},
					'50%': {
						transform: 'scale(1.05)',
						opacity: '0.9'
					}
				},
				'expand': {
					'0%': {
						transform: 'scale(1)'
					},
					'100%': {
						transform: 'scale(1.05)'
					}
				},
				'soundWave': {
					'0%, 100%': {
						transform: 'scale(1)',
						opacity: '0.6'
					},
					'50%': {
						transform: 'scale(1.1)',
						opacity: '1'
					}
				}
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
