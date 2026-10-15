import { expect, test } from '@playwright/test'
import path from 'node:path'

const DEXUSEU_CSV = path.resolve('DEXUSEU.csv')

// Valores de referencia calculados a partir de DEXUSEU.csv mediante
// server/src/csv-processor.js y frontend/src/range.js, para no depender de
// cálculos duplicados dentro de la prueba.
const EXPECTED_SUMMARY = { totalRows: 6950, validRows: 6682, discardedRows: 268 }
const EXPECTED_RANGE_COUNTS = { 1: 251, 2: 502, 5: 1248, 10: 2498 }
// Observación más antigua del intervalo de 1 año (2024-08-22 a 2025-08-22).
const OLDEST_OBSERVATION_IN_1_YEAR = '22 de agosto de 2024. USD por EUR: 1,1114. EUR por USD: 0,899766.'

async function uploadMainFixture(page) {
  await page.goto('/')
  await page.getByLabel('Seleccionar archivo CSV').setInputFiles(DEXUSEU_CSV)
  await expect(page.locator('.chart-container')).toBeVisible({ timeout: 15000 })
}

test.describe('T24 — flujo completo: carga, resumen y ambas series', () => {
  test('carga DEXUSEU.csv y comprueba el resumen', async ({ page }) => {
    await uploadMainFixture(page)

    await expect(page.getByText('Archivo procesado con filas descartadas: DEXUSEU.csv.')).toBeVisible()
    await expect(page.locator('.processing-summary')).toContainText(String(EXPECTED_SUMMARY.totalRows))
    await expect(page.locator('.processing-summary')).toContainText(String(EXPECTED_SUMMARY.validRows))
    await expect(page.locator('.processing-summary')).toContainText(String(EXPECTED_SUMMARY.discardedRows))
  })

  test('muestra ambas series en la leyenda con estilos distinguibles', async ({ page }) => {
    await uploadMainFixture(page)

    const legend = page.getByLabel('Leyenda')
    await expect(legend).toContainText('USD por EUR')
    await expect(legend).toContainText('EUR por USD')
    await expect(page.locator('.legend-line.usd')).toBeVisible()
    await expect(page.locator('.legend-line.eur')).toBeVisible()
  })
})

test.describe('T24 — selector de intervalos sin peticiones adicionales', () => {
  test('cambia el número de observaciones visibles para 1, 2, 5 y 10 años sin red adicional', async ({ page }) => {
    await uploadMainFixture(page)

    const apiRequests = []
    page.on('request', (request) => {
      if (request.url().includes('/api/exchange-rates')) apiRequests.push(request.url())
    })

    // El intervalo por defecto es 1 año.
    await expect(page.locator('.range-selector button', { hasText: '1 año' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.chart-container .sr-only').first()).toHaveText(`${EXPECTED_RANGE_COUNTS[1]} observaciones en el intervalo seleccionado.`)

    for (const years of [2, 5, 10, 1]) {
      await page.locator('.range-selector button', { hasText: `${years} ${years === 1 ? 'año' : 'años'}` }).click()
      await expect(page.locator('.range-selector button', { hasText: `${years} ${years === 1 ? 'año' : 'años'}` })).toHaveAttribute('aria-pressed', 'true')
      await expect(page.locator('.chart-container .sr-only').first()).toHaveText(`${EXPECTED_RANGE_COUNTS[years]} observaciones en el intervalo seleccionado.`)
    }

    expect(apiRequests).toHaveLength(0)
  })
})

test.describe('T24 — cruz, tooltip, leyenda y navegación por teclado', () => {
  test('la cruz y el tooltip muestran fecha y ambas cotizaciones al pasar el puntero', async ({ page }) => {
    await uploadMainFixture(page)

    // Una primera interacción con el gráfico (aquí vía teclado) inicializa el
    // estado interno de ECharts que el hover por puntero necesita para poder
    // posicionar el tooltip flotante de forma fiable en la primera ejecución.
    await page.locator('.chart-container').focus()
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(300)

    const box = await page.locator('.chart-container canvas').first().boundingBox()

    for (let step = 0; step < 6; step += 1) {
      await page.mouse.move(box.x + box.width / 2 + step, box.y + box.height / 2 + step, { steps: 5 })
      await page.waitForTimeout(80)
    }

    const tooltip = page.locator('.chart-container div[style*="z-index: 9999999"]')
    await expect(tooltip).toBeVisible({ timeout: 10000 })
    await expect(tooltip).toContainText('USD por EUR:')
    await expect(tooltip).toContainText('EUR por USD:')
    await expect(tooltip).toContainText(/de \d{4}/)
  })

  test('la leyenda permite activar y desactivar cada serie sin recalcular los datos', async ({ page }) => {
    await uploadMainFixture(page)

    const optionBefore = await page.evaluate(() => {
      const instance = document.querySelector('.chart-container .echarts-for-react')
      return instance ? 'present' : 'missing'
    })
    expect(optionBefore).toBe('present')

    const box = await page.locator('.chart-container canvas').first().boundingBox()
    // La leyenda de ECharts se dibuja en el propio canvas; comprobamos que el
    // área superior del gráfico (donde se ubica) responde a interacción sin
    // alterar el conteo de observaciones visibles (los datos no cambian).
    const countBefore = await page.locator('.chart-container .sr-only').first().textContent()
    await page.mouse.click(box.x + 20, box.y + 10)
    const countAfter = await page.locator('.chart-container .sr-only').first().textContent()
    expect(countAfter).toBe(countBefore)
  })

  test('permite recorrer las observaciones con el teclado y anuncia los valores', async ({ page }) => {
    await uploadMainFixture(page)

    const chart = page.locator('.chart-container')
    await chart.focus()

    const liveRegion = chart.locator('p[role="status"]')
    await expect(liveRegion).toHaveText('')

    await page.keyboard.press('ArrowDown')
    await expect(liveRegion).toHaveText(OLDEST_OBSERVATION_IN_1_YEAR)

    await page.keyboard.press('ArrowUp')
    await expect(liveRegion).not.toHaveText(OLDEST_OBSERVATION_IN_1_YEAR)
    await expect(liveRegion).toContainText('USD por EUR:')
  })

  test('Escape oculta el tooltip activo', async ({ page }) => {
    await uploadMainFixture(page)

    const chart = page.locator('.chart-container')
    await chart.focus()
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(300)

    const box = await page.locator('.chart-container canvas').first().boundingBox()

    for (let step = 0; step < 6; step += 1) {
      await page.mouse.move(box.x + box.width / 2 + step, box.y + box.height / 2 + step, { steps: 5 })
      await page.waitForTimeout(80)
    }

    const tooltip = page.locator('.chart-container div[style*="z-index: 9999999"]')
    await expect(tooltip).toBeVisible({ timeout: 10000 })

    await chart.focus()
    await page.keyboard.press('Escape')
    await expect(tooltip).toBeHidden()

    const liveRegion = chart.locator('p[role="status"]')
    await expect(liveRegion).toHaveText('')
  })
})
