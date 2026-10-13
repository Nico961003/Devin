import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from '../frontend/src/App.jsx'
import { ERROR_MESSAGES, getErrorMessage, getUiState } from '../frontend/src/status.js'

const successResult = {
  data: [{ date: '2025-01-01', usdPerEur: 1.1, eurPerUsd: 1 / 1.1 }],
  summary: { totalRows: 1, validRows: 1, discardedRows: 0, minDate: '2025-01-01', maxDate: '2025-01-01' },
}

function selectCsv() {
  fireEvent.change(screen.getByLabelText('Seleccionar archivo CSV'), {
    target: { files: [new File(['csv'], 'rates.csv', { type: 'text/csv' })] },
  })
}

afterEach(cleanup)

describe('estados de interfaz', () => {
  it('distingue los cinco estados definidos', () => {
    expect(getUiState({})).toBe('idle')
    expect(getUiState({ isProcessing: true })).toBe('loading')
    expect(getUiState({ error: new Error('error') })).toBe('error')
    expect(getUiState({ result: successResult })).toBe('success')
    expect(getUiState({ result: { ...successResult, summary: { ...successResult.summary, discardedRows: 1 } } })).toBe('partial')
  })

  it('muestra éxito total y el resumen de filas', async () => {
    render(<App uploadFile={async () => successResult} />)
    selectCsv()

    await screen.findByText(/Archivo procesado correctamente/)
    expect(screen.getByLabelText('Resumen del procesamiento').textContent).toContain('1Filas leídas')
    expect(screen.getByLabelText('Resumen del procesamiento').textContent).toContain('0Filas descartadas')
  })

  it('muestra éxito parcial cuando hubo descartes', async () => {
    const partialResult = {
      ...successResult,
      summary: { ...successResult.summary, totalRows: 2, discardedRows: 1 },
    }
    render(<App uploadFile={async () => partialResult} />)
    selectCsv()

    expect(await screen.findByText(/Archivo procesado con filas descartadas/)).toBeTruthy()
  })

  it('muestra un error accionable, lo anuncia y oculta la visualización', async () => {
    render(<App uploadFile={async () => {
      throw { code: 'MISSING_COLUMNS', name: 'ApiClientError' }
    }} />)
    selectCsv()

    const alert = await screen.findByRole('alert')
    expect(alert.getAttribute('aria-live')).toBe('assertive')
    expect(alert.textContent).toContain('observation_date')
    expect(screen.queryByLabelText('Visualización del tipo de cambio')).toBeNull()
  })

  it('anuncia el procesamiento mediante una región accesible', async () => {
    render(<App uploadFile={() => new Promise(() => {})} />)
    selectCsv()

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Procesando'))
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite')
  })
})

describe('mensajes de error', () => {
  it.each(Object.entries(ERROR_MESSAGES))('ofrece un mensaje para %s', (code, message) => {
    expect(getErrorMessage({ code })).toBe(message)
    expect(message.length).toBeGreaterThan(20)
  })
})
