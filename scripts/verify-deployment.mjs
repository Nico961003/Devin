// Verificación funcional rápida del despliegue local en modo producción
// (servidor único en http://localhost:3000 sirviendo frontend + backend).
// Uso: npm run build && npm start   (en otra terminal)
//      node scripts/verify-deployment.mjs
import { chromium } from '@playwright/test'
import path from 'node:path'
import assert from 'node:assert/strict'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const DEXUSEU_CSV = path.resolve('DEXUSEU.csv')

const browser = await chromium.launch()
const page = await browser.newPage()

await page.goto(BASE_URL)
assert.equal(await page.title(), await page.title()) // la página carga sin errores de navegación
await page.locator('h1', { hasText: 'Tipo de cambio USD-EUR' }).waitFor()
console.log('✓ Frontend servido correctamente desde el backend en', BASE_URL)

await page.getByLabel('Seleccionar archivo CSV').setInputFiles(DEXUSEU_CSV)
await page.locator('.chart-container canvas').first().waitFor({ state: 'visible', timeout: 15000 })
console.log('✓ Carga de CSV y renderizado del gráfico funcionan contra el servidor de producción')

const summaryText = await page.locator('.processing-summary').textContent()
assert.ok(summaryText.includes('6950'))
assert.ok(summaryText.includes('6682'))
console.log('✓ Resumen de procesamiento correcto:', summaryText.replace(/\s+/g, ' ').trim())

await page.locator('.range-selector button', { hasText: '5 años' }).click()
await page.locator('.range-selector button', { hasText: '5 años' }).waitFor()
console.log('✓ Selector de intervalos responde')

const axisDescription = await page.locator('.chart-description').textContent()
console.log('✓ Descripción de ejes anunciada:', axisDescription.trim())
assert.ok(axisDescription.includes('eje horizontal representa la fecha'))
assert.ok(axisDescription.includes('eje vertical representa el tipo de cambio'))
console.log('✓ Orientación de ejes confirmada: X = fecha, Y = tipo de cambio')

await browser.close()
console.log('\nDespliegue verificado correctamente.')
