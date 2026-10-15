// Mide los objetivos de rendimiento del frontend (RNF-01 / T25) usando un
// navegador real (Chromium vía Playwright) contra la app servida en modo
// desarrollo (debe estar levantada con `npm run dev` antes de ejecutar esto,
// o se puede apuntar a otra URL con BASE_URL).
//
// El tiempo de selector/tooltip se mide completamente dentro del navegador
// (performance.now() + MutationObserver) para no mezclar la latencia propia
// del protocolo de automatización (IPC de Playwright) con la respuesta real
// de la interfaz.
//
// Uso: npm run dev   (en otra terminal)
//      node scripts/measure-frontend-performance.mjs
import { chromium } from '@playwright/test'
import path from 'node:path'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'
const DEXUSEU_CSV = path.resolve('DEXUSEU.csv')

function summarize(label, times, targetMs) {
  const avg = times.reduce((sum, value) => sum + value, 0) / times.length
  const max = Math.max(...times)
  console.log(`\n${label}`)
  console.log(`  muestras: ${times.length}`)
  console.log(`  promedio: ${avg.toFixed(2)} ms`)
  console.log(`  máximo:   ${max.toFixed(2)} ms`)
  console.log(`  objetivo: < ${targetMs} ms -> ${max < targetMs ? 'CUMPLE' : 'NO CUMPLE'}`)
  return { avg, max }
}

const browser = await chromium.launch()
const page = await browser.newPage()

// --- 1) Tiempo de renderizado del gráfico tras recibir la respuesta ---
await page.goto(BASE_URL)

const chartRenderStart = Date.now()
await page.getByLabel('Seleccionar archivo CSV').setInputFiles(DEXUSEU_CSV)
await page.waitForResponse((response) => response.url().includes('/api/exchange-rates'))
const responseReceivedAt = Date.now()
await page.locator('.chart-container canvas').first().waitFor({ state: 'visible' })
const chartVisibleAt = Date.now()

console.log('\n1) Renderizado del gráfico (desde que llega la respuesta hasta que el canvas es visible)')
console.log(`  tiempo total (selección -> canvas visible): ${chartVisibleAt - chartRenderStart} ms`)
console.log(`  render puro (respuesta -> canvas visible):  ${chartVisibleAt - responseReceivedAt} ms`)
console.log(`  objetivo: < 1000 ms -> ${(chartVisibleAt - responseReceivedAt) < 1000 ? 'CUMPLE' : 'NO CUMPLE'}`)

// --- 2) Tiempo de respuesta del selector de intervalos (medido en el navegador) ---
const selectorTimes = []
for (const years of [2, 5, 10, 1, 2, 5, 10, 1]) {
  const label = `${years} ${years === 1 ? 'año' : 'años'}`
  const button = page.locator('.range-selector button', { hasText: label })

  const elapsed = await button.evaluate((buttonEl) => new Promise((resolve) => {
    const countNode = document.querySelector('.chart-container .sr-only')
    const observer = new MutationObserver(() => {
      observer.disconnect()
      resolve(performance.now() - start)
    })
    observer.observe(countNode, { characterData: true, childList: true, subtree: true })
    const start = performance.now()
    buttonEl.click()
  }))

  selectorTimes.push(elapsed)
}
summarize('2) Respuesta del selector de intervalos (click -> conteo actualizado, medido en el navegador)', selectorTimes, 100)

// --- 3) Tiempo de respuesta del tooltip ante el movimiento del puntero ---
await page.locator('.chart-container').focus()
await page.keyboard.press('ArrowDown')
await page.waitForTimeout(300)

const box = await page.locator('.chart-container canvas').first().boundingBox()
const tooltipTimes = []

for (let i = 0; i < 8; i += 1) {
  await page.mouse.move(box.x + 10, box.y + 10)
  await page.waitForTimeout(80)

  const watchPromise = page.evaluate(() => new Promise((resolve) => {
    const container = document.querySelector('.chart-container')
    const start = performance.now()
    const observer = new MutationObserver(() => {
      const tooltip = container.querySelector('div[style*="z-index: 9999999"]')
      if (tooltip && tooltip.style.display !== 'none' && tooltip.textContent.trim() !== '') {
        observer.disconnect()
        resolve(performance.now() - start)
      }
    })
    observer.observe(container, { attributes: true, childList: true, subtree: true, characterData: true })
  }))

  await page.mouse.move(box.x + box.width / 2 + i, box.y + box.height / 2 + i, { steps: 1 })
  tooltipTimes.push(await watchPromise)
}
summarize('3) Respuesta del tooltip (movimiento del puntero -> tooltip visible, medido en el navegador)', tooltipTimes, 100)

await browser.close()
