import { expect, test } from '@playwright/test'
import path from 'node:path'

const DEXUSEU_CSV = path.resolve('DEXUSEU.csv')

// Suite mínima ejecutada en los tres proyectos de navegador configurados en
// playwright.config.js (chromium, firefox, webkit) para verificar T21:
// carga, filtrado, leyenda, tooltip y teclado funcionan de forma consistente.
test.describe('flujo principal entre navegadores', () => {
  test('carga el CSV, filtra por intervalos y muestra la leyenda', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Seleccionar archivo CSV').setInputFiles(DEXUSEU_CSV)
    await expect(page.locator('.chart-container')).toBeVisible({ timeout: 15000 })

    await expect(page.getByLabel('Leyenda')).toContainText('USD por EUR')
    await expect(page.getByLabel('Leyenda')).toContainText('EUR por USD')

    await expect(page.locator('.range-selector button', { hasText: '1 año' })).toHaveAttribute('aria-pressed', 'true')
    await page.locator('.range-selector button', { hasText: '5 años' }).click()
    await expect(page.locator('.range-selector button', { hasText: '5 años' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('el tooltip aparece al pasar el puntero y el teclado recorre observaciones', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Seleccionar archivo CSV').setInputFiles(DEXUSEU_CSV)
    await expect(page.locator('.chart-container')).toBeVisible({ timeout: 15000 })

    const chart = page.locator('.chart-container')
    await chart.focus()
    await page.keyboard.press('ArrowDown')

    const liveRegion = chart.locator('p[role="status"]')
    await expect(liveRegion).toContainText('USD por EUR')

    const box = await page.locator('.chart-container canvas').first().boundingBox()
    for (let step = 0; step < 6; step += 1) {
      await page.mouse.move(box.x + box.width / 2 + step, box.y + box.height / 2 + step, { steps: 5 })
      await page.waitForTimeout(80)
    }

    const tooltip = page.locator('.chart-container div[style*="z-index: 9999999"]')
    await expect(tooltip).toBeVisible({ timeout: 10000 })
    await expect(tooltip).toContainText('USD por EUR:')

    await page.keyboard.press('Escape')
    await expect(tooltip).toBeHidden()
  })
})
