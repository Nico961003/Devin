# Plan de testing — Tipo de cambio USD-EUR

Este plan ejecuta y valida, de forma escalonada, la suite de pruebas automatizadas
(Vitest) ya existente en el proyecto. Cada fase agrupa pruebas por tipo (de lo
más aislado/rápido a lo más dependiente del DOM) y lista los archivos de test
junto con el código fuente que ejercitan.

## Reglas de uso

- Marcar una casilla `[x]` solo después de ejecutar esa prueba y confirmar su resultado.
- Cada fase cierra con un **Resumen de hallazgos**: cantidad de tests ejecutados/pasados/fallidos,
  cualquier fallo, advertencia o hallazgo relevante, y la acción tomada.
- Si una fase revela un fallo, se documenta explícitamente antes de continuar con la siguiente.
- Al cerrar la Fase 4 se ejecuta la suite completa (`npm test`) como verificación cruzada final.

---

## Fase 1 — Pruebas unitarias puras

Lógica de negocio sin DOM ni red (datos, validación, cálculo).

Comando: `npx vitest run tests/contracts.test.js tests/csv-processor.test.js tests/range.test.js --root .`

- [x] `tests/contracts.test.js` — cubre `shared/contracts.js` (forma de observación, resumen, error de API)
- [x] `tests/csv-processor.test.js` — cubre `server/src/csv-processor.js` (parseo, validación de filas, deduplicación, resumen)
- [x] `tests/range.test.js` — cubre `frontend/src/range.js` (intervalos de 1/2/5/10 años, límites inclusivos, años bisiestos)

### Resumen de hallazgos (Fase 1)

- **Resultado:** 3 archivos de test, **38/38 pruebas pasadas**, 0 fallos. Duración ≈16 s.
- `contracts.test.js` (10 pruebas): confirma que `isExchangeRateObservation`, `isProcessingSummary` e `isApiError` validan correctamente forma, tipos y la invariante `totalRows = validRows + discardedRows`; y que `createApiError` lanza si el código no está en `API_ERROR_CODES`.
- `csv-processor.test.js` (20 pruebas): confirma parseo UTF-8/BOM, columnas obligatorias vs. extra, recorte de espacios, rechazo de fechas imposibles (incl. 29 de febrero no bisiesto) y de `DEXUSEU` no numérico/≤0/infinito, deduplicación por fecha (se conserva la última fila), orden cronológico y cálculo exacto de `eurPerUsd = 1/DEXUSEU` sin redondeo interno.
- `range.test.js` (8 pruebas): confirma los 4 intervalos (1/2/5/10 años), límites inclusivos, referencia a la fecha máxima del archivo (no la fecha actual), comportamiento cuando hay menos historia que el intervalo, y el caso de 29 de febrero sin desplazamiento de zona horaria.
- **Hallazgos:** ninguno. No se requirió ninguna corrección de código ni de tests.

---

## Fase 2 — Pruebas de integración de API

Contrato HTTP real del backend (Express + Supertest), sin mocks de red.

Comando: `npx vitest run tests/server.test.js tests/exchange-rates-api.test.js --root .`

- [x] `tests/server.test.js` — cubre el arranque/montaje de `server/src/index.js` y `server/src/app.js`
- [x] `tests/exchange-rates-api.test.js` — cubre `POST /api/exchange-rates` en `server/src/app.js` y los códigos de error de `server/src/api-error.js`

### Resumen de hallazgos (Fase 2)

- **Resultado:** 2 archivos de test, **16/16 pruebas pasadas**, 0 fallos. Duración ≈7 s.
- `server.test.js` (1 prueba): confirma que la app se monta y responde correctamente.
- `exchange-rates-api.test.js` (15 pruebas): confirma respuesta `200` con `data`+`summary` conforme al contrato; `400/FILE_REQUIRED` sin archivo; `400` para `MISSING_COLUMNS`, `INVALID_CSV` y `NO_VALID_DATA`; que el procesador recibe un `Buffer` real en memoria; límite de tamaño configurable sin superar el máximo funcional (10 MB); `413/FILE_TOO_LARGE`; `415/UNSUPPORTED_FILE_TYPE` por extensión o tipo MIME no admitidos; rechazo de múltiples archivos (`400/INVALID_CSV`); que el nombre de archivo y el contenido del CSV **no se registran en consola** ni se reflejan en la respuesta (incluye intento de inyección HTML en el nombre); que no se usa `fs.createWriteStream`/`writeFile`/`writeFileSync` durante la carga (sin persistencia en disco); liberación del búfer tras la petición; y que un error interno inesperado responde `500/INTERNAL_ERROR` sin exponer rutas ni trazas.
- **Hallazgos:** ninguno. Los requisitos de seguridad (RNF-02: sin disco, sin logs, sin fugas de rutas) y el contrato de errores HTTP quedan verificados automáticamente.

---

## Fase 3 — Pruebas del cliente API (fetch mockeado)

Comportamiento del cliente HTTP del frontend con `fetch` simulado.

Comando: `npx vitest run tests/api-client.test.js --root .`

- [x] `tests/api-client.test.js` — cubre `frontend/src/api.js` (envío multipart, mapeo de errores, fallo de red)

### Resumen de hallazgos (Fase 3)

- **Resultado:** 1 archivo de test, **3/3 pruebas pasadas**, 0 fallos. Duración ≈2 s.
- Confirma que `uploadExchangeRates` envía `multipart/form-data` vía `fetch` a `POST /api/exchange-rates` con el archivo en el campo `file` y sin cabeceras manuales (deja que el navegador fije el `boundary`).
- Confirma que un cuerpo de error `{ error: { code, message } }` se convierte en una `ApiClientError` con `code`/`message` equivalentes.
- Confirma que un fallo de red (`fetch` rechazada) produce una `ApiClientError` con mensaje accionable en vez de propagar el error crudo.
- **Hallazgos:** ninguno.

---

## Fase 4 — Pruebas de interfaz (componentes React)

Render y comportamiento de componentes con React Testing Library + jsdom.

Comando: `npx vitest run tests/structure.test.jsx tests/file-upload.ui.test.jsx tests/upload-flow.ui.test.jsx tests/status.ui.test.jsx tests/range-selector.ui.test.jsx tests/chart.ui.test.jsx --root .`

- [x] `tests/structure.test.jsx` — cubre la estructura estática inicial de `frontend/src/App.jsx`
- [x] `tests/file-upload.ui.test.jsx` — cubre `frontend/src/file-validation.js` y el selector de archivo de `frontend/src/App.jsx`
- [x] `tests/upload-flow.ui.test.jsx` — cubre la integración de `frontend/src/api.js` con `frontend/src/App.jsx`
- [x] `tests/status.ui.test.jsx` — cubre `frontend/src/status.js` y los estados de interfaz de `frontend/src/App.jsx`
- [x] `tests/range-selector.ui.test.jsx` — cubre `frontend/src/range.js` y el selector de intervalos en `frontend/src/App.jsx`
- [x] `tests/chart.ui.test.jsx` — cubre `frontend/src/chart-options.js` y `frontend/src/ExchangeRateChart.jsx`

### Resumen de hallazgos (Fase 4)

- **Resultado:** 6 archivos de test, **37/37 pruebas pasadas**, 0 fallos. Duración ≈9 s.
- `structure.test.jsx` (3 pruebas): confirma el orden de las secciones (título → instrucciones → archivo → estado → intervalo → leyenda → gráfico), que los controles dependientes de datos están deshabilitados sin archivo, y la utilidad `getSelectedFileName`.
- `file-upload.ui.test.jsx` (5 pruebas): confirma que el input acepta un único `.csv`, rechaza extensión distinta sin red, rechaza >10 MB (vía `validateSelectedFile`), reemplaza el archivo anterior sin recargar, y que el control tiene nombre accesible y foco por teclado.
- `upload-flow.ui.test.jsx` (2 pruebas): confirma el estado de "procesando" con el input deshabilitado y una sola llamada a `uploadFile` (evita envíos duplicados), que la respuesta queda en el estado de React; y que **no se usa `localStorage`/`sessionStorage`** (`Storage.prototype.setItem` no se invoca) — verifica el requisito de no persistir el CSV ni la respuesta.
- `status.ui.test.jsx` (14 pruebas): confirma los 5 estados de interfaz (`idle`, `loading`, `error`, `success`, `partial`), el resumen de filas, el anuncio accesible (`role="alert"`/`aria-live="assertive"` en error, `aria-live="polite"` en procesamiento), que un error oculta la visualización, y que **todos** los códigos en `ERROR_MESSAGES` tienen un mensaje accionable de más de 20 caracteres.
- `range-selector.ui.test.jsx` (2 pruebas): confirma que el selector ofrece exactamente 1/2/5/10 años, que **1 año** es el valor inicial (`aria-pressed="true"`), que cambiar de intervalo filtra en memoria (conteos correctos por intervalo) y **no dispara una segunda llamada** a `uploadFile`.
- `chart.ui.test.jsx` (11 pruebas): confirma ejes (X=tipo de cambio, Y=fecha), pares `[tipoDeCambio, fecha]` en orden cronológico, integración con `echarts-for-react`, identificación/alternancia de ambas series en la leyenda, estilos de línea distintos sin recalcular datos, configuración de la cruz (`axisPointer` tipo `cross`), formato del tooltip en español (4/6 decimales), localización de la observación por fecha, y la navegación/anuncio por teclado (usa el mock de `echarts-for-react` en `tests/setup.js`, que registra las `dispatchAction` sin renderizar un gráfico real).
- **Hallazgos:** ninguno. Nota técnica: como `chart.ui.test.jsx` depende de un **mock** de `echarts-for-react` (no del motor ECharts real), esta fase valida la lógica de integración y las opciones generadas, pero no el comportamiento visual real del tooltip/cruz en un navegador — eso solo lo cubre una prueba E2E real (fuera de alcance en este plan).

---

## Fuera de alcance

| Archivo | Motivo |
| --- | --- |
| `frontend/src/main.jsx` | Bootstrap de React sin lógica propia que testear. |
| `frontend/src/styles.css` | Hoja de estilos; no aplica test unitario automatizado en este plan. |
| `tests/setup.js` | Infraestructura de pruebas (mock de `echarts-for-react`), no es un target de testing en sí mismo. |
| Pruebas E2E (Playwright), auditoría de accesibilidad/rendimiento | Fuera del alcance acordado para este plan; quedan pendientes como trabajo futuro si se requiere. |

---

## Resumen general

- **Verificación cruzada (`npm test`, suite completa):** 12 archivos de test, **94/94 pruebas pasadas**, 0 fallos, ≈9.4 s. Coincide exactamente con la suma de las 4 fases (38 + 16 + 3 + 37 = 94), confirmando que no hay interferencia entre archivos al ejecutarlos todos juntos.
- **Estado por fase:**
  - Fase 1 (unitarias puras): ✅ 38/38
  - Fase 2 (integración de API): ✅ 16/16
  - Fase 3 (cliente API): ✅ 3/3
  - Fase 4 (interfaz/componentes): ✅ 37/37
- **Hallazgos globales:** no se encontró ningún fallo, regresión ni código muerto en la suite existente. No fue necesaria ninguna corrección de código fuente ni de tests durante este plan.
- **Cobertura funcional confirmada transversalmente:** validación y limpieza del CSV (fechas, montos, duplicados), contrato de resumen (`totalRows = validRows + discardedRows`), los 7 códigos de error de la API con sus status HTTP, seguridad (sin persistencia en disco, sin logs de contenido/nombre, sin fugas de rutas en errores 500), los 5 estados de interfaz con anuncios `aria-live`, el selector de intervalos (1/2/5/10 años, límites inclusivos, sin peticiones de red adicionales) y la configuración del gráfico (ejes, series, tooltip, formato español).
- **Limitación conocida (ver Fuera de alcance):** la verificación del tooltip/cruz de ECharts en `chart.ui.test.jsx` usa un *mock* de `echarts-for-react`, por lo que valida la configuración y la lógica de integración, pero no el renderizado visual real en un navegador. Esa validación visual, junto con accesibilidad automatizada (axe), rendimiento (RNF-01) y compatibilidad entre navegadores (RNF-04), requeriría una suite E2E (p. ej. Playwright), que queda fuera del alcance acordado para este plan.
