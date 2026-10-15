import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import path from 'node:path'

const DEXUSEU_CSV = path.resolve('DEXUSEU.csv')

function criticalOrSerious(results) {
  return results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
}

test.describe('auditoría de accesibilidad (WCAG 2.1 AA)', () => {
  test('sin archivo cargado no presenta infracciones críticas o graves', async ({ page }) => {
    await page.goto('/')

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const blocking = criticalOrSerious(results)

    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])
  })

  test('con datos cargados y gráfico visible no presenta infracciones críticas o graves', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Seleccionar archivo CSV').setInputFiles(DEXUSEU_CSV)
    await expect(page.locator('.chart-container')).toBeVisible({ timeout: 15000 })

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const blocking = criticalOrSerious(results)

    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])
  })

  test('un estado de error se anuncia de forma accesible', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Seleccionar archivo CSV').setInputFiles({
      name: 'malo.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('no es un csv'),
    })

    await expect(page.getByRole('alert')).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    const blocking = criticalOrSerious(results)

    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])
  })

  test('el control de archivo tiene nombre accesible y recibe foco visible por teclado', async ({ page }) => {
    await page.goto('/')
    const input = page.getByLabel('Seleccionar archivo CSV')

    await page.keyboard.press('Tab')
    await expect(input).toBeFocused()
  })
})
