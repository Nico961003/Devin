import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../frontend/src/App.jsx'

const result = {
  data: [
    { date: '2025-01-01', usdPerEur: 1.1, eurPerUsd: 1 / 1.1 },
    { date: '2025-01-02', usdPerEur: 1.2, eurPerUsd: 1 / 1.2 },
  ],
  summary: {
    totalRows: 2,
    validRows: 2,
    discardedRows: 0,
    minDate: '2025-01-01',
    maxDate: '2025-01-02',
  },
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('flujo de carga', () => {
  it('muestra procesamiento, evita otro envío y conserva la respuesta en React', async () => {
    let resolveUpload
    const uploadFile = vi.fn(() => new Promise((resolve) => {
      resolveUpload = resolve
    }))
    render(<App uploadFile={uploadFile} />)
    const input = screen.getByLabelText('Seleccionar archivo CSV')

    fireEvent.change(input, {
      target: { files: [new File(['csv'], 'rates.csv', { type: 'text/csv' })] },
    })

    expect(screen.getByText(/Procesando el archivo/)).toBeTruthy()
    expect(input.disabled).toBe(true)
    expect(uploadFile).toHaveBeenCalledTimes(1)

    resolveUpload(result)

    await waitFor(() => expect(input.disabled).toBe(false))
    expect(screen.getByText('rates.csv')).toBeTruthy()
    expect(screen.getAllByRole('button').every((button) => !button.disabled)).toBe(true)
  })

  it('no persiste el archivo ni la respuesta en almacenamiento del navegador', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    render(<App uploadFile={vi.fn().mockResolvedValue(result)} />)

    fireEvent.change(screen.getByLabelText('Seleccionar archivo CSV'), {
      target: { files: [new File(['csv'], 'rates.csv', { type: 'text/csv' })] },
    })

    await waitFor(() => expect(screen.getAllByRole('button')[0].disabled).toBe(false))
    expect(setItem).not.toHaveBeenCalled()
  })
})
