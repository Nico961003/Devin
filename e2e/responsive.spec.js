import { expect, test } from '@playwright/test'
import path from 'node:path'

const DEXUSEU_CSV = path.resolve('DEXUSEU.csv')
const VIEWPORTS = {
  móvil: { width: 320, height: 640 },
  tableta: { width: 768, height: 1024 },
  escritorio: { width: 1280, height: 800 },
}

async function hasHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
}

for (const [label, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`diseño adaptable (${label}, ${viewport.width}px)`, () => {
    test.use({ viewport })

    test('no genera desplazamiento horizontal antes de cargar un archivo', async ({ page }) => {
      await page.goto('/')
      expect(await hasHorizontalScroll(page)).toBe(false)
    })

    test('no genera desplazamiento horizontal con datos cargados y mantiene visible el selector', async ({ page }) => {
      await page.goto('/')
      await page.getByLabel('Seleccionar archivo CSV').setInputFiles(DEXUSEU_CSV)
      await expect(page.locator('.chart-container')).toBeVisible({ timeout: 15000 })

      expect(await hasHorizontalScroll(page)).toBe(false)
      await expect(page.getByLabel('Intervalo de años')).toBeVisible()
      await expect(page.locator('.chart-container canvas').first()).toBeVisible()

      // Estados, leyenda, etiquetas y tooltip no deben solaparse ni recortarse:
      // comprobamos que los bloques clave tienen un tamaño visible (> 0) en
      // este ancho de viewport.
      for (const selector of ['.status', '.legend', '.range-selector', '.chart-card']) {
        const box = await page.locator(selector).boundingBox()
        expect(box?.width).toBeGreaterThan(0)
        expect(box?.height).toBeGreaterThan(0)
      }
    })
  })
}
