// Verificación de la demo estática publicada en GitHub Pages.
// Confirma que la interfaz carga correctamente y que, al no existir backend,
// el flujo de carga de CSV falla de forma controlada (estado de error de
// red), sin romper la aplicación.
import { chromium } from '@playwright/test'
import path from 'node:path'
import assert from 'node:assert/strict'

const URL = process.env.PAGES_URL ?? 'https://nico961003.github.io/TipoDeCambioDevin/'
const DEXUSEU_CSV = path.resolve('DEXUSEU.csv')

const browser = await chromium.launch()
const page = await browser.newPage()

await page.goto(URL)
await page.locator('h1', { hasText: 'Tipo de cambio USD-EUR' }).waitFor()
console.log('✓ Demo estática cargada correctamente en', URL)

await page.getByLabel('Seleccionar archivo CSV').setInputFiles(DEXUSEU_CSV)
const alert = page.getByRole('alert')
await alert.waitFor({ timeout: 10000 })
const message = await alert.textContent()
console.log('✓ Sin backend disponible, la interfaz degrada con un error controlado:', message.trim())
assert.ok(message.includes('conectar') || message.includes('servidor'))

await browser.close()
console.log('\nDemo de GitHub Pages verificada correctamente.')
