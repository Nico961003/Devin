import { describe, expect, it } from 'vitest'
import { filterObservationsByYears, RANGE_OPTIONS, subtractNaturalYears } from '../frontend/src/range.js'

function observation(date) {
  return { date, usdPerEur: 1, eurPerUsd: 1 }
}

describe('intervalos por años naturales', () => {
  it('ofrece exactamente 1, 2, 5 y 10 años', () => {
    expect(RANGE_OPTIONS).toEqual([1, 2, 5, 10])
  })

  it('usa la observación más reciente y conserva ambos límites inclusivos', () => {
    const observations = [
      observation('2024-08-21'),
      observation('2024-08-22'),
      observation('2025-01-01'),
      observation('2025-08-22'),
    ]

    expect(filterObservationsByYears(observations, 1).map(({ date }) => date)).toEqual([
      '2024-08-22',
      '2025-01-01',
      '2025-08-22',
    ])
  })

  it.each([1, 2, 5, 10])('filtra el intervalo de %i años sin usar la fecha actual', (years) => {
    const maxYear = 2025
    const observations = [
      observation(`${maxYear - years}-06-15`),
      observation('2025-06-15'),
    ]

    expect(filterObservationsByYears(observations, years)).toHaveLength(2)
  })

  it('devuelve todos los datos disponibles si la historia es menor que el intervalo', () => {
    const observations = [observation('2024-01-01'), observation('2025-01-01')]

    expect(filterObservationsByYears(observations, 10)).toEqual(observations)
  })

  it('resuelve el 29 de febrero sin conversiones de zona horaria', () => {
    expect(subtractNaturalYears('2024-02-29', 1)).toBe('2023-02-28')
    expect(subtractNaturalYears('2024-02-29', 4)).toBe('2020-02-29')
    expect(filterObservationsByYears([
      observation('2023-02-27'),
      observation('2023-02-28'),
      observation('2024-02-29'),
    ], 1).map(({ date }) => date)).toEqual(['2023-02-28', '2024-02-29'])
  })
})
