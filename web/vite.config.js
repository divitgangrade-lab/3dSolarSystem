import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base keeps the build portable: it works at /, at /3dSolarSystem/,
// and inside a preview host without rebuilding.
export default defineConfig({
  base: './',
  plugins: [react()],
})
