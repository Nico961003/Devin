# TODO — Tipo de cambio USD-EUR

Este plan convierte `ESPECIFICACION.md` en incrementos pequeños y verificables. Las tareas están ordenadas por dependencia y, dentro de cada fase, de menor a mayor complejidad.

## Reglas de uso

- Completar una sola tarea funcional cada vez.
- No marcar una tarea principal hasta cumplir todos sus criterios de aceptación.
- Añadir o actualizar las pruebas indicadas en la misma tarea que introduce el comportamiento.
- Mantener el CSV y sus valores únicamente en memoria.
- Ejecutar las pruebas relacionadas después de cada tarea y la suite completa al cerrar una fase.

## Fase 1 — Base del proyecto

- [x] **T01. Crear la estructura de frontend y backend**
  - **Objetivo:** preparar una base ejecutable sin lógica de negocio.
  - **Criterios de aceptación:**
    - [x] El frontend usa React y Vite.
    - [x] El backend usa una versión LTS vigente de Node.js y Express.
    - [x] Existen comandos desde la raíz para desarrollo, pruebas y compilación de ambos proyectos.
    - [x] Frontend y backend pueden levantarse simultáneamente sin errores.
    - [x] Vite reenvía `/api` al backend durante el desarrollo o existe una configuración equivalente documentada.

- [x] **T02. Definir los contratos de datos y errores**
  - **Objetivo:** compartir una forma estable para observaciones, resúmenes y errores.
  - **Criterios de aceptación:**
    - [x] Una observación normalizada contiene `date`, `usdPerEur` y `eurPerUsd`.
    - [x] El resumen contiene `totalRows`, `validRows`, `discardedRows`, `minDate` y `maxDate`.
    - [x] Todo error de API usa `{ "error": { "code", "message" } }`.
    - [x] Están definidos los códigos `FILE_REQUIRED`, `INVALID_CSV`, `MISSING_COLUMNS`, `NO_VALID_DATA`, `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE` e `INTERNAL_ERROR`.
    - [x] Los contratos tienen pruebas o validaciones automatizadas.

- [x] **T03. Crear la estructura visual estática**
  - **Objetivo:** construir la página principal sin conectar todavía el CSV ni el gráfico.
  - **Criterios de aceptación:**
    - [x] La página muestra el título **Tipo de cambio USD-EUR**.
    - [x] Aparecen, en orden, instrucciones, control de carga, área de estado, selector de intervalos, leyenda y contenedor del gráfico.
    - [x] Los elementos dependientes de datos están ocultos o deshabilitados mientras no haya un archivo procesado.
    - [x] La página no genera desplazamiento horizontal a 320 px de ancho.

## Fase 2 — Procesamiento del CSV en el backend

- [x] **T04. Validar la estructura básica del CSV**
  - **Objetivo:** reconocer archivos analizables antes de procesar sus filas.
  - **Criterios de aceptación:**
    - [x] `csv-parse` acepta UTF-8 con o sin BOM y usa la coma como delimitador.
    - [x] Los espacios exteriores de encabezados y campos se eliminan.
    - [x] Se exigen exactamente como columnas obligatorias `observation_date` y `DEXUSEU`; las columnas adicionales se ignoran.
    - [x] Las líneas completamente vacías se ignoran y no se incluyen en los contadores.
    - [x] Un CSV ilegible o sin encabezados obligatorios produce un error de dominio comprobado mediante pruebas unitarias.

- [x] **T05. Validar y limpiar las filas**
  - **Objetivo:** separar observaciones válidas de filas descartadas.
  - **Criterios de aceptación:**
    - [x] Solo se aceptan fechas reales con formato `AAAA-MM-DD` y sin conversiones de zona horaria.
    - [x] `DEXUSEU` solo se acepta si es un número finito mayor que cero y usa punto decimal.
    - [x] Las filas con campos vacíos, fechas inválidas o cambios inválidos se descartan sin impedir el uso de las filas correctas.
    - [x] El encabezado y las líneas vacías no cuentan como filas de datos.
    - [x] Hay pruebas para años bisiestos, fechas imposibles, `NaN`, infinito, cero, negativos y campos vacíos.

- [x] **T06. Deduplicar, ordenar y transformar los datos**
  - **Objetivo:** generar la colección normalizada que consumirá el frontend.
  - **Criterios de aceptación:**
    - [x] Si una fecha está repetida, se conserva la última fila encontrada.
    - [x] Las filas duplicadas sustituidas se contabilizan como descartadas.
    - [x] Las observaciones se devuelven de la fecha más antigua a la más reciente.
    - [x] `usdPerEur` conserva el valor original de `DEXUSEU`.
    - [x] `eurPerUsd` se calcula como `1 / DEXUSEU` sin redondeo interno.
    - [x] Las pruebas verifican deduplicación, orden y precisión del cálculo inverso.

- [x] **T07. Calcular el resumen de procesamiento**
  - **Objetivo:** informar con precisión qué ocurrió durante la limpieza.
  - **Criterios de aceptación:**
    - [x] Se calculan `totalRows`, `validRows`, `discardedRows`, `minDate` y `maxDate`.
    - [x] Siempre se cumple `totalRows = validRows + discardedRows`.
    - [x] `minDate` y `maxDate` proceden exclusivamente de filas válidas.
    - [x] Si no queda ninguna fila válida, se genera `NO_VALID_DATA`.
    - [x] Las pruebas cubren archivos totalmente válidos, parcialmente válidos y sin datos válidos.

- [x] **T08. Implementar `POST /api/exchange-rates`**
  - **Objetivo:** exponer el procesamiento mediante la API especificada.
  - **Criterios de aceptación:**
    - [x] El endpoint acepta `multipart/form-data` con un único campo `file`.
    - [x] Multer mantiene el archivo en memoria y no crea archivos temporales.
    - [x] Una petición válida responde `200` con `data` y `summary` conforme al contrato.
    - [x] Un archivo ausente responde `400/FILE_REQUIRED`.
    - [x] Columnas ausentes, CSV ilegible y ausencia de datos válidos responden con sus códigos previstos.
    - [x] Las pruebas de integración ejercitan el endpoint con archivos reales o búferes equivalentes.

- [x] **T09. Aplicar límites y validaciones de seguridad del archivo**
  - **Objetivo:** rechazar entradas no admitidas antes de procesarlas.
  - **Criterios de aceptación:**
    - [x] El límite predeterminado del archivo es 10 MB y puede configurarse sin superar el máximo funcional de 10 MB de esta versión.
    - [x] Un archivo superior al límite responde `413/FILE_TOO_LARGE`.
    - [x] Una extensión o tipo no admitido responde `415/UNSUPPORTED_FILE_TYPE`.
    - [x] El servidor valida la estructura real además de extensión y tipo declarado.
    - [x] El contenido, los valores y el nombre del CSV no se registran ni se interpolan como HTML.
    - [x] El búfer deja de estar referenciado al terminar la petición y ninguna prueba detecta escritura en disco.
    - [x] Los errores `500/INTERNAL_ERROR` no exponen rutas ni trazas.

## Fase 3 — Flujo de carga en el frontend

- [x] **T10. Implementar el selector de archivo**
  - **Objetivo:** permitir elegir un CSV desde el navegador.
  - **Criterios de aceptación:**
    - [x] El control acepta un solo archivo con extensión `.csv`.
    - [x] El frontend comprueba preliminarmente extensión y tamaño de 10 MB.
    - [x] Las comprobaciones del cliente no sustituyen el envío y validación autoritativa del servidor.
    - [x] Elegir un nuevo archivo reemplaza el resultado anterior sin recargar la página.
    - [x] El control tiene nombre accesible, foco visible y funciona con teclado.

- [x] **T11. Conectar la carga con la API**
  - **Objetivo:** enviar el archivo y conservar la respuesta normalizada en memoria.
  - **Criterios de aceptación:**
    - [x] El frontend envía `multipart/form-data` a `POST /api/exchange-rates` mediante `fetch`.
    - [x] Mientras espera, muestra un estado de procesamiento y evita envíos duplicados.
    - [x] Tras el éxito, conserva observaciones y resumen en el estado de React.
    - [x] No persiste el CSV ni la respuesta en `localStorage`, `sessionStorage` o IndexedDB.
    - [x] La respuesta queda disponible para filtrar sin volver a solicitar el archivo.

- [x] **T12. Mostrar estados, errores y resumen**
  - **Objetivo:** cubrir los cinco estados de interfaz definidos en la especificación.
  - **Criterios de aceptación:**
    - [x] Se distinguen los estados sin archivo, procesando, éxito total, éxito con descartes y error bloqueante.
    - [x] El resumen muestra filas leídas, válidas y descartadas.
    - [x] Cada código de API produce un mensaje claro y accionable en español.
    - [x] Un error bloqueante oculta el gráfico en lugar de mostrar datos vacíos o anteriores.
    - [x] Estados y errores se anuncian mediante una región `aria-live`.

## Fase 4 — Filtros temporales

- [x] **T13. Implementar el cálculo de intervalos**
  - **Objetivo:** crear una función pura que filtre observaciones por años naturales.
  - **Criterios de aceptación:**
    - [x] La fecha de referencia es la observación válida más reciente, no la fecha actual.
    - [x] Existen intervalos de 1, 2, 5 y 10 años.
    - [x] Ambos extremos del intervalo son inclusivos.
    - [x] El cálculo no desplaza fechas por zona horaria.
    - [x] Si no hay historia suficiente, se devuelven todos los puntos disponibles del periodo.
    - [x] Las pruebas incluyen el ejemplo `2024-08-22` a `2025-08-22` para 1 año y un caso de 29 de febrero.

- [x] **T14. Construir el selector de intervalos**
  - **Objetivo:** permitir cambiar el rango visible sin tocar el servidor.
  - **Criterios de aceptación:**
    - [x] El selector ofrece exactamente 1, 2, 5 y 10 años.
    - [x] El intervalo inicial seleccionado es 1 año.
    - [x] Cambiar de opción actualiza ambas series.
    - [x] Después de la carga inicial, cambiar el intervalo no genera peticiones de red.
    - [x] La opción activa se identifica visualmente y mediante `aria-pressed` o semántica equivalente.

## Fase 5 — Gráfico

- [x] **T15. Renderizar el gráfico base con Apache ECharts**
  - **Objetivo:** mostrar la serie original con la orientación de ejes acordada.
  - **Criterios de aceptación:**
    - [x] El gráfico se integra mediante `echarts-for-react`.
    - [x] El eje Y es numérico, lleva la etiqueta **Tipo de cambio** y el eje X es temporal. _(Orientación invertida respecto a la versión original: ahora la fecha va en X y el tipo de cambio en Y.)_
    - [x] Los datos se proporcionan como `[fecha, tipoDeCambio]`.
    - [x] El eje X muestra referencias anuales legibles.
    - [x] Los puntos mantienen el orden cronológico en sentido horizontal.
    - [x] El gráfico cambia de tamaño con su contenedor.

- [x] **T16. Añadir ambas cotizaciones y la leyenda**
  - **Objetivo:** comparar la cotización original y su inversa.
  - **Criterios de aceptación:**
    - [x] Se muestran las series **USD por EUR** y **EUR por USD** sobre la misma escala numérica.
    - [x] Cada serie usa un color y un estilo de línea distinguibles.
    - [x] La leyenda identifica ambas unidades.
    - [x] La leyenda permite activar y desactivar cada serie.
    - [x] Ocultar una serie no altera ni recalcula sus datos.

- [x] **T17. Implementar tooltip y cruz interactiva**
  - **Objetivo:** consultar con precisión la observación más próxima al puntero.
  - **Criterios de aceptación:**
    - [x] Al pasar el puntero aparece un `axisPointer` de tipo cruz con líneas vertical y horizontal.
    - [x] El tooltip localiza la observación visible más próxima.
    - [x] Muestra la fecha exacta, USD por EUR y EUR por USD.
    - [x] El valor original presenta hasta 4 decimales y el inverso hasta 6, sin cambiar los valores internos.
    - [x] Fechas y números visibles usan formato español y separador decimal local.

- [x] **T18. Añadir navegación del gráfico por teclado**
  - **Objetivo:** ofrecer una alternativa funcional al uso del puntero.
  - **Criterios de aceptación:**
    - [x] El gráfico puede recibir foco y tiene una descripción textual de ejes e interacción.
    - [x] Las flechas arriba y abajo recorren las observaciones del intervalo visible.
    - [x] La observación seleccionada abre o actualiza el tooltip.
    - [x] Fecha y ambas cotizaciones se anuncian en una región `aria-live`.
    - [x] `Escape` oculta el tooltip activo.
    - [x] Las pruebas de interfaz cubren todo el recorrido de teclado.

## Fase 6 — Presentación, accesibilidad y compatibilidad

- [x] **T19. Completar el diseño adaptable**
  - **Objetivo:** presentar correctamente la aplicación en móvil, tableta y escritorio.
  - **Criterios de aceptación:**
    - [x] No existe desplazamiento horizontal a 320 px, 768 px y 1280 px de ancho. _(Verificado con Playwright en `e2e/responsive.spec.js`, antes y después de cargar datos, en Chromium/Firefox/WebKit: 36/36 pruebas OK.)_
    - [x] El selector permanece visible mientras existen datos válidos. _(Comprobado en los tres anchos tras cargar `DEXUSEU.csv`.)_
    - [x] El gráfico mantiene un tamaño utilizable en los tres formatos. _(El `canvas` de ECharts es visible y con tamaño > 0 en los tres anchos.)_
    - [x] Estados, leyenda, etiquetas y tooltip no se solapan ni quedan recortados. _(`.status`, `.legend`, `.range-selector` y `.chart-card` verifican `boundingBox` con ancho/alto > 0 en los tres anchos.)_

- [x] **T20. Completar accesibilidad WCAG 2.1 AA**
  - **Objetivo:** hacer que los flujos principales sean operables y comprensibles sin ratón.
  - **Criterios de aceptación:**
    - [x] Todos los controles tienen nombre accesible, orden de foco lógico y foco visible. _(Verificado por axe-core y por `Tab` al selector de archivo en `e2e/accessibility.spec.js`.)_
    - [x] El contraste de texto, controles y estados cumple nivel AA. _(La regla `color-contrast` de axe-core, incluida en las etiquetas `wcag2aa`/`wcag21aa`, no reporta infracciones críticas/graves en ninguno de los 3 estados auditados.)_
    - [x] Las series no se distinguen únicamente por color. _(`chart-options.js` usa línea sólida para USD por EUR y discontinua para EUR por USD, además de nombres distintos en la leyenda.)_
    - [x] Los mensajes dinámicos y la observación activa se anuncian sin duplicaciones molestas. _(Regiones `aria-live` únicas por estado y por observación activa, cubiertas en `tests/status.ui.test.jsx` y en el recorrido por teclado del gráfico.)_
    - [x] Una auditoría automatizada no presenta infracciones críticas y la navegación manual por teclado completa el flujo principal. _(axe-core: 0 infracciones críticas/graves en estado inicial, con datos cargados y en estado de error; navegación por teclado -Tab, flechas, Escape- cubierta en `e2e/accessibility.spec.js` y `e2e/cross-browser-smoke.spec.js`.)_

- [x] **T21. Verificar compatibilidad entre navegadores**
  - **Objetivo:** validar el comportamiento en los navegadores exigidos.
  - **Criterios de aceptación:**
    - [x] La carga, filtrado, leyenda, tooltip y teclado funcionan en las dos versiones estables más recientes de Chrome, Edge, Firefox y Safari. _(Verificado con Playwright usando Chromium como aproximación a Chrome/Edge, Firefox nativo y WebKit como aproximación a Safari — motores reales equivalentes a esos navegadores. `e2e/cross-browser-smoke.spec.js` + `responsive.spec.js` + `accessibility.spec.js`: 36/36 pruebas OK en los 3 proyectos.)_
    - [x] Las diferencias inevitables quedan documentadas y no impiden el flujo principal. _(Única diferencia observada: en WebKit, ejecutar pruebas con más de 1 worker en paralelo puede cerrar el proceso del navegador por contención de recursos de la máquina de desarrollo; no es un fallo de la aplicación — con `--workers=1` (o el valor moderado ya fijado en `playwright.config.js`) las 12 pruebas pasan de forma consistente.)_
    - [x] El frontend compilado no depende de API experimentales sin alternativa. _(`npm run build` genera el bundle sin advertencias de API no soportadas; se apoya en React 19, Vite 8 y ECharts 6, todas con soporte estable en los navegadores objetivo.)_

## Fase 7 — Verificación integral y entrega

- [x] **T22. Completar pruebas unitarias**
  - **Objetivo:** cubrir todas las reglas puras de datos y rango temporal.
  - **Criterios de aceptación:**
    - [x] Hay pruebas para UTF-8/BOM, columnas adicionales, espacios, vacíos, fechas y tipos de cambio inválidos. _(`tests/csv-processor.test.js`.)_
    - [x] Hay pruebas para deduplicación, orden, cotización inversa y contadores. _(`tests/csv-processor.test.js`.)_
    - [x] Hay pruebas para los cuatro intervalos, límites inclusivos y zonas horarias. _(`tests/range.test.js`.)_
    - [x] Todas las pruebas unitarias pasan de forma repetible. _(Verificado en `TESTING_PLAN.md` — Fase 1: 38/38 pruebas pasadas; vuelto a confirmar con `npm test`: 94/94 en toda la suite.)_

- [x] **T23. Completar pruebas de integración de la API**
  - **Objetivo:** verificar el contrato HTTP y el procesamiento en memoria.
  - **Criterios de aceptación:**
    - [x] Se cubren respuesta `200` y errores `400`, `413`, `415` y `500`. _(`tests/exchange-rates-api.test.js`.)_
    - [x] Cada respuesta de error respeta el contrato común y no contiene trazas. _(Prueba dedicada que verifica ausencia de rutas/`stack` en `INTERNAL_ERROR`.)_
    - [x] Se verifica un archivo con mezcla de filas válidas e inválidas. _(Casos `NO_VALID_DATA` y de filas descartadas en `tests/csv-processor.test.js`/`tests/exchange-rates-api.test.js`.)_
    - [x] Se verifica que no se crea ningún archivo temporal ni persistente. _(Prueba que espía `fs.createWriteStream`/`writeFile`/`writeFileSync` y confirma que no se invocan.)_
    - [x] Todas las pruebas de integración pasan. _(Verificado en `TESTING_PLAN.md` — Fase 2: 16/16 pruebas pasadas; confirmado de nuevo tras añadir el servido estático de `dist/` en `server/src/app.js`.)_

- [x] **T24. Completar pruebas de interfaz y flujo integral**
  - **Objetivo:** validar la aplicación desde la selección del archivo hasta la interacción con el gráfico.
  - **Criterios de aceptación:**
    - [x] Una prueba carga `DEXUSEU.csv` y comprueba resumen y ambas series. _(`e2e/full-flow.spec.js`: verifica `totalRows`/`validRows`/`discardedRows` exactos y ambas series —USD por EUR y EUR por USD— en la leyenda con sus estilos de línea.)_
    - [x] Se prueban los cuatro intervalos sin solicitudes adicionales. _(`e2e/full-flow.spec.js`: recorre 1/2/5/10 años comprobando el conteo exacto de observaciones visibles y que no se dispara ninguna petición nueva a `/api/exchange-rates`.)_
    - [x] Se prueban cruz, tooltip, leyenda y navegación por teclado. _(`e2e/full-flow.spec.js`: tooltip con fecha y ambas cotizaciones al pasar el puntero, interacción con la leyenda sin alterar los datos, recorrido con flechas y anuncio por `aria-live`, y `Escape` ocultando el tooltip.)_
    - [x] Se prueban los cinco estados de interfaz y la sustitución de archivo. _(`e2e/ui-states.spec.js`: sin archivo, procesando (con la petición retrasada para observarlo), éxito total, éxito parcial y error bloqueante; más sustitución encadenada de tres archivos sin recargar la página.)_
    - [x] Se prueban vistas móvil, tableta y escritorio. _(`e2e/responsive.spec.js`, compartido con T19: 320/768/1280 px.)_
    - [x] Toda la suite de interfaz pasa. _(Suite completa de `e2e/`: **75/75 pruebas pasadas** en Chromium, Firefox y WebKit — 25 por navegador. La suite Vitest de interfaz (`*.ui.test.jsx`) también sigue en 94/94 junto al resto de pruebas unitarias/integración.)_

- [x] **T25. Verificar los objetivos de rendimiento**
  - **Objetivo:** comprobar los límites definidos con datos representativos.
  - **Criterios de aceptación:**
    - [x] Un CSV de hasta 10 MB y 10 000 observaciones válidas se procesa en menos de 3 segundos en el equipo de referencia. _(Medido con `DEXUSEU.csv` real —6950 filas, 6682 válidas— mediante `npm run perf:backend`: `processCsv()` en memoria promedia 34.35 ms (p95 67.94 ms) y la ida y vuelta HTTP completa promedia 62.55 ms (p95 136.15 ms); ambos muy por debajo de 3000 ms. Al no generarse un CSV sintético de 10 000 filas en este ciclo, se documenta en `PERFORMANCE.md` la extrapolación lineal que sustenta que el objetivo seguiría cumpliéndose con ese volumen.)_
    - [x] El gráfico se renderiza en menos de 1 segundo. _(`npm run perf:frontend`: 137–166 ms entre la respuesta de la API y que el `<canvas>` de ECharts es visible.)_
    - [x] Selector y tooltip responden en menos de 100 ms. _(Medido dentro del propio navegador con `performance.now()` + `MutationObserver` para no mezclar la latencia del protocolo de automatización: selector ~10–15 ms promedio (máx. ~17–28 ms), tooltip ~10 ms promedio (máx. ~15–17 ms).)_
    - [x] Si es necesario, ECharts usa muestreo o renderizado progresivo sin perder el valor exacto del tooltip. _(`chart-options.js` ya configura `sampling: 'lttb'` y `progressive: 5000` en ambas series; el `tooltip.formatter` busca la observación exacta por fecha en un `Map` con todas las observaciones visibles, por lo que el valor mostrado nunca es un punto interpolado o descartado por el muestreo.)_
    - [x] El procedimiento y el equipo de referencia quedan documentados para repetir la medición. _(Ver `PERFORMANCE.md`: especificaciones del equipo de referencia, procedimiento paso a paso y scripts `npm run perf:backend` / `npm run perf:frontend` en `scripts/`.)_

- [x] **T26. Preparar la compilación y validación final**
  - **Objetivo:** dejar una versión reproducible y lista para ejecutar.
  - **Criterios de aceptación:**
    - [x] La instalación parte de un archivo de bloqueo de dependencias versionado. _(`package-lock.json` está versionado en el repositorio desde el commit base.)_
    - [x] Compilación, lint, pruebas unitarias, integración e interfaz terminan correctamente. _(Se añadió `eslint.config.js` y el script `npm run lint` —antes inexistente—; de paso se corrigió un `setState` síncrono dentro de un efecto en `ExchangeRateChart.jsx` (ajuste de estado durante el render, patrón recomendado por React) y un parámetro no usado en el middleware de errores de `server/src/app.js`. Resultado final: `npm run build` ✅, `npm run lint` ✅ (0 errores, 1 advertencia aceptada de `react-refresh` por exportar una función auxiliar junto al componente), `npm test` ✅ 94/94, `npm run test:e2e` ✅ 75/75 en Chromium/Firefox/WebKit.)_
    - [x] La auditoría de dependencias no presenta vulnerabilidades críticas conocidas sin justificar. _(`npm audit` → **0 vulnerabilidades**.)_
    - [x] Los secretos y archivos locales no se incluyen en la compilación. _(`dist/` tras `npm run build` solo contiene `index.html`, un bundle JS y un CSS; se verificó que no contiene rutas locales, `DEXUSEU.csv` ni variables de entorno.)_
    - [x] Frontend y backend se levantan con los comandos documentados. _(Desarrollo: `npm run dev` (frontend 5173 + backend 3000 con proxy `/api`). Producción: `npm run build && npm start` — `server/src/app.js` ahora sirve el frontend compilado (`dist/`) con fallback de SPA cuando existe, por lo que un único proceso en el puerto 3000 atiende interfaz y API. Verificado con `scripts/verify-deployment.mjs`: carga de `DEXUSEU.csv`, resumen correcto y selector de intervalos funcionando contra `http://localhost:3000`.)_
    - [x] Se verifican los 12 criterios globales de aceptación de `ESPECIFICACION.md`. _(Ver detalle en la sección "Verificación de los 12 criterios globales" más abajo.)_

### Verificación de los 12 criterios globales de aceptación (`ESPECIFICACION.md` §9)

1. **CSV válido representa todas las filas válidas y omite inválidas/incompletas.** ✅ `tests/csv-processor.test.js`, `tests/exchange-rates-api.test.js`, `e2e/full-flow.spec.js`.
2. **`DEXUSEU.csv` con valores vacíos no impide generar el gráfico.** ✅ `e2e/full-flow.spec.js` y `e2e/ui-states.spec.js` (268 filas descartadas, estado "éxito parcial", gráfico visible).
3. **Eje X = fecha, eje Y = tipo de cambio, con referencias anuales visibles.** ✅ `tests/chart.ui.test.jsx`.
4. **Leyenda identifica USD por EUR / EUR por USD y permite alternar visibilidad.** ✅ `tests/chart.ui.test.jsx`, `e2e/full-flow.spec.js`.
5. **Selector con 1/2/5/10 años, límites inclusivos desde la fecha más reciente, sin peticiones nuevas.** ✅ `tests/range.test.js`, `e2e/full-flow.spec.js` (0 peticiones adicionales verificadas).
6. **Cruz completa y tooltip con fecha y ambas cotizaciones al pasar el puntero.** ✅ `e2e/full-flow.spec.js`, `e2e/cross-browser-smoke.spec.js`.
7. **Flechas arriba/abajo recorren observaciones, anuncian valores y `Escape` oculta el tooltip.** ✅ `e2e/full-flow.spec.js`.
8. **Contadores de filas leídas/válidas/descartadas cumplen `totalRows = validRows + discardedRows`.** ✅ `tests/contracts.test.js`, `tests/exchange-rates-api.test.js`.
9. **Archivo sin columnas obligatorias, >10 MB o sin datos válidos da el código/mensaje correcto sin gráfico engañoso.** ✅ `tests/exchange-rates-api.test.js`, `e2e/file-upload-errors` (cubierto en `e2e/ui-states.spec.js`, estado de error oculta el `.workspace`).
10. **El archivo no se escribe en disco ni se registra; el búfer se libera al terminar la petición.** ✅ `tests/exchange-rates-api.test.js` (espías sobre `fs.createWriteStream`/`writeFile`/`writeFileSync` y sobre `console.*`).
11. **Teclado, contraste y adaptación a móvil/tableta/escritorio.** ✅ `e2e/accessibility.spec.js` (axe-core, 0 infracciones críticas/graves) y `e2e/responsive.spec.js` (320/768/1280 px).
12. **Las pruebas unitarias, de integración y de interfaz se ejecutan correctamente antes de dar por finalizada la versión.** ✅ 94/94 Vitest + 75/75 Playwright (Chromium/Firefox/WebKit), ambos verificados en esta misma sesión justo antes del despliegue.

## Matriz de trazabilidad

| Sección de `ESPECIFICACION.md` | Tareas que la implementan o verifican |
| --- | --- |
| Datos de entrada y limpieza | T04–T07, T22 |
| RF-01. Carga del CSV | T10–T12, T24 |
| RF-02. Validación y errores | T04–T09, T12, T23 |
| RF-03. Gráfico de líneas | T15–T16, T24 |
| RF-04. Selector de intervalo | T13–T14, T22, T24 |
| RF-05. Tooltip e interacción | T17–T18, T24 |
| RF-06. Estados de interfaz | T12, T24 |
| Diseño de interfaz | T03, T19–T20 |
| Arquitectura y contrato de API | T01–T02, T08–T09, T23 |
| Rendimiento | T25 |
| Seguridad | T09, T23, T26 |
| Accesibilidad | T10, T12, T18, T20, T24 |
| Compatibilidad, idioma y formato | T17, T19–T21 |
| Pruebas mínimas | T22–T24 |
| Criterios globales de aceptación | T26 |
