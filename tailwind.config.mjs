/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Ver docs/DESIGN.md - não adicionar cores fora deste sistema sem atualizar o documento.
        burgundy: '#59010B',
        powder: '#BDDAF4',
        offwhite: '#FFFDF7',
        darkbrown: '#2D1918',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'ui-serif', 'Georgia', 'serif'],
        script: ['"Pinyon Script"', 'cursive'],
        body: ['"Open Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-2xl': ['5.5rem', { lineHeight: '1', letterSpacing: '-0.01em' }],
        'display-xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.01em' }],
        'display-l': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'display-m': ['2rem', { lineHeight: '1.2' }],
        eyebrow: ['0.8rem', { lineHeight: '1.4', letterSpacing: '0.18em' }],
      },
      maxWidth: {
        container: '1280px',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
