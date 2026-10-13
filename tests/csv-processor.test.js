import { describe, expect, it } from 'vitest'
import {
  cleanCsvRows,
  isValidIsoDate,
  normalizeRows,
  parseCsvRows,
  parseExchangeRate,
  processCsv,
} from '../server/src/csv-processor.js'

function expectApiError(action, code) {
  expect(action).toThrow(expect.objectContaining({ code }))
}

describe('estructura del CSV', () => {
  it('acepta UTF-8 con BOM, recorta espacios, ignora columnas adicionales y líneas vacías', () => {
    const csv = '\uFEFF observation_date , DEXUSEU , nota\n 2025-01-02 , 1.0250 , ignorada\n\n2025-01-03, 1.0300,otra\n'

    expect(parseCsvRows(Buffer.from(csv))).toEqual([
      { observation_date: '2025-01-02', DEXUSEU: '1.0250' },
      { observation_date: '2025-01-03', DEXUSEU: '1.0300' },
    ])
  })

  it('acepta UTF-8 sin BOM y exige la coma como delimitador', () => {
    expect(parseCsvRows(Buffer.from('observation_date,DEXUSEU\n2025-01-02,1.02'))).toHaveLength(1)
    expectApiError(
      () => parseCsvRows(Buffer.from('observation_date;DEXUSEU\n2025-01-02;1.02')),
      'MISSING_COLUMNS',
    )
  })

  it('rechaza columnas obligatorias ausentes', () => {
    expectApiError(() => parseCsvRows(Buffer.from('date,value\n2025-01-02,1.02')), 'MISSING_COLUMNS')
  })

  it('rechaza CSV mal formado, vacío o con UTF-8 ilegible', () => {
    expectApiError(() => parseCsvRows(Buffer.from('observation_date,DEXUSEU\n"sin cierre,1.02')), 'INVALID_CSV')
    expectApiError(() => parseCsvRows(Buffer.from('')), 'INVALID_CSV')
    expectApiError(() => parseCsvRows(Buffer.from([0xc3, 0x28])), 'INVALID_CSV')
  })
})

describe('validación y limpieza de filas', () => {
  it('acepta fechas reales sin conversiones de zona horaria', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true)
    expect(isValidIsoDate('2023-02-29')).toBe(false)
    expect(isValidIsoDate('2025-04-31')).toBe(false)
    expect(isValidIsoDate('2025-2-01')).toBe(false)
    expect(isValidIsoDate('0000-01-01')).toBe(false)
  })

  it.each([
    ['1.25', 1.25],
    ['.5', 0.5],
    ['1e2', 100],
    ['NaN', null],
    ['Infinity', null],
    ['0', null],
    ['-1.2', null],
    ['1,2', null],
    ['', null],
  ])('valida el tipo de cambio %s', (value, expected) => {
    expect(parseExchangeRate(value)).toBe(expected)
  })

  it('descarta vacíos y valores inválidos sin impedir las filas correctas', () => {
    const rows = parseCsvRows(Buffer.from([
      'observation_date,DEXUSEU',
      '2024-02-29,1.1',
      ',1.2',
      '2025-01-01,',
      '2025-02-29,1.3',
      '2025-01-02,NaN',
      '2025-01-03,Infinity',
      '2025-01-04,0',
      '2025-01-05,-1',
      '',
    ].join('\n')))

    expect(cleanCsvRows(rows)).toEqual({
      validRows: [{ date: '2024-02-29', usdPerEur: 1.1 }],
      discardedRows: 7,
    })
    expect(rows).toHaveLength(8)
  })
})

describe('deduplicación, orden y transformación', () => {
  it('conserva la última fila por fecha, contabiliza duplicados y ordena cronológicamente', () => {
    const { data, duplicateRows } = normalizeRows([
      { date: '2025-01-03', usdPerEur: 1.3 },
      { date: '2025-01-01', usdPerEur: 1.1 },
      { date: '2025-01-03', usdPerEur: 1.25 },
      { date: '2025-01-02', usdPerEur: 1.2 },
    ])

    expect(duplicateRows).toBe(1)
    expect(data.map((observation) => observation.date)).toEqual(['2025-01-01', '2025-01-02', '2025-01-03'])
    expect(data[2]).toEqual({ date: '2025-01-03', usdPerEur: 1.25, eurPerUsd: 1 / 1.25 })
  })

  it('conserva la precisión interna de la cotización inversa', () => {
    const { data } = normalizeRows([{ date: '2025-01-01', usdPerEur: 1.1812 }])

    expect(data[0].usdPerEur).toBe(1.1812)
    expect(data[0].eurPerUsd).toBe(1 / 1.1812)
    expect(data[0].eurPerUsd).not.toBe(Number((1 / 1.1812).toFixed(6)))
  })
})

describe('resumen del procesamiento', () => {
  it('resume un archivo totalmente válido', () => {
    const result = processCsv(Buffer.from('observation_date,DEXUSEU\n2025-01-01,1.1\n2025-01-02,1.2'))

    expect(result.summary).toEqual({
      totalRows: 2,
      validRows: 2,
      discardedRows: 0,
      minDate: '2025-01-01',
      maxDate: '2025-01-02',
    })
  })

  it('cuenta filas inválidas y duplicadas como descartadas y usa solo fechas válidas', () => {
    const result = processCsv(Buffer.from([
      'observation_date,DEXUSEU',
      '2025-01-03,1.3',
      'fecha-invalida,1.2',
      '2025-01-01,1.1',
      '2025-01-03,1.25',
      '2024-01-01,0',
    ].join('\n')))

    expect(result.summary).toEqual({
      totalRows: 5,
      validRows: 2,
      discardedRows: 3,
      minDate: '2025-01-01',
      maxDate: '2025-01-03',
    })
    expect(result.summary.totalRows).toBe(result.summary.validRows + result.summary.discardedRows)
  })

  it('genera NO_VALID_DATA cuando no queda ninguna observación válida', () => {
    expectApiError(
      () => processCsv(Buffer.from('observation_date,DEXUSEU\n2025-02-29,1.2\n2025-01-01,0')),
      'NO_VALID_DATA',
    )
    expectApiError(() => processCsv(Buffer.from('observation_date,DEXUSEU\n')), 'NO_VALID_DATA')
  })
})
