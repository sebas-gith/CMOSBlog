/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			fontFamily: {
				// 'serif' para el cuerpo del texto (estilo libro/Medium)
				serif: ['Merriweather', 'Georgia', 'Cambria', 'serif'],
				// 'sans' para los títulos
				sans: ['Inter', 'system-ui', 'sans-serif'],
			},
		},
	},
	plugins: [
		// Este plugin maneja los estilos de los artículos automáticamente
		require('@tailwindcss/typography'), 
	],
}