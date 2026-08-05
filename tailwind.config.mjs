/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Ver docs/DESIGN.md — não adicionar cores fora deste sistema sem atualizar o documento.
        espresso: '#2B1F1C',
        poudre: '#F1E8E1',
        vinho: '#7A2E3B',
        ouro: '#B8935A',
        argila: '#8C6F5E',
        creme: '#F7F2EC',
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        body: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.01em' }],
        'display-l': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'display-m': ['2rem', { lineHeight: '1.2' }],
        label: ['0.8rem', { lineHeight: '1.4', letterSpacing: '0.12em' }],
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
