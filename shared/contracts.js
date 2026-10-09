export const API_ERROR_CODES = Object.freeze({
  FILE_REQUIRED: 'FILE_REQUIRED',
  INVALID_CSV: 'INVALID_CSV',
  MISSING_COLUMNS: 'MISSING_COLUMNS',
  NO_VALID_DATA: 'NO_VALID_DATA',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
})

const errorCodes = new Set(Object.values(API_ERROR_CODES))

export function isExchangeRateObservation(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
      Number.isFinite(value.usdPerEur) &&
      value.usdPerEur > 0 &&
      Number.isFinite(value.eurPerUsd) &&
      value.eurPerUsd > 0,
  )
}

export function isProcessingSummary(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Number.isInteger(value.totalRows) &&
      Number.isInteger(value.validRows) &&
      Number.isInteger(value.discardedRows) &&
      value.totalRows >= 0 &&
      value.validRows >= 0 &&
      value.discardedRows >= 0 &&
      value.totalRows === value.validRows + value.discardedRows &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.minDate) &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.maxDate),
  )
}

export function isApiError(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      value.error &&
      typeof value.error === 'object' &&
      errorCodes.has(value.error.code) &&
      typeof value.error.message === 'string' &&
      value.error.message.length > 0,
  )
}

export function createApiError(code, message) {
  const candidate = { error: { code, message } }

  if (!isApiError(candidate)) {
    throw new TypeError('El error no cumple el contrato de la API.')
  }

  return candidate
}
