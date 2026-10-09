import { useState } from 'react'

const ranges = [1, 2, 5, 10]

export function getSelectedFileName(files) {
  return files?.[0]?.name ?? ''
}

export function App() {
  const [selectedFileName, setSelectedFileName] = useState('')
  const hasData = false

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
          <span>{selectedFileName ? 'Cambiar CSV' : 'Seleccionar CSV'}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Seleccionar archivo CSV"
            onChange={(event) => setSelectedFileName(getSelectedFileName(event.target.files))}
          />
        </label>
      </section>

      <section className="status" aria-live="polite" aria-labelledby="status-heading">
        <h2 id="status-heading">Estado</h2>
        {selectedFileName ? (
          <p>Archivo seleccionado: <strong>{selectedFileName}</strong>. Pendiente de procesamiento.</p>
        ) : (
          <p>No se ha seleccionado ningún archivo.</p>
        )}
      </section>

      <section className="workspace" aria-label="Visualización del tipo de cambio" aria-disabled={!hasData}>
        <div className="range-block">
          <h2>Intervalo</h2>
          <div className="range-selector" aria-label="Intervalo de años">
            {ranges.map((range) => (
              <button key={range} type="button" disabled={!hasData}>
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
          <div className="chart-placeholder" role="img" aria-label="Contenedor del gráfico sin datos">
            <p>El gráfico aparecerá después de procesar un archivo válido.</p>
          </div>
        </div>
      </section>
    </main>
  )
}
