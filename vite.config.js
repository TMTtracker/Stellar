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
    }
})
