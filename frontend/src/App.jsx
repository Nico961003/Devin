import { useEffect, useMemo, useRef, useState } from 'react'
import { uploadExchangeRates } from './api.js'
import { ExchangeRateChart } from './ExchangeRateChart.jsx'
import { validateSelectedFile } from './file-validation.js'
import { filterObservationsByYears, RANGE_OPTIONS } from './range.js'
import { getErrorMessage, getUiState } from './status.js'

export function getSelectedFileName(files) {
  return files?.[0]?.name ?? ''
}

export function App({ uploadFile = uploadExchangeRates }) {
  const [selectedFileName, setSelectedFileName] = useState('')
  const [selectionError, setSelectionError] = useState(null)
  const [result, setResult] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedYears, setSelectedYears] = useState(1)
  const activeRequest = useRef(null)
  const hasData = Boolean(result?.data?.length)
  const visibleData = useMemo(
    () => filterObservationsByYears(result?.data ?? [], selectedYears),
    [result, selectedYears],
  )
  const uiState = getUiState({ isProcessing, error: selectionError, result })

  useEffect(() => () => activeRequest.current?.abort(), [])

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    const error = validateSelectedFile(file)

    activeRequest.current?.abort()
    setResult(null)
    setSelectedYears(1)
    setSelectionError(error)
    setSelectedFileName(error ? '' : file.name)

    if (error) {
      return
    }

    const controller = new AbortController()
    activeRequest.current = controller
    setIsProcessing(true)

    try {
      const response = await uploadFile(file, { signal: controller.signal })
      setResult(response)
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setSelectionError(requestError)
      }
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null
        setIsProcessing(false)
      }
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Análisis de divisas</p>
        <h1>Tipo de cambio USD-EUR</h1>
        <p className="instructions">
          Carga un CSV de hasta 10 MB con las columnas <code>observation_date</code> y{' '}
          <code>DEXUSEU</code>.
        </p>
      </header>

      <section className="panel" aria-labelledby="upload-heading">
        <div>
          <h2 id="upload-heading">Archivo de datos</h2>
          <p>Selecciona un archivo CSV para comenzar.</p>
        </div>
        <label className="file-control">
          <span>{isProcessing ? 'Procesando…' : selectedFileName ? 'Cambiar CSV' : 'Seleccionar CSV'}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Seleccionar archivo CSV"
            disabled={isProcessing}
            onChange={handleFileChange}
          />
        </label>
      </section>

      <section
        className={`status status--${uiState}`}
        role={uiState === 'error' ? 'alert' : 'status'}
        aria-live={uiState === 'error' ? 'assertive' : 'polite'}
        aria-labelledby="status-heading"
      >
        <h2 id="status-heading">Estado</h2>
        {uiState === 'loading' ? (
          <p>Procesando el archivo <strong>{selectedFileName}</strong>…</p>
        ) : uiState === 'error' ? (
          <p>{getErrorMessage(selectionError)}</p>
        ) : uiState === 'partial' ? (
          <p>Archivo procesado con filas descartadas: <strong>{selectedFileName}</strong>.</p>
        ) : uiState === 'success' ? (
          <p>Archivo procesado correctamente: <strong>{selectedFileName}</strong>.</p>
        ) : (
          <p>No se ha seleccionado ningún archivo.</p>
        )}
      </section>

      {hasData && (
        <section className="processing-summary" aria-label="Resumen del procesamiento">
          <div><strong>{result.summary.totalRows}</strong><span>Filas leídas</span></div>
          <div><strong>{result.summary.validRows}</strong><span>Filas válidas</span></div>
          <div><strong>{result.summary.discardedRows}</strong><span>Filas descartadas</span></div>
        </section>
      )}

      {uiState !== 'error' && (
      <section className="workspace" aria-label="Visualización del tipo de cambio" aria-disabled={!hasData}>
        <div className="range-block">
          <h2>Intervalo</h2>
          <div className="range-selector" aria-label="Intervalo de años">
            {RANGE_OPTIONS.map((range) => (
              <button
                key={range}
                type="button"
                className={selectedYears === range ? 'active' : ''}
                aria-pressed={selectedYears === range}
                disabled={!hasData}
                onClick={() => setSelectedYears(range)}
              >
                {range} {range === 1 ? 'año' : 'años'}
              </button>
            ))}
          </div>
        </div>

        <div className="legend" aria-label="Leyenda">
          <h2>Leyenda</h2>
          <ul>
            <li><span className="legend-line usd" aria-hidden="true" />USD por EUR</li>
            <li><span className="legend-line eur" aria-hidden="true" />EUR por USD</li>
          </ul>
        </div>

        <div className="chart-card" aria-labelledby="chart-heading">
          <div>
            <p className="eyebrow">Serie histórica</p>
            <h2 id="chart-heading">Evolución del tipo de cambio</h2>
          </div>
          {hasData ? (
            <ExchangeRateChart observations={visibleData} />
          ) : (
            <div className="chart-placeholder" role="img" aria-label="Contenedor del gráfico sin datos">
              <p>El gráfico aparecerá después de procesar un archivo válido.</p>
            </div>
          )}
        </div>
      </section>
      )}
    </main>
  )
}
