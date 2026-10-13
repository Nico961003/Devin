import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError, uploadExchangeRates } from '../frontend/src/api.js'

afterEach(() => vi.unstubAllGlobals())

describe('cliente de carga', () => {
  it('envía multipart/form-data mediante fetch al endpoint previsto', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], summary: {} }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['csv'], 'rates.csv', { type: 'text/csv' })

    await uploadExchangeRates(file)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/exchange-rates')
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('file').name).toBe('rates.csv')
    expect(options.headers).toBeUndefined()
  })

  it('convierte el contrato de error de la API en un error del cliente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: 'MISSING_COLUMNS', message: 'Faltan columnas.' } }),
    }))

    await expect(uploadExchangeRates(new File(['csv'], 'rates.csv'))).rejects.toEqual(
      expect.objectContaining({ code: 'MISSING_COLUMNS', message: 'Faltan columnas.' }),
    )
  })

  it('produce un mensaje accionable ante un fallo de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))

    await expect(uploadExchangeRates(new File(['csv'], 'rates.csv'))).rejects.toBeInstanceOf(ApiClientError)
  })
})
