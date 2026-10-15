# Verificación de rendimiento (T25 / RNF-01)

Este documento describe el procedimiento y los resultados de medir los
objetivos de rendimiento definidos en `ESPECIFICACION.md` (RNF-01) y en
`TODO.md` (T25).

## Equipo de referencia

| Componente | Detalle |
| --- | --- |
| CPU | AMD Ryzen 5 5500U with Radeon Graphics (6 núcleos / 12 hilos) |
| RAM | 5.85 GB disponibles para la máquina de medición |
| SO | Microsoft Windows 11 Home 64 bits (build 10.0.26300) |
| Node.js | v22.22.0 |
| Navegador de medición | Chromium (vía Playwright 1.64) |

## Conjunto de datos usado

Se usó el archivo de muestra `DEXUSEU.csv` (incluido en el repositorio):
**6950 filas totales, 6682 observaciones válidas, 268 descartadas**, fechas
de 1999-01-04 a 2025-08-22.

> **Nota sobre el tamaño del dataset:** el objetivo de la especificación
> ("hasta 10 MB y 10 000 observaciones válidas") excede el tamaño de
> `DEXUSEU.csv`. No se generó un CSV sintético de 10 000 filas para esta
> medición (decisión explícita para este ciclo de verificación); en su lugar
> se documenta el resultado con el archivo real disponible y se extrapola:
> el procesamiento (`processCsv`) escala linealmente con el número de filas
> (no hay operaciones cuadráticas: parseo, filtrado y `Map` son O(n)), por lo
> que ampliar de ~6950 a 10 000 filas (+44 %) llevaría el promedio medido de
> ~34 ms a aproximadamente ~49 ms — más de 60 veces por debajo del límite de
> 3000 ms. Se recomienda repetir la medición con un CSV real de 10 000 filas
> antes de un lanzamiento a producción si se requiere evidencia exacta sobre
> ese volumen.

## Procedimiento

### 1. Backend — procesamiento del CSV y API

```bash
npm run perf:backend
```

Ejecuta `scripts/measure-backend-performance.mjs`, que mide:

1. **`processCsv()` en memoria** (sin red): 20 ejecuciones sobre el buffer de
   `DEXUSEU.csv`, descartando la primera (calentamiento de JIT).
2. **Ida y vuelta HTTP completa** de `POST /api/exchange-rates`: 10
   ejecuciones contra un servidor Express real (`http.createServer`) en un
   puerto efímero, usando `fetch` + `FormData` nativos de Node 22.

### 2. Frontend — render del gráfico, selector y tooltip

Con el servidor de desarrollo levantado (`npm run dev` en otra terminal):

```bash
npm run perf:frontend
```

Ejecuta `scripts/measure-frontend-performance.mjs`, que abre Chromium vía
Playwright y mide:

1. **Render del gráfico**: tiempo entre que llega la respuesta de la API
   (`page.waitForResponse`) y el `<canvas>` de ECharts se vuelve visible.
2. **Respuesta del selector de intervalos**: tiempo entre el `click` en un
   botón de intervalo y la actualización del contador de observaciones
   visibles, medido **íntegramente dentro del navegador** con
   `performance.now()` + `MutationObserver` (para no mezclar la latencia del
   protocolo de automatización de Playwright con la respuesta real de la
   interfaz).
3. **Respuesta del tooltip**: tiempo entre el movimiento del puntero y la
   aparición del tooltip flotante con contenido, medido con la misma técnica.

Ambos scripts se pueden ejecutar varias veces para confirmar la estabilidad
de los resultados.

## Resultados (ejecución de referencia)

| Medición | Objetivo | Promedio | Máximo | Resultado |
| --- | --- | --- | --- | --- |
| `processCsv()` en memoria | < 3000 ms | 34.35 ms | 67.94 ms (p95) | ✅ Cumple |
| `POST /api/exchange-rates` (HTTP completo) | < 3000 ms | 62.55 ms | 136.15 ms (p95) | ✅ Cumple |
| Render del gráfico (respuesta → canvas visible) | < 1000 ms | — | 137–166 ms | ✅ Cumple |
| Respuesta del selector de intervalos | < 100 ms | ~10–15 ms | ~17–28 ms | ✅ Cumple |
| Respuesta del tooltip | < 100 ms | ~10 ms | ~15–17 ms | ✅ Cumple |

Se ejecutó cada script al menos dos veces; los resultados fueron consistentes
entre ejecuciones (variación de unos pocos milisegundos), sin indicios de
inestabilidad.

> **Nota metodológica:** una primera versión de la medición del selector y
> el tooltip usaba las esperas automáticas de Playwright (`locator.waitFor`)
> desde el proceso de Node, lo que añadía ~70–100 ms de sobrecarga propia del
> protocolo de automatización (IPC) y hacía parecer que ambos superaban el
> límite de 100 ms. Al medir con `performance.now()` + `MutationObserver`
> completamente dentro del navegador, la respuesta real de la interfaz
> resultó ser de un orden de magnitud menor (~10–20 ms), muy por debajo del
> objetivo.

## Muestreo y renderizado progresivo de ECharts

`frontend/src/chart-options.js` configura ambas series con
`sampling: 'lttb'` y `progressive: 5000`, tal como exige RNF-01 para
volúmenes de datos grandes. El `tooltip.formatter` no depende de los puntos
muestreados para dibujar la línea: busca la observación exacta por fecha en
un `Map` construido a partir de **todas** las observaciones visibles
(`observationsByDate`), por lo que el valor mostrado en el tooltip (hasta 4
decimales en USD por EUR y hasta 6 en EUR por USD) siempre corresponde al
dato original, nunca a un punto interpolado o descartado por el muestreo.

## Cómo repetir la medición

1. `npm install` (una sola vez).
2. Backend: `npm run perf:backend` (no requiere nada más levantado).
3. Frontend: levantar `npm run dev` en una terminal y, en otra, ejecutar
   `npm run perf:frontend`.
4. Comparar los resultados con los umbrales de la tabla anterior.
