import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Treat src/onboarding/ as the Vite project root
  // (Vite looks for index.html here)
  root: 'src/onboarding',
  build: {
    // Compile to /onboarding/, replacing the vanilla JS files
    outDir: '../../onboarding',
    emptyOutDir: true,
  },
})
