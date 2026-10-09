import { describe, expect, it } from 'vitest'
import {
  API_ERROR_CODES,
  createApiError,
  isApiError,
  isExchangeRateObservation,
  isProcessingSummary,
} from '../shared/contracts.js'

describe('contratos de datos', () => {
  it('valida una observación normalizada', () => {
    expect(isExchangeRateObservation({ date: '2025-08-22', usdPerEur: 1.18, eurPerUsd: 1 / 1.18 })).toBe(true)
    expect(isExchangeRateObservation({ date: '22-08-2025', usdPerEur: 1.18, eurPerUsd: 1 / 1.18 })).toBe(false)
  })

  it('valida un resumen consistente', () => {
    expect(isProcessingSummary({
      totalRows: 3,
      validRows: 2,
      discardedRows: 1,
      minDate: '2025-08-21',
      maxDate: '2025-08-22',
    })).toBe(true)
    expect(isProcessingSummary({
      totalRows: 4,
      validRows: 2,
      discardedRows: 1,
      minDate: '2025-08-21',
      maxDate: '2025-08-22',
    })).toBe(false)
  })
})

describe('contrato de errores', () => {
  it.each(Object.values(API_ERROR_CODES))('incluye y acepta el código %s', (code) => {
    expect(isApiError(createApiError(code, 'Mensaje accionable.'))).toBe(true)
  })

  it('rechaza códigos y formas no definidos', () => {
    expect(isApiError({ error: { code: 'UNKNOWN', message: 'Error.' } })).toBe(false)
    expect(() => createApiError('UNKNOWN', 'Error.')).toThrow(TypeError)
  })
})
