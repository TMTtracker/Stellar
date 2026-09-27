import path from 'node:path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [tailwindcss(), react()],
    assetsInclude: ['**/*.glb'],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src')
        }
    },
    // Dev-only proxy: browsers block cross-origin calls to ollama.com (CORS),
    // so the app calls same-origin `/api/ollama/*` and Vite forwards it.
    // Restart `npm run dev` after changing this. Production hosting needs an
    // equivalent rewrite of `/api/ollama/*` -> `https://ollama.com/api/*`.
    server: {
        proxy: {
            '/api/ollama': {
                target: 'https://ollama.com/api',
                changeOrigin: true,
                rewrite: (p) => p.replace(/^\/api\/ollama/, '')
            }
        }
    }
})
