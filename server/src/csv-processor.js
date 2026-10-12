import { parse } from 'csv-parse/sync'
import { API_ERROR_CODES } from '../../shared/contracts.js'
import { ApiError } from './api-error.js'

const REQUIRED_COLUMNS = ['observation_date', 'DEXUSEU']
const EXCHANGE_RATE_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function invalidCsv() {
  return new ApiError(400, API_ERROR_CODES.INVALID_CSV, 'No se pudo leer el archivo CSV. Comprueba que use UTF-8 y comas como delimitador.')
}

export function parseCsvRows(buffer) {
  let content

  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    throw invalidCsv()
  }

  let headers
  let records

  try {
    records = parse(content, {
      bom: true,
      columns: (columns) => {
        headers = columns.map((column) => column.trim())
        return headers
      },
      delimiter: ',',
      relax_column_count: false,
      skip_empty_lines: true,
      trim: true,
    })
  } catch {
    throw invalidCsv()
  }

  if (!headers?.length || headers.every((header) => header === '')) {
    throw invalidCsv()
  }

  if (REQUIRED_COLUMNS.some((column) => !headers.includes(column))) {
    throw new ApiError(400, API_ERROR_CODES.MISSING_COLUMNS, 'El archivo debe incluir observation_date y DEXUSEU.')
  }

  return records.map((record) => ({
    observation_date: String(record.observation_date ?? '').trim(),
    DEXUSEU: String(record.DEXUSEU ?? '').trim(),
  }))
}

export function isValidIsoDate(value) {
  const match = ISO_DATE_PATTERN.exec(value)

  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysPerMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= daysPerMonth[month - 1]
}

export function parseExchangeRate(value) {
  if (!EXCHANGE_RATE_PATTERN.test(value)) {
    return null
  }

  const rate = Number(value)
  return Number.isFinite(rate) && rate > 0 ? rate : null
}

export function cleanCsvRows(rows) {
  const validRows = []
  let discardedRows = 0

  for (const row of rows) {
    const usdPerEur = parseExchangeRate(row.DEXUSEU)

    if (!row.observation_date || !row.DEXUSEU || !isValidIsoDate(row.observation_date) || usdPerEur === null) {
      discardedRows += 1
      continue
    }

    validRows.push({ date: row.observation_date, usdPerEur })
  }

  return { validRows, discardedRows }
}

export function normalizeRows(rows) {
  const observationsByDate = new Map()
  let duplicateRows = 0

  for (const row of rows) {
    if (observationsByDate.has(row.date)) {
      duplicateRows += 1
    }

    observationsByDate.set(row.date, {
      date: row.date,
      usdPerEur: row.usdPerEur,
      eurPerUsd: 1 / row.usdPerEur,
    })
  }

  const data = [...observationsByDate.values()].sort((left, right) => left.date.localeCompare(right.date))
  return { data, duplicateRows }
}

export function processCsv(buffer) {
  const rows = parseCsvRows(buffer)
  const { validRows: cleanedRows } = cleanCsvRows(rows)
  const { data } = normalizeRows(cleanedRows)

  if (data.length === 0) {
    throw new ApiError(400, API_ERROR_CODES.NO_VALID_DATA, 'El archivo no contiene observaciones válidas. Revisa las fechas y los tipos de cambio.')
  }

  return {
    data,
    summary: {
      totalRows: rows.length,
      validRows: data.length,
      discardedRows: rows.length - data.length,
      minDate: data[0].date,
      maxDate: data[data.length - 1].date,
    },
  }
}
