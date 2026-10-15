// Mide los objetivos de rendimiento del backend (RNF-01 / T25):
//   - Procesamiento en memoria del CSV (processCsv) con DEXUSEU.csv.
//   - Ida y vuelta HTTP completa de POST /api/exchange-rates.
//
// Uso: node scripts/measure-backend-performance.mjs
import { readFileSync } from 'node:fs'
import http from 'node:http'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { createApp } from '../server/src/app.js'
import { processCsv } from '../server/src/csv-processor.js'

const csvPath = fileURLToPath(new URL('../DEXUSEU.csv', import.meta.url))
const buffer = readFileSync(csvPath)

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[index]
}

function summarize(label, times) {
  const avg = times.reduce((sum, value) => sum + value, 0) / times.length
  console.log(`\n${label}`)
  console.log(`  muestras: ${times.length}`)
  console.log(`  promedio: ${avg.toFixed(2)} ms`)
  console.log(`  mínimo:   ${Math.min(...times).toFixed(2)} ms`)
  console.log(`  p95:      ${percentile(times, 95).toFixed(2)} ms`)
  console.log(`  máximo:   ${Math.max(...times).toFixed(2)} ms`)
  return avg
}

async function measurePureProcessing() {
  const runs = 20
  const times = []

  // Descarta la primera ejecución (JIT warmup) y mide el resto.
  processCsv(buffer)

  for (let i = 0; i < runs; i += 1) {
    const start = performance.now()
    const result = processCsv(buffer)
    times.push(performance.now() - start)

    if (i === 0) {
      console.log(`Resumen de datos: ${JSON.stringify(result.summary)}`)
    }
  }

  return summarize('1) processCsv() en memoria (sin red)', times)
}

async function measureHttpRoundTrip() {
  const app = createApp()
  const server = http.createServer(app)

  await new Promise((resolve) => server.listen(0, resolve))
  const { port } = server.address()
  const url = `http://127.0.0.1:${port}/api/exchange-rates`

  const runs = 10
  const times = []

  for (let i = 0; i < runs; i += 1) {
    const formData = new FormData()
    formData.append('file', new Blob([buffer], { type: 'text/csv' }), 'DEXUSEU.csv')

    const start = performance.now()
    const response = await fetch(url, { method: 'POST', body: formData })
    await response.json()
    times.push(performance.now() - start)

    if (!response.ok) {
      throw new Error(`Respuesta inesperada: ${response.status}`)
    }
  }

  await new Promise((resolve) => server.close(resolve))

  return summarize('2) POST /api/exchange-rates (ida y vuelta HTTP completa)', times)
}

const pureAvg = await measurePureProcessing()
const httpAvg = await measureHttpRoundTrip()

console.log('\n--- Objetivo T25: < 3000 ms para un CSV representativo ---')
console.log(`processCsv() en memoria: ${pureAvg.toFixed(2)} ms -> ${pureAvg < 3000 ? 'CUMPLE' : 'NO CUMPLE'}`)
console.log(`Ida y vuelta HTTP:       ${httpAvg.toFixed(2)} ms -> ${httpAvg < 3000 ? 'CUMPLE' : 'NO CUMPLE'}`)
