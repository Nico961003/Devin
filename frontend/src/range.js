export const RANGE_OPTIONS = Object.freeze([1, 2, 5, 10])

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

export function subtractNaturalYears(isoDate, years) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const targetYear = year - years
  const targetDay = month === 2 && day === 29 && !isLeapYear(targetYear) ? 28 : day

  return `${String(targetYear).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
}

export function filterObservationsByYears(observations, years) {
  if (!RANGE_OPTIONS.includes(years) || observations.length === 0) {
    return []
  }

  const maxDate = observations.reduce(
    (latest, observation) => observation.date > latest ? observation.date : latest,
    observations[0].date,
  )
  const minDate = subtractNaturalYears(maxDate, years)

  return observations.filter((observation) => observation.date >= minDate && observation.date <= maxDate)
}
