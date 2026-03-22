import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Treat src/onboarding/ as the Vite project root
  // (Vite looks for index.html here)
  root: 'src/onboarding',
  // base must match the URL path where the app is served so that
  // asset references in the compiled index.html point to the right place
  base: '/onboarding/',
  build: {
    // Compile to /onboarding/, replacing the vanilla JS files
    outDir: '../../onboarding',
    emptyOutDir: true,
  },
})
