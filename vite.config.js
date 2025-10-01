import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Add the plugins array from your Tailwind config
  plugins: [
    tailwindcss(),
  ],
  
  // Keep your existing base path
  base: '/',
  
  // Keep your existing build and optimization settings
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('gsap/ScrollTrigger')) {
            return 'gsap-scroll-trigger';
          }
          if (id.includes('gsap')) {
            return 'gsap';
          }
          if (id.includes('three')) {
            return 'three';
          }
          if (id.includes('lottie-web')) {
            return 'lottie';
          }
        }
      }
    }
  },
  optimizeDeps: {
    include: ['gsap', 'gsap/ScrollTrigger', 'three', 'lottie-web']
  }
})