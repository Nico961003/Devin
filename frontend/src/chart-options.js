const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const originalRateFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 })
const inverseRateFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 6 })

export function formatDateEs(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatObservationAnnouncement(observation) {
  return `${formatDateEs(observation.date)}. USD por EUR: ${originalRateFormatter.format(observation.usdPerEur)}. EUR por USD: ${inverseRateFormatter.format(observation.eurPerUsd)}.`
}

export function formatObservationTooltip(observation) {
  return [
    `<strong>${formatDateEs(observation.date)}</strong>`,
    `USD por EUR: ${originalRateFormatter.format(observation.usdPerEur)}`,
    `EUR por USD: ${inverseRateFormatter.format(observation.eurPerUsd)}`,
  ].join('<br/>')
}

export function createChartOption(observations) {
  const sortedObservations = [...observations].sort((left, right) => left.date.localeCompare(right.date))
  const observationsByDate = new Map(sortedObservations.map((observation) => [observation.date, observation]))

  return {
    animation: false,
    grid: {
      top: 32,
      right: 32,
      bottom: 64,
      left: 72,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        axis: 'y',
        snap: true,
      },
      formatter: (params) => {
        const date = params?.[0]?.value?.[1]
        const observation = observationsByDate.get(date)
        return observation ? formatObservationTooltip(observation) : ''
      },
    },
    legend: {
      data: ['USD por EUR', 'EUR por USD'],
      selectedMode: true,
    },
    xAxis: {
      type: 'value',
      name: 'Tipo de cambio',
      nameLocation: 'middle',
      nameGap: 40,
      scale: true,
    },
    yAxis: {
      type: 'time',
      axisLabel: {
        formatter: (value) => String(new Date(value).getUTCFullYear()),
      },
    },
    series: [
      {
        name: 'USD por EUR',
        type: 'line',
        showSymbol: false,
        sampling: 'lttb',
        progressive: 5000,
        lineStyle: { color: '#1d4ed8', type: 'solid', width: 2 },
        itemStyle: { color: '#1d4ed8' },
        data: sortedObservations.map((observation) => [observation.usdPerEur, observation.date]),
      },
      {
        name: 'EUR por USD',
        type: 'line',
        showSymbol: false,
        sampling: 'lttb',
        progressive: 5000,
        lineStyle: { color: '#b45309', type: 'dashed', width: 2 },
        itemStyle: { color: '#b45309' },
        data: sortedObservations.map((observation) => [observation.eurPerUsd, observation.date]),
      },
    ],
  }
}
