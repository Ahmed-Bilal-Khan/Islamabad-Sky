// Builds the <IslamabadSky> component on its own, for use in other projects.
// React stays external so the host app's copy is used.
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'dist-lib',
    lib: {
      entry: 'src/sky/index.ts',
      formats: ['es'],
      fileName: 'islamabad-sky',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
})
