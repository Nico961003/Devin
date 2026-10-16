import { defineConfig, mergeConfig } from 'vite'
import baseConfig from './vite.config.js'

// Configuración específica para publicar una demo estática en GitHub Pages
// (proyecto servido en /TipoDeCambioDevin/, no en la raíz del dominio).
// La build de producción normal (vite.config.js, servida por Express desde
// server/src/app.js) sigue usando base '/' y no se ve afectada por esto.
//
// Importante: esta build es solo una demo visual. GitHub Pages no puede
// ejecutar el backend Express, así que la carga de CSV no tendrá API con la
// que hablar (la interfaz mostrará el estado de error de red de forma
// controlada, sin romperse).
export default defineConfig(mergeConfig(baseConfig, {
  base: '/TipoDeCambioDevin/',
  build: {
    outDir: '../dist-pages',
    emptyOutDir: true,
  },
}))
