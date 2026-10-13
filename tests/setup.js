import { beforeEach, vi } from 'vitest'

beforeEach(() => {
  globalThis.__ECHARTS_ACTIONS__ = []
})

vi.mock('echarts-for-react', async () => {
  const React = await import('react')

  return {
    default: React.forwardRef(function MockECharts({ option, style }, ref) {
      React.useImperativeHandle(ref, () => ({
        getEchartsInstance: () => ({
          dispatchAction: (action) => globalThis.__ECHARTS_ACTIONS__.push(action),
        }),
      }))

      return React.createElement('div', {
        'data-testid': 'echarts',
        'data-x-axis': option.xAxis?.type,
        'data-y-axis': option.yAxis?.type,
        'data-series': option.series?.map((series) => series.name).join('|'),
        'data-pointer': option.tooltip?.axisPointer?.type ?? '',
        style,
      })
    }),
  }
})
