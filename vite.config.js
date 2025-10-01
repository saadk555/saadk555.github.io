import { defineConfig } from 'vite'

export default defineConfig({
  base: '/saadk555.github.io/',
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