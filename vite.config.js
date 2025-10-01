import { defineConfig } from 'vite'

export default defineConfig({
  base: '/saadk555.github.io/',
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