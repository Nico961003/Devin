import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createChartOption,
  formatDateEs,
  formatObservationTooltip,
} from '../frontend/src/chart-options.js'
import { ExchangeRateChart } from '../frontend/src/ExchangeRateChart.jsx'

const observations = [
  { date: '2025-01-02', usdPerEur: 1.2, eurPerUsd: 1 / 1.2 },
  { date: '2024-01-02', usdPerEur: 1.1, eurPerUsd: 1 / 1.1 },
]

afterEach(cleanup)

describe('gráfico base', () => {
  it('configura la fecha en X y el tipo de cambio en Y', () => {
    const option = createChartOption(observations)

    expect(option.xAxis.type).toBe('time')
    expect(option.xAxis.axisLabel.formatter(Date.UTC(2025, 0, 1))).toBe('2025')
    expect(option.yAxis.type).toBe('value')
    expect(option.yAxis.name).toBe('Tipo de cambio')
  })

  it('proporciona pares [fecha, tipo de cambio] en orden cronológico', () => {
    const option = createChartOption(observations)

    expect(option.series[0].data).toEqual([
      ['2024-01-02', 1.1],
      ['2025-01-02', 1.2],
    ])
  })

  it('integra echarts-for-react con un ancho adaptable', () => {
    render(<ExchangeRateChart observations={observations} />)
    const chart = screen.getByTestId('echarts')

    expect(chart.getAttribute('data-x-axis')).toBe('time')
    expect(chart.getAttribute('data-y-axis')).toBe('value')
    expect(chart.style.width).toBe('100%')
  })
})

describe('series y leyenda', () => {
  it('identifica y habilita la alternancia de ambas series', () => {
    const option = createChartOption(observations)

    expect(option.legend.data).toEqual(['USD por EUR', 'EUR por USD'])
    expect(option.legend.selectedMode).toBe(true)
    expect(option.series.map(({ name }) => name)).toEqual(['USD por EUR', 'EUR por USD'])
  })

  it('usa color y patrón de línea diferentes sin recalcular los datos', () => {
    const option = createChartOption(observations)

    expect(option.series[0].lineStyle).toMatchObject({ color: '#1d4ed8', type: 'solid' })
    expect(option.series[1].lineStyle).toMatchObject({ color: '#b45309', type: 'dashed' })
    expect(option.series[0].data[0]).toEqual(['2024-01-02', 1.1])
    expect(option.series[1].data[0]).toEqual(['2024-01-02', 1 / 1.1])
  })
})

describe('tooltip y cruz', () => {
  it('configura una cruz completa y ajusta la fecha a la observación más próxima', () => {
    const option = createChartOption(observations)

    expect(option.tooltip.trigger).toBe('axis')
    expect(option.tooltip.axisPointer).toEqual({ type: 'cross', axis: 'x', snap: true })
  })

  it('muestra fecha y ambas cotizaciones con formato español y precisión visual', () => {
    const observation = { date: '2025-01-02', usdPerEur: 1.181234, eurPerUsd: 1 / 1.181234 }
    const tooltip = formatObservationTooltip(observation)

    expect(formatDateEs(observation.date)).toBe('2 de enero de 2025')
    expect(tooltip).toContain('USD por EUR: 1,1812')
    expect(tooltip).toContain('EUR por USD: 0,846572')
    expect(observation.usdPerEur).toBe(1.181234)
    expect(observation.eurPerUsd).toBe(1 / 1.181234)
  })

  it('localiza la observación visible por su fecha', () => {
    const option = createChartOption(observations)
    const tooltip = option.tooltip.formatter([{ value: ['2025-01-02', 1.2] }])

    expect(tooltip).toContain('2 de enero de 2025')
    expect(tooltip).toContain('USD por EUR')
    expect(tooltip).toContain('EUR por USD')
  })
})

describe('navegación por teclado', () => {
  it('ofrece foco y una descripción textual de ejes e interacción', () => {
    render(<ExchangeRateChart observations={observations} />)
    const chart = screen.getByRole('region', { name: 'Gráfico interactivo del tipo de cambio' })

    chart.focus()

    expect(document.activeElement).toBe(chart)
    expect(screen.getByText(/El eje horizontal representa la fecha/)).toBeTruthy()
    expect(chart.getAttribute('aria-describedby')).toBeTruthy()
  })

  it('recorre observaciones con flechas, abre el tooltip y anuncia los valores', () => {
    render(<ExchangeRateChart observations={observations} />)
    const chart = screen.getByRole('region', { name: 'Gráfico interactivo del tipo de cambio' })

    fireEvent.keyDown(chart, { key: 'ArrowUp' })
    expect(globalThis.__ECHARTS_ACTIONS__.at(-1)).toEqual({ type: 'showTip', seriesIndex: 0, dataIndex: 0 })
    expect(screen.getByRole('status').textContent).toContain('2 de enero de 2024')
    expect(screen.getByRole('status').textContent).toContain('USD por EUR: 1,1')
    expect(screen.getByRole('status').textContent).toContain('EUR por USD')

    fireEvent.keyDown(chart, { key: 'ArrowUp' })
    expect(globalThis.__ECHARTS_ACTIONS__.at(-1).dataIndex).toBe(1)
    fireEvent.keyDown(chart, { key: 'ArrowDown' })
    expect(globalThis.__ECHARTS_ACTIONS__.at(-1).dataIndex).toBe(0)
  })

  it('oculta el tooltip y limpia el anuncio con Escape', () => {
    render(<ExchangeRateChart observations={observations} />)
    const chart = screen.getByRole('region', { name: 'Gráfico interactivo del tipo de cambio' })

    fireEvent.keyDown(chart, { key: 'ArrowUp' })
    fireEvent.keyDown(chart, { key: 'Escape' })

    expect(globalThis.__ECHARTS_ACTIONS__.at(-1)).toEqual({ type: 'hideTip' })
    expect(screen.getByRole('status').textContent).toBe('')
  })
})
