import { useEffect, useId, useMemo, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { createChartOption, formatObservationAnnouncement } from './chart-options.js'

export function ExchangeRateChart({ observations }) {
  const chartRef = useRef(null)
  const descriptionId = useId()
  const sortedObservations = useMemo(
    () => [...observations].sort((left, right) => left.date.localeCompare(right.date)),
    [observations],
  )
  const [activeIndex, setActiveIndex] = useState(-1)
  const activeObservation = sortedObservations[activeIndex]

  useEffect(() => {
    setActiveIndex(-1)
  }, [sortedObservations])

  function showObservation(index) {
    setActiveIndex(index)
    chartRef.current?.getEchartsInstance().dispatchAction({
      type: 'showTip',
      seriesIndex: 0,
      dataIndex: index,
    })
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      setActiveIndex(-1)
      chartRef.current?.getEchartsInstance().dispatchAction({ type: 'hideTip' })
      return
    }

    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return
    }

    event.preventDefault()
    const firstIndex = activeIndex < 0 ? 0 : activeIndex
    const step = event.key === 'ArrowUp' ? 1 : -1
    const nextIndex = activeIndex < 0
      ? firstIndex
      : Math.min(Math.max(firstIndex + step, 0), sortedObservations.length - 1)
    showObservation(nextIndex)
  }

  return (
    <div
      className="chart-container"
      role="region"
      tabIndex="0"
      aria-label="Gráfico interactivo del tipo de cambio"
      aria-describedby={descriptionId}
      onKeyDown={handleKeyDown}
    >
      <p id={descriptionId} className="chart-description">
        El eje horizontal representa el tipo de cambio y el eje vertical representa la fecha. Usa las flechas arriba y abajo para recorrer las observaciones y Escape para cerrar el tooltip.
      </p>
      <p className="sr-only">{sortedObservations.length} observaciones en el intervalo seleccionado.</p>
      <ReactECharts
        ref={chartRef}
        option={createChartOption(sortedObservations)}
        notMerge
        lazyUpdate
        style={{ width: '100%', height: '28rem' }}
      />
      <p className="sr-only" role="status" aria-live="polite">
        {activeObservation ? formatObservationAnnouncement(activeObservation) : ''}
      </p>
    </div>
  )
}
