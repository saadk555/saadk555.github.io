import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          gsap: ['gsap'],
          'gsap-scroll-trigger': ['gsap/ScrollTrigger'],
          three: ['three'],
          lottie: ['lottie-web']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['gsap', 'gsap/ScrollTrigger', 'three', 'lottie-web']
  }
})