import { expect, test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.dirname(fileURLToPath(import.meta.url)) + '/fixtures'
const VALID_FULL_CSV = path.join(fixturesDir, 'valid-full.csv')
const MIXED_CSV = path.join(fixturesDir, 'mixed.csv')
const MISSING_COLUMNS_CSV = path.join(fixturesDir, 'missing-columns.csv')

test.describe('T24 — los cinco estados de interfaz', () => {
  test('1. sin archivo cargado', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('No se ha seleccionado ningún archivo.')).toBeVisible()
    await expect(page.locator('.status')).toHaveClass(/status--idle/)
  })

  test('2. procesando archivo', async ({ page }) => {
    await page.goto('/')
    // Retrasa la respuesta de la API para poder observar el estado de carga.
    await page.route('**/api/exchange-rates', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.continue()
    })

    const input = page.getByLabel('Seleccionar archivo CSV')
    await input.setInputFiles(VALID_FULL_CSV)

    await expect(page.getByText(/Procesando el archivo/)).toBeVisible()
    await expect(input).toBeDisabled()
    await expect(page.locator('.status')).toHaveClass(/status--loading/)
  })

  test('3. datos cargados correctamente (éxito total)', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Seleccionar archivo CSV').setInputFiles(VALID_FULL_CSV)

    await expect(page.getByText('Archivo procesado correctamente: valid-full.csv.')).toBeVisible()
    await expect(page.locator('.status')).toHaveClass(/status--success/)
    await expect(page.locator('.processing-summary')).toContainText('0')
  })

  test('4. datos cargados con filas descartadas (éxito parcial)', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Seleccionar archivo CSV').setInputFiles(MIXED_CSV)

    await expect(page.getByText('Archivo procesado con filas descartadas: mixed.csv.')).toBeVisible()
    await expect(page.locator('.status')).toHaveClass(/status--partial/)
    await expect(page.locator('.processing-summary')).toContainText('3Filas descartadas')
  })

  test('5. error que impide generar el gráfico', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Seleccionar archivo CSV').setInputFiles(MISSING_COLUMNS_CSV)

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toHaveAttribute('aria-live', 'assertive')
    await expect(page.locator('.status')).toHaveClass(/status--error/)
    await expect(page.locator('.chart-container')).toHaveCount(0)
    await expect(page.locator('.workspace')).toHaveCount(0)
  })
})

test.describe('T24 — sustitución de archivo', () => {
  test('seleccionar un nuevo archivo sustituye el resultado anterior sin recargar', async ({ page }) => {
    await page.goto('/')
    const input = page.getByLabel('Seleccionar archivo CSV')

    await input.setInputFiles(MISSING_COLUMNS_CSV)
    await expect(page.getByRole('alert')).toBeVisible()

    await input.setInputFiles(MIXED_CSV)
    await expect(page.getByText('mixed.csv')).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.locator('.status')).toHaveClass(/status--partial/)

    await input.setInputFiles(VALID_FULL_CSV)
    await expect(page.getByText('Archivo procesado correctamente: valid-full.csv.')).toBeVisible()
    await expect(page.locator('.status')).toHaveClass(/status--success/)
  })
})
