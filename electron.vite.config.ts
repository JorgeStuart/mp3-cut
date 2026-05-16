import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    /**
     * Com `"type": "module"` no package.json, um `index.js` em CommonJS é mal interpretado.
     * `.cjs` + formato CJS evita o crash `Cannot read properties of undefined (reading 'exports')` ao carregar `electron`.
     */
    build: {
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    },
    resolve: {
      alias: {
        '@/main': resolve('src/main')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@/preload': resolve('src/preload')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [vue()],
    optimizeDeps: {
      include: ['lamejs', 'wavesurfer.js']
    },
    /** lamejs usa CommonJS; evita erro no bundle da janela. */
    build: {
      commonjsOptions: {
        transformMixedEsModules: true
      }
    }
  }
})
