import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// base must match the GitHub repo name exactly (case-sensitive) for GitHub Pages.
export default defineConfig({
  base: '/Bird-Dex/',
  plugins: [react()],
  build: { target: 'es2022', sourcemap: false },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
