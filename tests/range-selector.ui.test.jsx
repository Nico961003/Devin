import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../frontend/src/App.jsx'

const dates = ['2015-08-22', '2020-08-22', '2023-08-22', '2024-08-22', '2025-08-22']
const result = {
  data: dates.map((date, index) => ({ date, usdPerEur: 1 + index / 10, eurPerUsd: 1 / (1 + index / 10) })),
  summary: { totalRows: 5, validRows: 5, discardedRows: 0, minDate: dates[0], maxDate: dates[4] },
}

afterEach(cleanup)

describe('selector de intervalos', () => {
  it('ofrece exactamente los cuatro intervalos y empieza en 1 año', async () => {
    render(<App uploadFile={async () => result} />)
    fireEvent.change(screen.getByLabelText('Seleccionar archivo CSV'), {
      target: { files: [new File(['csv'], 'rates.csv', { type: 'text/csv' })] },
    })
    await screen.findByText('2 observaciones en el intervalo seleccionado.')

    const buttons = screen.getAllByRole('button')
    expect(buttons.map((button) => button.textContent.trim())).toEqual(['1 año', '2 años', '5 años', '10 años'])
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true')
  })

  it('filtra en memoria sin nuevas solicitudes y marca la opción activa', async () => {
    const user = userEvent.setup()
    const uploadFile = vi.fn().mockResolvedValue(result)
    render(<App uploadFile={uploadFile} />)
    fireEvent.change(screen.getByLabelText('Seleccionar archivo CSV'), {
      target: { files: [new File(['csv'], 'rates.csv', { type: 'text/csv' })] },
    })
    await screen.findByText('2 observaciones en el intervalo seleccionado.')

    const expectedCounts = new Map([['2 años', 3], ['5 años', 4], ['10 años', 5], ['1 año', 2]])
    for (const [label, count] of expectedCounts) {
      const button = screen.getByRole('button', { name: label })
      await user.click(button)
      expect(await screen.findByText(`${count} observaciones en el intervalo seleccionado.`)).toBeTruthy()
      expect(button.getAttribute('aria-pressed')).toBe('true')
    }

    await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(1))
  })
})
