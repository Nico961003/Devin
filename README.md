# Tipo de cambio USD-EUR

Aplicación web para cargar un CSV con observaciones históricas del tipo de
cambio USD-EUR, depurar los datos y visualizarlos mediante un gráfico de
líneas interactivo (Apache ECharts), con filtros por intervalo de años,
tooltip con cruz, navegación por teclado y soporte de accesibilidad WCAG 2.1
AA.

## 🔗 Demo en vivo

**[https://nico961003.github.io/TipoDeCambioDevin/](https://nico961003.github.io/TipoDeCambioDevin/)**

> **Nota:** esta demo publicada en GitHub Pages es **solo la interfaz
> estática** del frontend. GitHub Pages no puede ejecutar el backend
> Express, por lo que la carga de un CSV mostrará un error controlado (no
> hay API disponible). Para probar el flujo completo (carga, validación y
> gráfico funcionando de principio a fin), ejecuta el proyecto en local
> siguiendo la sección [Puesta en marcha](#puesta-en-marcha).

## Características

- Carga de un archivo CSV (`observation_date`, `DEXUSEU`) de hasta 10 MB.
- Validación y limpieza en el backend: fechas reales, valores numéricos
  válidos, deduplicación por fecha, resumen de filas leídas/válidas/descartadas.
- Cálculo de ambas cotizaciones: **USD por EUR** (valor original) y
  **EUR por USD** (inversa), sin redondeo interno.
- Gráfico de líneas con Apache ECharts: fecha en el eje X, tipo de cambio en
  el eje Y, leyenda con ambas series, tooltip con cruz completa.
- Selector de intervalo (1, 2, 5 o 10 años) que filtra en memoria sin volver
  a solicitar el archivo al servidor.
- Navegación del gráfico por teclado (flechas, `Escape`) con anuncios
  mediante regiones `aria-live`.
- Diseño adaptable (320 / 768 / 1280 px) y accesibilidad WCAG 2.1 AA
  verificada con `axe-core`.
- El servidor no persiste el CSV en disco ni registra su contenido; el
  búfer se libera al finalizar cada petición.

## Stack técnico

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19, Vite 8, Apache ECharts 6 (`echarts-for-react`) |
| Backend | Node.js 22, Express 5, Multer (carga en memoria), `csv-parse` |
| Pruebas unitarias/integración | Vitest, Testing Library, Supertest |
| Pruebas end-to-end | Playwright (Chromium, Firefox, WebKit) + `@axe-core/playwright` |
| Calidad de código | ESLint (flat config) |

## Puesta en marcha

Requiere Node.js `>=22.0.0 <23` (ver `.nvmrc`).

```bash
npm install
```

### Desarrollo

Levanta frontend (Vite, puerto 5173) y backend (Express, puerto 3000) a la
vez, con el proxy de `/api` ya configurado:

```bash
npm run dev
```

Abre `http://localhost:5173`.

### Producción (build + ejecución local)

El backend sirve el frontend compilado desde un único proceso:

```bash
npm run build
npm start
```

Abre `http://localhost:3000` (incluye `GET /api/health`).

## Pruebas

```bash
npm test             # Unitarias + integración (Vitest) — ver TESTING_PLAN.md
npm run lint          # ESLint
npm run test:e2e      # End-to-end con Playwright (Chromium/Firefox/WebKit)
npm run test:e2e:ui   # Playwright en modo UI interactivo
```

### Rendimiento

```bash
npm run perf:backend    # Tiempo de processCsv() y de POST /api/exchange-rates
npm run perf:frontend   # Tiempo de render del gráfico, selector y tooltip (requiere `npm run dev` levantado)
```

Procedimiento, equipo de referencia y resultados documentados en
[`PERFORMANCE.md`](./PERFORMANCE.md).

## Despliegue

- **Local en modo producción:** `npm run build && npm start` (ver arriba).
- **Demo estática en GitHub Pages:** publicada desde la rama `gh-pages`,
  generada con `npx vite build --config vite.pages.config.js` (usa una base
  de ruta distinta, `/TipoDeCambioDevin/`, para los assets del sitio).

## Documentación del proyecto

- [`ESPECIFICACION.md`](./ESPECIFICACION.md) — especificación funcional y no
  funcional completa (propósito, datos de entrada, requisitos, arquitectura,
  contrato de API, criterios de aceptación).
- [`TODO.md`](./TODO.md) — plan de implementación por fases con los
  criterios de aceptación de cada tarea y su estado de verificación.
- [`TESTING_PLAN.md`](./TESTING_PLAN.md) — plan de testing escalonado de la
  suite Vitest con hallazgos por fase.
- [`PERFORMANCE.md`](./PERFORMANCE.md) — verificación de los objetivos de
  rendimiento (RNF-01).

## Contrato de la API

`POST /api/exchange-rates` — `multipart/form-data` con un campo `file`.

Respuesta `200`:

```json
{
  "data": [
    { "date": "1999-01-04", "usdPerEur": 1.1812, "eurPerUsd": 0.846597 }
  ],
  "summary": {
    "totalRows": 3,
    "validRows": 2,
    "discardedRows": 1,
    "minDate": "1999-01-04",
    "maxDate": "1999-01-05"
  }
}
```

Errores (`{ "error": { "code", "message" } }`): `FILE_REQUIRED` (400),
`INVALID_CSV` (400), `MISSING_COLUMNS` (400), `NO_VALID_DATA` (400),
`FILE_TOO_LARGE` (413), `UNSUPPORTED_FILE_TYPE` (415), `INTERNAL_ERROR` (500).

Detalle completo en [`ESPECIFICACION.md`](./ESPECIFICACION.md#63-contrato-de-api-propuesto).
