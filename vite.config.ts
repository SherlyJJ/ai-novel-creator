import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import startBackend from './vite-start-server.plugin'

const disableElectron = process.env.DISABLE_ELECTRON === '1'

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  plugins: [
    react(),
    startBackend(),
    ...(disableElectron
      ? []
      : [
          electron([
            {
              entry: 'electron/main.ts',
              onstart(options) {
                options.startup()
              },
              vite: {
                build: {
                  sourcemap: true,
                  minify: false,
                  outDir: 'dist-electron/main',
                }
              }
            },
            {
              entry: 'electron/preload.ts',
              onstart(options) {
                options.reload()
              },
              vite: {
                build: {
                  sourcemap: true,
                  minify: false,
                  outDir: 'dist-electron/preload',
                }
              }
            }
          ]),
          renderer(),
        ]),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
