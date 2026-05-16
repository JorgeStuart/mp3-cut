import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/** Caminho na URL do GitHub Pages: /NOME-DO-REPO/ (com barras). Use "/" em dev local. */
const basePath = process.env.VITE_BASE_PATH ?? '/mp3-cut/'
const base = basePath === '/' ? '/' : basePath.endsWith('/') ? basePath : `${basePath}/`

export default defineConfig({
  base,
  root: resolve(__dirname, 'src/renderer'),
  publicDir: resolve(__dirname, 'public-web'),
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  plugins: [vue()],
  optimizeDeps: {
    include: ['lamejs', 'wavesurfer.js']
  },
  build: {
    outDir: resolve(__dirname, 'dist-web'),
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      input: resolve(__dirname, 'src/renderer/index.web.html')
    }
  }
})
